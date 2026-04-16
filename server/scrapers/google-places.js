'use strict';

const db = require('../db');

// Business types worth prospecting for a remodeling contractor:
//   - Property managers (recurring multi-unit work)
//   - Real estate agents (rehab flips, pre-sale improvements)
//   - Home staging / interior designers (refers work)
//   - General contractors (subcontracting opportunities)
const SEARCH_TERMS = [
  'property management',
  'real estate agency',
  'home staging',
  'interior designer',
  'general contractor',
];

// Uses the Places API (New) text search endpoint, which supports geographic
// location bias and includes formattedAddress + nationalPhoneNumber in the
// response field mask.
const TEXT_SEARCH_URL = 'https://places.googleapis.com/v1/places:searchText';

async function textSearch(apiKey, query, lat, lng, radiusMeters) {
  const body = {
    textQuery: query,
    maxResultCount: 20,
    locationBias: {
      circle: {
        center: { latitude: lat, longitude: lng },
        radius: radiusMeters,
      },
    },
  };
  const resp = await fetch(TEXT_SEARCH_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': apiKey,
      'X-Goog-FieldMask': [
        'places.id',
        'places.displayName',
        'places.formattedAddress',
        'places.nationalPhoneNumber',
        'places.internationalPhoneNumber',
        'places.websiteUri',
        'places.googleMapsUri',
        'places.primaryType',
        'places.types',
      ].join(','),
    },
    body: JSON.stringify(body),
  });
  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`Places API ${resp.status}: ${text.slice(0, 200)}`);
  }
  const data = await resp.json();
  return data.places || [];
}

async function runGooglePlacesScan(config) {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) {
    return { newCount: 0, skipped: true, error: 'GOOGLE_PLACES_API_KEY not set' };
  }

  const {
    lat = 42.4604,
    lng = -71.3489,
    radius = 20, // miles
  } = config || {};
  const radiusMeters = Math.round(radius * 1609.34);

  const runId = db.startScanRun('google-places');
  let newCount = 0;
  let errorMsg = null;

  try {
    for (const term of SEARCH_TERMS) {
      try {
        const places = await textSearch(apiKey, term, lat, lng, radiusMeters);
        for (const p of places) {
          const link = p.googleMapsUri || `https://www.google.com/maps/place/?q=place_id:${p.id}`;
          if (db.linkExists(link)) continue;
          const name = p.displayName?.text || '(unnamed)';
          const phone = p.nationalPhoneNumber || p.internationalPhoneNumber || '';
          const inserted = db.insertFinding({
            source: 'google-places',
            title: `${name} — ${term}`,
            link,
            summary: [
              p.formattedAddress || '',
              p.websiteUri ? `Website: ${p.websiteUri}` : '',
              p.primaryType ? `Type: ${p.primaryType}` : '',
            ].filter(Boolean).join(' · '),
            phone,
            address: p.formattedAddress || '',
            pubDate: new Date().toISOString(),
            foundAt: new Date().toISOString(),
            raw: { placeId: p.id, searchTerm: term, types: p.types },
          });
          if (inserted) newCount += 1;
        }
      } catch (e) {
        console.warn('[google-places]', term, 'failed:', e.message);
      }
      // Small delay between queries.
      await new Promise((r) => setTimeout(r, 400));
    }
  } catch (e) {
    errorMsg = e.message;
  }

  db.finishScanRun(runId, newCount, errorMsg);
  return { newCount, error: errorMsg };
}

module.exports = { runGooglePlacesScan };
