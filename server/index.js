'use strict';

const path = require('path');
const express = require('express');
const cors = require('cors');
const db = require('./db');
const scheduler = require('./scheduler');
const permits = require('./scrapers/permits');

const PORT = parseInt(process.env.PORT || '3000', 10);
const API_TOKEN = process.env.API_TOKEN || '';
const STATIC_DIR = path.join(__dirname, '..');

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.text({ limit: '10mb', type: ['text/csv', 'text/plain'] }));

// Static frontend — lets one Render service serve both API and dashboard.
app.use(express.static(STATIC_DIR, {
  index: 'index.html',
  setHeaders(res, filePath) {
    if (filePath.endsWith('.html')) res.setHeader('Cache-Control', 'no-cache');
  },
}));

// ---- Auth middleware: required only when API_TOKEN is set.
function requireAuth(req, res, next) {
  if (!API_TOKEN) return next();
  const hdr = req.headers.authorization || '';
  const token = hdr.startsWith('Bearer ') ? hdr.slice(7) : req.query.token;
  if (token === API_TOKEN) return next();
  res.status(401).json({ error: 'unauthorized' });
}

// ---- Public health check.
app.get('/api/health', (req, res) => {
  const runs = db.recentScanRuns(5);
  res.json({
    ok: true,
    authRequired: Boolean(API_TOKEN),
    googlePlacesConfigured: Boolean(process.env.GOOGLE_PLACES_API_KEY),
    recentRuns: runs,
    status: scheduler.status,
  });
});

app.get('/api/config', requireAuth, (req, res) => {
  res.json({
    defaults: scheduler.DEFAULTS,
    current: scheduler.currentConfig(),
    overrides: db.allConfig(),
  });
});

app.put('/api/config', requireAuth, (req, res) => {
  const allowed = ['region', 'zip', 'radius', 'maxAgeDays', 'intervalMinutes', 'lat', 'lng', 'keywords'];
  const body = req.body || {};
  const updated = {};
  for (const k of allowed) {
    if (k in body) {
      const v = Array.isArray(body[k]) ? body[k].join(', ') : body[k];
      db.setConfig(k, v);
      updated[k] = v;
    }
  }
  res.json({ updated, current: scheduler.currentConfig() });
});

app.get('/api/findings', requireAuth, (req, res) => {
  const limit = Math.min(500, parseInt(req.query.limit, 10) || 100);
  const since = req.query.since || null;
  const includeImported = req.query.imported === 'true' || req.query.all === 'true';
  const includeDismissed = req.query.dismissed === 'true' || req.query.all === 'true';
  const rows = db.listFindings({ since, limit, includeImported, includeDismissed });
  res.json({
    findings: rows.map((r) => ({
      id: r.id,
      source: r.source,
      title: r.title,
      link: r.link,
      summary: r.summary,
      phone: r.phone,
      address: r.address,
      pubDate: r.pub_date,
      foundAt: r.found_at,
      imported: Boolean(r.imported),
      dismissed: Boolean(r.dismissed),
      leadId: r.lead_id,
    })),
  });
});

app.post('/api/findings/:id/import', requireAuth, (req, res) => {
  const finding = db.getFinding(req.params.id);
  if (!finding) return res.status(404).json({ error: 'not found' });
  if (finding.imported) return res.status(409).json({ error: 'already imported', leadId: finding.lead_id });

  const body = req.body || {};
  const leadId = db.insertLead({
    company: body.company || 'construction',
    status: 'new',
    name: body.name || finding.title.slice(0, 80),
    phone: body.phone || finding.phone || '',
    email: body.email || '',
    source: finding.source,
    address: body.address || finding.address || '',
    service: body.service || finding.title,
    value: body.value || null,
    notes: [finding.summary, `Source: ${finding.link}`, `Posted: ${finding.pub_date || 'unknown'}`]
      .filter(Boolean).join('\n\n'),
    reminder: { type: 'call', when: null, note: 'Follow up on scraped lead' },
    findingId: finding.id,
  });
  db.markFindingImported(finding.id, leadId);
  res.json({ leadId });
});

app.post('/api/findings/:id/dismiss', requireAuth, (req, res) => {
  const finding = db.getFinding(req.params.id);
  if (!finding) return res.status(404).json({ error: 'not found' });
  db.markFindingDismissed(finding.id);
  res.json({ ok: true });
});

app.get('/api/leads', requireAuth, (req, res) => {
  res.json({ leads: db.listLeads() });
});

app.post('/api/scan/trigger', requireAuth, async (req, res) => {
  const includeGooglePlaces = req.query.places === 'true' || req.body?.places === true;
  const result = await scheduler.runAll({ includeGooglePlaces });
  res.json(result);
});

app.post('/api/permits/import', requireAuth, (req, res) => {
  const format = (req.query.format || req.body?.format || 'json').toLowerCase();
  const town = req.query.town || req.body?.town || 'manual';
  let payload;
  if (format === 'csv') {
    payload = typeof req.body === 'string' ? req.body : (req.body?.csv || '');
  } else {
    payload = req.body?.records || req.body;
  }
  if (!payload || (typeof payload === 'string' && !payload.trim())) {
    return res.status(400).json({ error: 'missing payload' });
  }
  const result = permits.ingest({ town, format, payload });
  res.json(result);
});

app.get('/api/permits/links', (req, res) => {
  res.json({ links: permits.ACCELA_QUICK_LINKS });
});

app.get('/api/runs', requireAuth, (req, res) => {
  res.json({ runs: db.recentScanRuns(50) });
});

// ---- SPA fallback: don't let an unknown URL 404 the dashboard.
app.use((req, res, next) => {
  if (req.method !== 'GET' || req.path.startsWith('/api/')) return next();
  res.sendFile(path.join(STATIC_DIR, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`[server] listening on :${PORT}`);
  console.log(`[server] db: ${db.DB_PATH}`);
  console.log(`[server] auth: ${API_TOKEN ? 'enabled' : 'disabled (set API_TOKEN to lock down)'}`);
  scheduler.start();
});
