'use strict';

const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, '..', 'data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
const DB_PATH = path.join(DATA_DIR, 'app.db');

const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS findings (
    id TEXT PRIMARY KEY,
    source TEXT NOT NULL,
    title TEXT,
    link TEXT UNIQUE,
    summary TEXT,
    phone TEXT,
    address TEXT,
    pub_date TEXT,
    found_at TEXT NOT NULL,
    imported INTEGER NOT NULL DEFAULT 0,
    dismissed INTEGER NOT NULL DEFAULT 0,
    lead_id TEXT,
    raw_json TEXT
  );
  CREATE INDEX IF NOT EXISTS idx_findings_found_at ON findings(found_at DESC);
  CREATE INDEX IF NOT EXISTS idx_findings_source ON findings(source);

  CREATE TABLE IF NOT EXISTS leads (
    id TEXT PRIMARY KEY,
    company TEXT NOT NULL,
    status TEXT NOT NULL,
    name TEXT NOT NULL,
    phone TEXT,
    email TEXT,
    source TEXT,
    address TEXT,
    service TEXT,
    value REAL,
    notes TEXT,
    reminder_type TEXT,
    reminder_when TEXT,
    reminder_note TEXT,
    created_at INTEGER NOT NULL,
    finding_id TEXT,
    proposals_json TEXT
  );
  CREATE INDEX IF NOT EXISTS idx_leads_created_at ON leads(created_at DESC);

  CREATE TABLE IF NOT EXISTS scan_runs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    source TEXT NOT NULL,
    started_at TEXT NOT NULL,
    finished_at TEXT,
    new_count INTEGER DEFAULT 0,
    error TEXT
  );
  CREATE INDEX IF NOT EXISTS idx_scan_runs_started ON scan_runs(started_at DESC);

  CREATE TABLE IF NOT EXISTS config (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );
`);

function uid(prefix = 'f') {
  return prefix + '_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

// ---- Findings ----
const insertFindingStmt = db.prepare(`
  INSERT OR IGNORE INTO findings
    (id, source, title, link, summary, phone, address, pub_date, found_at, raw_json)
  VALUES (@id, @source, @title, @link, @summary, @phone, @address, @pub_date, @found_at, @raw_json)
`);

function insertFinding(finding) {
  const row = {
    id: finding.id || uid('f'),
    source: finding.source,
    title: finding.title || '',
    link: finding.link,
    summary: finding.summary || '',
    phone: finding.phone || '',
    address: finding.address || '',
    pub_date: finding.pubDate || '',
    found_at: finding.foundAt || new Date().toISOString(),
    raw_json: finding.raw ? JSON.stringify(finding.raw) : null,
  };
  const info = insertFindingStmt.run(row);
  return info.changes > 0 ? row.id : null;
}

function listFindings({ since, limit = 100, includeImported = false, includeDismissed = false } = {}) {
  const conditions = [];
  const params = {};
  if (since) {
    conditions.push('found_at >= @since');
    params.since = since;
  }
  if (!includeImported) conditions.push('imported = 0');
  if (!includeDismissed) conditions.push('dismissed = 0');
  const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';
  const sql = `SELECT * FROM findings ${where} ORDER BY found_at DESC LIMIT @limit`;
  params.limit = limit;
  return db.prepare(sql).all(params);
}

function markFindingImported(findingId, leadId) {
  db.prepare('UPDATE findings SET imported = 1, lead_id = ? WHERE id = ?').run(leadId, findingId);
}

function markFindingDismissed(findingId) {
  db.prepare('UPDATE findings SET dismissed = 1 WHERE id = ?').run(findingId);
}

function getFinding(id) {
  return db.prepare('SELECT * FROM findings WHERE id = ?').get(id);
}

function linkExists(link) {
  return !!db.prepare('SELECT 1 FROM findings WHERE link = ?').get(link);
}

// ---- Leads ----
const insertLeadStmt = db.prepare(`
  INSERT INTO leads
    (id, company, status, name, phone, email, source, address, service, value, notes,
     reminder_type, reminder_when, reminder_note, created_at, finding_id, proposals_json)
  VALUES
    (@id, @company, @status, @name, @phone, @email, @source, @address, @service, @value, @notes,
     @reminder_type, @reminder_when, @reminder_note, @created_at, @finding_id, @proposals_json)
`);

function insertLead(lead) {
  const row = {
    id: lead.id || uid('l'),
    company: lead.company || 'construction',
    status: lead.status || 'new',
    name: lead.name || '',
    phone: lead.phone || '',
    email: lead.email || '',
    source: lead.source || '',
    address: lead.address || '',
    service: lead.service || '',
    value: lead.value ? Number(lead.value) : null,
    notes: lead.notes || '',
    reminder_type: lead.reminder?.type || 'none',
    reminder_when: lead.reminder?.when || null,
    reminder_note: lead.reminder?.note || '',
    created_at: lead.createdAt || Date.now(),
    finding_id: lead.findingId || null,
    proposals_json: lead.proposals ? JSON.stringify(lead.proposals) : null,
  };
  insertLeadStmt.run(row);
  return row.id;
}

function listLeads() {
  return db.prepare('SELECT * FROM leads ORDER BY created_at DESC').all();
}

// ---- Scan runs ----
function startScanRun(source) {
  const info = db.prepare('INSERT INTO scan_runs (source, started_at) VALUES (?, ?)')
    .run(source, new Date().toISOString());
  return info.lastInsertRowid;
}

function finishScanRun(runId, newCount, error) {
  db.prepare('UPDATE scan_runs SET finished_at = ?, new_count = ?, error = ? WHERE id = ?')
    .run(new Date().toISOString(), newCount, error || null, runId);
}

function recentScanRuns(limit = 20) {
  return db.prepare('SELECT * FROM scan_runs ORDER BY id DESC LIMIT ?').all(limit);
}

// ---- Config ----
function getConfig(key, fallback = null) {
  const row = db.prepare('SELECT value FROM config WHERE key = ?').get(key);
  return row ? row.value : fallback;
}

function setConfig(key, value) {
  db.prepare(`
    INSERT INTO config (key, value) VALUES (?, ?)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value
  `).run(key, String(value));
}

function allConfig() {
  return Object.fromEntries(
    db.prepare('SELECT key, value FROM config').all().map((r) => [r.key, r.value])
  );
}

module.exports = {
  db,
  uid,
  insertFinding,
  listFindings,
  markFindingImported,
  markFindingDismissed,
  getFinding,
  linkExists,
  insertLead,
  listLeads,
  startScanRun,
  finishScanRun,
  recentScanRuns,
  getConfig,
  setConfig,
  allConfig,
  DB_PATH,
};
