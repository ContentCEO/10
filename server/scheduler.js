'use strict';

const cron = require('node-cron');
const db = require('./db');
const { runCraigslistScan } = require('./scrapers/craigslist');
const { runGooglePlacesScan } = require('./scrapers/google-places');

const DEFAULTS = {
  region: process.env.FINDER_REGION || 'boston',
  zip: process.env.FINDER_ZIP || '01742',
  radius: parseInt(process.env.FINDER_RADIUS || '20', 10),
  maxAgeDays: parseInt(process.env.FINDER_MAX_AGE_DAYS || '30', 10),
  intervalMinutes: parseInt(process.env.FINDER_INTERVAL_MINUTES || '15', 10),
  lat: parseFloat(process.env.FINDER_LAT || '42.4604'),
  lng: parseFloat(process.env.FINDER_LNG || '-71.3489'),
  keywords: [
    'remodel', 'kitchen remodel', 'bathroom remodel', 'renovation',
    'addition', 'basement finish', 'deck', 'flooring', 'tile',
    'drywall', 'framing', 'siding', 'roofing', 'general contractor',
    'handyman', 'carpenter',
  ],
};

function currentConfig() {
  const overrides = {};
  for (const k of ['region', 'zip', 'radius', 'maxAgeDays', 'intervalMinutes', 'lat', 'lng']) {
    const v = db.getConfig(k);
    if (v != null) {
      overrides[k] = (k === 'region' || k === 'zip') ? v : Number(v);
    }
  }
  const kwRaw = db.getConfig('keywords');
  const keywords = kwRaw
    ? kwRaw.split(',').map((s) => s.trim()).filter(Boolean)
    : DEFAULTS.keywords;
  return { ...DEFAULTS, ...overrides, keywords };
}

let running = false;
let lastTriggeredAt = null;

async function runAll({ includeGooglePlaces = false } = {}) {
  if (running) {
    console.log('[scheduler] skip: scan already in progress');
    return { skipped: true };
  }
  running = true;
  lastTriggeredAt = new Date().toISOString();
  const cfg = currentConfig();
  const results = {};
  try {
    console.log('[scheduler] craigslist scan start');
    results.craigslist = await runCraigslistScan(cfg);
    console.log('[scheduler] craigslist done:', results.craigslist);
    if (includeGooglePlaces) {
      console.log('[scheduler] google places scan start');
      results.googlePlaces = await runGooglePlacesScan(cfg);
      console.log('[scheduler] google places done:', results.googlePlaces);
    }
  } catch (e) {
    console.error('[scheduler] runAll failed:', e);
    results.error = e.message;
  } finally {
    running = false;
  }
  return results;
}

function start() {
  const cfg = currentConfig();
  const minutes = Math.max(5, cfg.intervalMinutes);
  // Craigslist every N minutes (default 15). Use step syntax to fire every N min.
  const clExpr = `*/${minutes} * * * *`;
  cron.schedule(clExpr, () => {
    runAll({ includeGooglePlaces: false }).catch((e) => console.error(e));
  });
  // Google Places is stable business data and costs money — poll once daily at 6am.
  cron.schedule('0 6 * * *', () => {
    runAll({ includeGooglePlaces: true }).catch((e) => console.error(e));
  });
  console.log(`[scheduler] registered: craigslist every ${minutes}m; google-places daily 06:00`);
  // Kick off an initial craigslist pass ~10s after boot so new deploys
  // populate data without waiting for the next cron tick.
  setTimeout(() => {
    runAll({ includeGooglePlaces: false }).catch((e) => console.error(e));
  }, 10_000);
}

module.exports = { start, runAll, currentConfig, DEFAULTS, get status() { return { running, lastTriggeredAt }; } };
