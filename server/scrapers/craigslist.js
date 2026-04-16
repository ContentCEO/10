'use strict';

const { XMLParser } = require('fast-xml-parser');
const db = require('../db');

const PHONE_REGEX = /(?:\+?1[\s.-]?)?\(?\b[2-9]\d{2}\)?[\s.-]?\d{3}[\s.-]?\d{4}\b/g;
// Craigslist categories most useful for a remodeling contractor:
//   lbg = labor gigs (homeowners posting jobs they need done)
//   ggg = all gigs (catches cross-posted labor requests)
const CATEGORIES = ['lbg', 'ggg'];

const xmlParser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  removeNSPrefix: true,
  trimValues: true,
});

function buildFeedUrl(region, category, query, zip, radiusMiles) {
  const params = new URLSearchParams({
    format: 'rss',
    query,
    postal: zip,
    search_distance: String(radiusMiles),
  });
  return `https://${region}.craigslist.org/search/${category}?${params.toString()}`;
}

function stripHtml(html) {
  return String(html || '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

function extractPhone(text) {
  if (!text) return '';
  const m = String(text).match(PHONE_REGEX);
  return m ? m[0].trim() : '';
}

async function fetchFeed(url) {
  const resp = await fetch(url, {
    headers: {
      // Use a normal UA so Craigslist serves the feed reliably.
      'User-Agent': 'Mozilla/5.0 (compatible; AC-Lead-Finder/1.0)',
      Accept: 'application/rss+xml, application/xml, text/xml, */*',
    },
  });
  if (!resp.ok) throw new Error(`HTTP ${resp.status} for ${url}`);
  return await resp.text();
}

function parseRSS(xmlText) {
  const parsed = xmlParser.parse(xmlText);
  // RDF/RSS 1.0: root is RDF, items are under RDF.item (array when >1)
  // RSS 2.0: root is rss, items under rss.channel.item
  let items = [];
  if (parsed.RDF && parsed.RDF.item) {
    items = Array.isArray(parsed.RDF.item) ? parsed.RDF.item : [parsed.RDF.item];
  } else if (parsed.rss && parsed.rss.channel && parsed.rss.channel.item) {
    const it = parsed.rss.channel.item;
    items = Array.isArray(it) ? it : [it];
  }
  return items.map((item) => ({
    title: typeof item.title === 'string' ? item.title : (item.title?.['#text'] || ''),
    link: typeof item.link === 'string' ? item.link : (item.link?.['#text'] || ''),
    description: typeof item.description === 'string' ? item.description : (item.description?.['#text'] || ''),
    pubDate: item.date || item.pubDate || '',
  }));
}

async function runCraigslistScan(config) {
  const {
    region = 'boston',
    zip = '01742',
    radius = 20,
    maxAgeDays = 30,
    keywords = [],
  } = config || {};

  const runId = db.startScanRun('craigslist');
  let newCount = 0;
  let errorMsg = null;
  const cutoff = Date.now() - maxAgeDays * 86400000;

  try {
    for (const kw of keywords) {
      for (const cat of CATEGORIES) {
        const url = buildFeedUrl(region, cat, kw, zip, radius);
        try {
          const xml = await fetchFeed(url);
          const items = parseRSS(xml);
          for (const item of items) {
            if (!item.link) continue;
            if (db.linkExists(item.link)) continue;
            const pubMs = item.pubDate ? new Date(item.pubDate).getTime() : NaN;
            if (Number.isFinite(pubMs) && pubMs < cutoff) continue;
            const text = stripHtml(item.description);
            const phone = extractPhone(item.title + ' ' + text);
            const inserted = db.insertFinding({
              source: `craigslist/${region}/${cat}`,
              title: item.title || '(no title)',
              link: item.link,
              summary: text.slice(0, 600),
              phone,
              pubDate: item.pubDate || '',
              foundAt: new Date().toISOString(),
              raw: { keyword: kw },
            });
            if (inserted) newCount += 1;
          }
        } catch (e) {
          console.warn('[craigslist] feed failed:', url, e.message);
        }
        // Throttle between feeds so we don't hammer Craigslist.
        await new Promise((r) => setTimeout(r, 600));
      }
    }
  } catch (e) {
    errorMsg = e.message;
  }

  db.finishScanRun(runId, newCount, errorMsg);
  return { newCount, error: errorMsg };
}

module.exports = { runCraigslistScan };
