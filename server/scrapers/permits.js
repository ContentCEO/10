'use strict';

const db = require('../db');

// Towns within ~20 miles of Concord, MA. Each uses Accela Citizen Access or a
// municipal portal — no clean anonymous API, so we expose deep-link URLs that
// open the search UI pre-filtered. Users manually export from the portal and
// POST the CSV/JSON to /api/permits/import.
const ACCELA_QUICK_LINKS = [
  { town: 'Concord, MA',   url: 'https://aca-prod.accela.com/CONCORD/Cap/CapHome.aspx?module=Building&TabName=Home' },
  { town: 'Acton, MA',     url: 'https://permitsearch.acton-ma.gov/' },
  { town: 'Lincoln, MA',   url: 'https://www.lincolntown.org/270/Building' },
  { town: 'Carlisle, MA',  url: 'https://www.carlislema.gov/building-department' },
  { town: 'Bedford, MA',   url: 'https://www.bedfordma.gov/inspectional-services' },
  { town: 'Sudbury, MA',   url: 'https://sudbury.ma.us/buildingdepartment/' },
  { town: 'Lexington, MA', url: 'https://www.lexingtonma.gov/186/Building-and-Construction' },
  { town: 'Maynard, MA',   url: 'https://www.townofmaynard-ma.gov/government/departments/building-department/' },
  { town: 'Stow, MA',      url: 'https://www.stow-ma.gov/building-department' },
  { town: 'Wayland, MA',   url: 'https://www.wayland.ma.us/building-department' },
  { town: 'Weston, MA',    url: 'https://www.weston.org/174/Building-Department' },
];

function parseCsv(text) {
  // Small, purposeful CSV parser: handles quoted fields and embedded commas.
  const rows = [];
  let row = [];
  let cur = '';
  let inQuote = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuote) {
      if (c === '"' && text[i + 1] === '"') { cur += '"'; i++; }
      else if (c === '"') { inQuote = false; }
      else { cur += c; }
    } else {
      if (c === '"') inQuote = true;
      else if (c === ',') { row.push(cur); cur = ''; }
      else if (c === '\r') { /* skip */ }
      else if (c === '\n') { row.push(cur); rows.push(row); row = []; cur = ''; }
      else { cur += c; }
    }
  }
  if (cur.length || row.length) { row.push(cur); rows.push(row); }
  return rows.filter((r) => r.some((v) => v.length));
}

function pick(obj, candidates) {
  for (const key of candidates) {
    for (const k of Object.keys(obj)) {
      if (k.toLowerCase() === key.toLowerCase()) {
        const v = obj[k];
        if (v != null && String(v).trim() !== '') return String(v).trim();
      }
    }
  }
  return '';
}

function rowsToRecords(rows) {
  if (rows.length < 2) return [];
  const headers = rows[0].map((h) => String(h).trim());
  return rows.slice(1).map((r) => {
    const obj = {};
    headers.forEach((h, i) => { obj[h] = r[i]; });
    return obj;
  });
}

function normalizePermit(rec) {
  return {
    permitNumber: pick(rec, ['permit number', 'permit_number', 'permit #', 'permit', 'record number', 'record #', 'number']),
    date: pick(rec, ['date', 'issue date', 'issued', 'application date', 'filed', 'created']),
    address: pick(rec, ['address', 'site address', 'location', 'property address']),
    description: pick(rec, ['description', 'work description', 'scope', 'project', 'subtype', 'type']),
    ownerName: pick(rec, ['owner', 'owner name', 'applicant', 'applicant name', 'contact', 'name']),
    ownerPhone: pick(rec, ['phone', 'owner phone', 'contact phone', 'telephone']),
    value: pick(rec, ['value', 'valuation', 'job value', 'estimated cost']),
  };
}

function importPermits(records, town = 'unknown') {
  let newCount = 0;
  for (const rec of records) {
    const p = normalizePermit(rec);
    if (!p.address && !p.permitNumber) continue;
    const link = `permit://${town}/${encodeURIComponent(p.permitNumber || p.address)}/${encodeURIComponent(p.date || '')}`;
    if (db.linkExists(link)) continue;
    const title = `${p.description || 'Building permit'} — ${p.address || '(no address)'}`;
    const summary = [
      p.ownerName ? `Owner: ${p.ownerName}` : '',
      p.date ? `Date: ${p.date}` : '',
      p.value ? `Value: $${p.value}` : '',
      p.permitNumber ? `Permit: ${p.permitNumber}` : '',
    ].filter(Boolean).join(' · ');
    const inserted = db.insertFinding({
      source: `permits/${town}`,
      title,
      link,
      summary,
      phone: p.ownerPhone || '',
      address: p.address || '',
      pubDate: p.date ? new Date(p.date).toISOString() : new Date().toISOString(),
      foundAt: new Date().toISOString(),
      raw: rec,
    });
    if (inserted) newCount += 1;
  }
  return newCount;
}

function ingest({ town, format, payload }) {
  const runId = db.startScanRun(`permits/${town || 'manual'}`);
  let newCount = 0;
  let errorMsg = null;
  try {
    let records = [];
    if (format === 'csv') {
      const rows = parseCsv(payload);
      records = rowsToRecords(rows);
    } else if (format === 'json') {
      const parsed = typeof payload === 'string' ? JSON.parse(payload) : payload;
      if (Array.isArray(parsed)) records = parsed;
      else if (parsed && Array.isArray(parsed.records)) records = parsed.records;
      else throw new Error('JSON must be an array or {records: [...]}');
    } else {
      throw new Error('format must be csv or json');
    }
    newCount = importPermits(records, town || 'manual');
  } catch (e) {
    errorMsg = e.message;
  }
  db.finishScanRun(runId, newCount, errorMsg);
  return { newCount, error: errorMsg };
}

module.exports = { ingest, ACCELA_QUICK_LINKS };
