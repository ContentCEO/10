// A&C Lead Manager - client-side app
// State is persisted in localStorage. No backend required.

const STORAGE_KEY = 'ac-lead-manager-v1';
const FINDER_KEY = 'ac-lead-finder-v1';
// Public CORS proxy. Craigslist blocks cross-origin fetches from browsers, so
// we relay through allorigins. If it goes down, the scan will surface an error
// and the user can change this to another proxy or host their own.
const CORS_PROXY = 'https://api.allorigins.win/raw?url=';
// Craigslist categories worth pinging for a remodeling contractor:
//   lbg = labor gigs (homeowners posting work they need done)
//   ggg = all gigs (fallback / catches cross-posts)
const FINDER_CATEGORIES = ['lbg', 'ggg'];
const PHONE_REGEX = /(?:\+?1[\s.-]?)?\(?\b[2-9]\d{2}\)?[\s.-]?\d{3}[\s.-]?\d{4}\b/g;
const COMPANY_LABELS = {
  construction: 'A&C Construction',
  cleaning: 'A&C Cleaning',
};
const STATUS_LABELS = {
  new: 'New',
  contacted: 'Contacted',
  appointment: 'Appointment Set',
  proposal: 'Proposal Sent',
  won: 'Won',
  lost: 'Lost',
};

let state = {
  leads: [],
  filter: {
    company: 'all',
    status: 'all',
    search: '',
  },
  notifiedReminders: new Set(),
};

let finder = {
  config: {
    region: 'boston',
    zip: '01742',
    radius: 20,
    maxAgeDays: 30,
    intervalMinutes: 15,
    keywords: 'remodel, kitchen remodel, bathroom remodel, renovation, addition, basement finish, deck, flooring, tile, drywall, framing, siding, roofing, general contractor, handyman, carpenter',
  },
  findings: [],
  seenLinks: new Set(),
  importedLinks: new Set(),
  lastScanAt: null,
  nextScanAt: null,
  running: false,
  timerId: null,
  scanning: false,
};

// ---------- Persistence ----------
function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed.leads)) state.leads = parsed.leads;
    if (Array.isArray(parsed.notifiedReminders)) {
      state.notifiedReminders = new Set(parsed.notifiedReminders);
    }
  } catch (e) {
    console.warn('Failed to load state', e);
  }
}

function saveState() {
  const payload = {
    leads: state.leads,
    notifiedReminders: Array.from(state.notifiedReminders),
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
}

function loadFinder() {
  try {
    const raw = localStorage.getItem(FINDER_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw);
    if (parsed.config) finder.config = { ...finder.config, ...parsed.config };
    if (Array.isArray(parsed.findings)) finder.findings = parsed.findings;
    if (Array.isArray(parsed.seenLinks)) finder.seenLinks = new Set(parsed.seenLinks);
    if (Array.isArray(parsed.importedLinks)) finder.importedLinks = new Set(parsed.importedLinks);
    if (parsed.lastScanAt) finder.lastScanAt = parsed.lastScanAt;
  } catch (e) {
    console.warn('Failed to load finder state', e);
  }
}

function saveFinder() {
  const payload = {
    config: finder.config,
    findings: finder.findings.slice(0, 500),
    seenLinks: Array.from(finder.seenLinks).slice(-2000),
    importedLinks: Array.from(finder.importedLinks).slice(-2000),
    lastScanAt: finder.lastScanAt,
  };
  localStorage.setItem(FINDER_KEY, JSON.stringify(payload));
}

// ---------- Utilities ----------
function uid() {
  return 'l_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function formatDateTime(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function relativeTime(iso) {
  const d = new Date(iso).getTime();
  const now = Date.now();
  const diff = d - now;
  const abs = Math.abs(diff);
  const minutes = Math.round(abs / 60000);
  const hours = Math.round(abs / 3600000);
  const days = Math.round(abs / 86400000);
  let txt;
  if (minutes < 60) txt = `${minutes} min`;
  else if (hours < 24) txt = `${hours} hr`;
  else txt = `${days} day${days === 1 ? '' : 's'}`;
  return diff < 0 ? `${txt} ago` : `in ${txt}`;
}

function reminderUrgency(iso) {
  if (!iso) return null;
  const diff = new Date(iso).getTime() - Date.now();
  if (diff < 0) return 'due';
  if (diff < 1000 * 60 * 60 * 24) return 'soon';
  return 'later';
}

function showToast(message, kind = '') {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.className = 'toast ' + kind;
  toast.hidden = false;
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => (toast.hidden = true), 2600);
}

// ---------- Rendering ----------
function filteredLeads() {
  const { company, status, search } = state.filter;
  const q = search.trim().toLowerCase();
  return state.leads.filter((l) => {
    if (company !== 'all' && l.company !== company) return false;
    if (status !== 'all' && l.status !== status) return false;
    if (q) {
      const hay = [l.name, l.phone, l.email, l.address, l.service, l.notes]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });
}

function renderStats() {
  const list = state.filter.company === 'all'
    ? state.leads
    : state.leads.filter((l) => l.company === state.filter.company);
  const count = (s) => list.filter((l) => l.status === s).length;
  document.getElementById('stat-total').textContent = list.length;
  document.getElementById('stat-new').textContent = count('new');
  document.getElementById('stat-contacted').textContent = count('contacted');
  document.getElementById('stat-proposal').textContent = count('proposal');
  document.getElementById('stat-won').textContent = count('won');
  const dueCount = list.filter(
    (l) => l.reminder && l.reminder.when && reminderUrgency(l.reminder.when) === 'due'
  ).length;
  document.getElementById('stat-due').textContent = dueCount;
}

function renderReminders() {
  const ul = document.getElementById('reminders-list');
  const reminders = state.leads
    .filter((l) => l.reminder && l.reminder.when && l.reminder.type !== 'none')
    .filter((l) => state.filter.company === 'all' || l.company === state.filter.company)
    .map((l) => ({ lead: l, when: new Date(l.reminder.when).getTime() }))
    .sort((a, b) => a.when - b.when)
    .slice(0, 8);

  ul.innerHTML = '';
  if (reminders.length === 0) {
    ul.innerHTML = '<li class="reminder-item"><span class="name">No reminders scheduled</span></li>';
    return;
  }

  for (const { lead } of reminders) {
    const li = document.createElement('li');
    const urgency = reminderUrgency(lead.reminder.when);
    li.className = 'reminder-item ' + (urgency === 'due' ? 'due' : urgency === 'soon' ? 'soon' : '');
    const note = lead.reminder.note ? ` — ${escapeHtml(lead.reminder.note)}` : '';
    li.innerHTML = `
      <span class="reminder-type-pill">${escapeHtml(lead.reminder.type)}</span>
      <span class="name">${escapeHtml(lead.name)}${note}</span>
      <span class="when">${formatDateTime(lead.reminder.when)} (${relativeTime(lead.reminder.when)})</span>
      <span class="actions">
        <button data-action="open" data-id="${lead.id}">Open</button>
        <button data-action="done" data-id="${lead.id}">Done</button>
      </span>
    `;
    ul.appendChild(li);
  }
}

function renderLeads() {
  const grid = document.getElementById('leads-grid');
  const empty = document.getElementById('empty-state');
  const leads = filteredLeads();
  grid.innerHTML = '';

  if (leads.length === 0) {
    empty.hidden = false;
    return;
  }
  empty.hidden = true;

  for (const lead of leads) {
    const card = document.createElement('div');
    card.className = 'lead-card';
    const urgency = lead.reminder ? reminderUrgency(lead.reminder.when) : null;
    const reminderHtml = lead.reminder && lead.reminder.when && lead.reminder.type !== 'none'
      ? `<div class="reminder-info ${urgency || ''}">
           <strong>${escapeHtml(lead.reminder.type.toUpperCase())}:</strong>
           ${formatDateTime(lead.reminder.when)} (${relativeTime(lead.reminder.when)})
           ${lead.reminder.note ? `<br>${escapeHtml(lead.reminder.note)}` : ''}
         </div>`
      : '';

    const phoneLink = lead.phone
      ? `<a href="tel:${encodeURIComponent(lead.phone)}">&#128222; ${escapeHtml(lead.phone)}</a>
         <a href="sms:${encodeURIComponent(lead.phone)}">&#128172; Text</a>`
      : '';
    const emailLink = lead.email
      ? `<a href="mailto:${encodeURIComponent(lead.email)}">&#9993; ${escapeHtml(lead.email)}</a>`
      : '';
    const addressLink = lead.address
      ? `<a href="https://maps.google.com/?q=${encodeURIComponent(lead.address)}" target="_blank" rel="noopener">&#128205; Map</a>`
      : '';
    const value = lead.value ? `<div class="lead-service">Est. $${Number(lead.value).toLocaleString()}</div>` : '';

    card.innerHTML = `
      <span class="company-tag ${lead.company}">${COMPANY_LABELS[lead.company] || ''}</span>
      <div class="lead-header">
        <div>
          <div class="lead-name">${escapeHtml(lead.name)}</div>
          ${lead.service ? `<div class="lead-service">${escapeHtml(lead.service)}</div>` : ''}
          ${value}
        </div>
        <span class="status-badge status-${lead.status}">${STATUS_LABELS[lead.status] || lead.status}</span>
      </div>
      <div class="contact-row">${phoneLink}${emailLink}${addressLink}</div>
      ${reminderHtml}
      <div class="lead-actions">
        <button class="edit-btn" data-action="edit" data-id="${lead.id}">Edit</button>
        <button data-action="remind" data-id="${lead.id}">Remind</button>
        <button data-action="appointment" data-id="${lead.id}">Appt</button>
        <button data-action="proposal" data-id="${lead.id}">Proposal</button>
      </div>
    `;
    grid.appendChild(card);
  }
}

function render() {
  renderStats();
  renderReminders();
  renderLeads();
}

function escapeHtml(str) {
  return String(str ?? '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  }[c]));
}

// ---------- Lead CRUD ----------
function getLead(id) {
  return state.leads.find((l) => l.id === id);
}

function upsertLead(data) {
  if (data.id) {
    const idx = state.leads.findIndex((l) => l.id === data.id);
    if (idx >= 0) {
      state.leads[idx] = { ...state.leads[idx], ...data };
      return state.leads[idx];
    }
  }
  const lead = { id: uid(), createdAt: Date.now(), ...data };
  delete lead.id;
  lead.id = uid();
  state.leads.push(lead);
  return lead;
}

function deleteLead(id) {
  state.leads = state.leads.filter((l) => l.id !== id);
}

// ---------- Modal ----------
function openLeadModal(leadId = null) {
  const modal = document.getElementById('lead-modal');
  const form = document.getElementById('lead-form');
  form.reset();
  document.getElementById('lead-id').value = '';
  document.getElementById('delete-lead').hidden = true;

  if (leadId) {
    const lead = getLead(leadId);
    if (!lead) return;
    document.getElementById('modal-title').textContent = 'Edit Lead';
    document.getElementById('lead-id').value = lead.id;
    document.getElementById('lead-company').value = lead.company;
    document.getElementById('lead-status').value = lead.status;
    document.getElementById('lead-name').value = lead.name || '';
    document.getElementById('lead-phone').value = lead.phone || '';
    document.getElementById('lead-email').value = lead.email || '';
    document.getElementById('lead-source').value = lead.source || '';
    document.getElementById('lead-address').value = lead.address || '';
    document.getElementById('lead-service').value = lead.service || '';
    document.getElementById('lead-value').value = lead.value || '';
    document.getElementById('lead-notes').value = lead.notes || '';
    if (lead.reminder) {
      document.getElementById('reminder-type').value = lead.reminder.type || 'none';
      document.getElementById('reminder-when').value = lead.reminder.when
        ? toLocalInput(lead.reminder.when)
        : '';
      document.getElementById('reminder-note').value = lead.reminder.note || '';
    }
    document.getElementById('delete-lead').hidden = false;
  } else {
    document.getElementById('modal-title').textContent = 'New Lead';
    // Default to currently-filtered company if specific
    if (state.filter.company !== 'all') {
      document.getElementById('lead-company').value = state.filter.company;
    }
  }

  modal.hidden = false;
  document.getElementById('lead-name').focus();
}

function closeLeadModal() {
  document.getElementById('lead-modal').hidden = true;
}

function toLocalInput(iso) {
  const d = new Date(iso);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function handleLeadSubmit(ev) {
  ev.preventDefault();
  const id = document.getElementById('lead-id').value || null;
  const reminderType = document.getElementById('reminder-type').value;
  const reminderWhen = document.getElementById('reminder-when').value;

  const data = {
    company: document.getElementById('lead-company').value,
    status: document.getElementById('lead-status').value,
    name: document.getElementById('lead-name').value.trim(),
    phone: document.getElementById('lead-phone').value.trim(),
    email: document.getElementById('lead-email').value.trim(),
    source: document.getElementById('lead-source').value.trim(),
    address: document.getElementById('lead-address').value.trim(),
    service: document.getElementById('lead-service').value.trim(),
    value: document.getElementById('lead-value').value || null,
    notes: document.getElementById('lead-notes').value.trim(),
    reminder: {
      type: reminderType,
      when: reminderWhen ? new Date(reminderWhen).toISOString() : null,
      note: document.getElementById('reminder-note').value.trim(),
    },
  };

  if (!data.name) {
    showToast('Name is required', 'error');
    return;
  }

  if (id) {
    const idx = state.leads.findIndex((l) => l.id === id);
    if (idx >= 0) state.leads[idx] = { ...state.leads[idx], ...data };
  } else {
    state.leads.push({ id: uid(), createdAt: Date.now(), ...data });
  }

  // Reset notification tracking for a new/updated reminder
  if (data.reminder.when) {
    state.notifiedReminders.delete(id);
  }

  saveState();
  render();
  closeLeadModal();
  showToast(id ? 'Lead updated' : 'Lead added', 'success');
}

// ---------- Proposal Modal ----------
function openProposalModal(leadId) {
  const lead = getLead(leadId);
  if (!lead) return;
  document.getElementById('proposal-lead-id').value = leadId;
  document.getElementById('proposal-title').textContent = `Proposal for ${lead.name}`;
  document.getElementById('proposal-scope').value = lead.service || '';
  document.getElementById('proposal-price').value = lead.value || '';
  document.getElementById('proposal-start').value = '';
  document.getElementById('proposal-terms').value = '50% deposit to start, balance on completion. Work guaranteed for 1 year.';
  document.getElementById('proposal-modal').hidden = false;
}

function closeProposalModal() {
  document.getElementById('proposal-modal').hidden = true;
}

function handleProposalSubmit(ev) {
  ev.preventDefault();
  const id = document.getElementById('proposal-lead-id').value;
  const lead = getLead(id);
  if (!lead) return;

  const scope = document.getElementById('proposal-scope').value.trim();
  const price = document.getElementById('proposal-price').value;
  const startDate = document.getElementById('proposal-start').value;
  const terms = document.getElementById('proposal-terms').value.trim();

  const company = COMPANY_LABELS[lead.company];
  const today = new Date().toLocaleDateString();
  const proposalText =
`${company.toUpperCase()}
PROPOSAL

Date: ${today}
Prepared For: ${lead.name}
${lead.address ? 'Address: ' + lead.address + '\n' : ''}${lead.phone ? 'Phone: ' + lead.phone + '\n' : ''}${lead.email ? 'Email: ' + lead.email + '\n' : ''}
---
SCOPE OF WORK:
${scope}

PRICE: $${Number(price).toLocaleString()}
${startDate ? 'Estimated Start: ' + startDate + '\n' : ''}
TERMS:
${terms}

Thank you for considering ${company}.`;

  // Save proposal on lead
  lead.proposals = lead.proposals || [];
  lead.proposals.push({
    id: uid(),
    createdAt: Date.now(),
    scope, price, startDate, terms, text: proposalText,
  });
  lead.status = 'proposal';
  saveState();
  render();

  // Try to open email client if email is set
  if (lead.email) {
    const subject = `Proposal from ${company}`;
    const mailto = `mailto:${encodeURIComponent(lead.email)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(proposalText)}`;
    window.open(mailto, '_blank');
  } else {
    // Download as .txt
    const blob = new Blob([proposalText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Proposal-${lead.name.replace(/\s+/g, '_')}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }

  closeProposalModal();
  showToast('Proposal generated', 'success');
}

// ---------- Reminders / Notifications ----------
function checkReminders() {
  if (!('Notification' in window)) return;
  if (Notification.permission !== 'granted') return;
  const now = Date.now();
  for (const lead of state.leads) {
    if (!lead.reminder || !lead.reminder.when || lead.reminder.type === 'none') continue;
    const when = new Date(lead.reminder.when).getTime();
    const key = `${lead.id}:${lead.reminder.when}`;
    if (when <= now && !state.notifiedReminders.has(key)) {
      new Notification(`${lead.reminder.type.toUpperCase()}: ${lead.name}`, {
        body: `${COMPANY_LABELS[lead.company]} — ${lead.reminder.note || 'Reminder due'}`,
        tag: key,
      });
      state.notifiedReminders.add(key);
      saveState();
    }
  }
}

function requestNotificationsIfNeeded() {
  if ('Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission();
  }
}

// ---------- Import / Export ----------
function exportData() {
  const blob = new Blob([JSON.stringify({ leads: state.leads }, null, 2)], {
    type: 'application/json',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `ac-leads-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
  showToast('Exported', 'success');
}

function importData(file) {
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const data = JSON.parse(reader.result);
      if (!Array.isArray(data.leads)) throw new Error('Invalid file');
      state.leads = data.leads;
      saveState();
      render();
      showToast('Imported ' + data.leads.length + ' leads', 'success');
    } catch (e) {
      showToast('Import failed: ' + e.message, 'error');
    }
  };
  reader.readAsText(file);
}

// ---------- Lead Finder (Scraper) ----------
function buildFeedUrl(region, category, query, zip, radiusMiles) {
  const params = new URLSearchParams({
    format: 'rss',
    query: query,
    postal: zip,
    search_distance: String(radiusMiles),
  });
  return `https://${region}.craigslist.org/search/${category}?${params.toString()}`;
}

async function fetchViaProxy(url) {
  const proxied = CORS_PROXY + encodeURIComponent(url);
  const resp = await fetch(proxied, { cache: 'no-store' });
  if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
  return await resp.text();
}

function parseRSS(xmlText) {
  const doc = new DOMParser().parseFromString(xmlText, 'application/xml');
  const err = doc.querySelector('parsererror');
  if (err) throw new Error('Feed parse error');
  // Craigslist uses RDF/RSS 1.0 with <item> elements.
  const items = Array.from(doc.getElementsByTagName('item'));
  const findChild = (parent, localName) => {
    for (const child of parent.children) {
      if (child.localName === localName || child.nodeName === localName) {
        return child;
      }
    }
    return null;
  };
  const getText = (parent, localName) => {
    const el = findChild(parent, localName);
    return el ? (el.textContent || '').trim() : '';
  };
  return items.map((item) => ({
    title: getText(item, 'title'),
    link: getText(item, 'link'),
    description: getText(item, 'description'),
    pubDate: getText(item, 'date') || getText(item, 'pubDate'),
  }));
}

function stripHtml(html) {
  const div = document.createElement('div');
  div.innerHTML = html || '';
  return (div.textContent || div.innerText || '').trim();
}

function extractPhone(text) {
  if (!text) return '';
  const matches = text.match(PHONE_REGEX);
  return matches ? matches[0].trim() : '';
}

function parseKeywords(raw) {
  return raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

function readFinderConfigFromUI() {
  finder.config = {
    region: document.getElementById('finder-region').value.trim() || 'boston',
    zip: document.getElementById('finder-zip').value.trim() || '01742',
    radius: Math.max(1, parseInt(document.getElementById('finder-radius').value, 10) || 20),
    maxAgeDays: Math.max(1, parseInt(document.getElementById('finder-max-age').value, 10) || 30),
    intervalMinutes: Math.max(5, parseInt(document.getElementById('finder-interval').value, 10) || 15),
    keywords: document.getElementById('finder-keywords').value,
  };
  saveFinder();
}

function applyFinderConfigToUI() {
  document.getElementById('finder-region').value = finder.config.region;
  document.getElementById('finder-zip').value = finder.config.zip;
  document.getElementById('finder-radius').value = finder.config.radius;
  document.getElementById('finder-max-age').value = finder.config.maxAgeDays;
  document.getElementById('finder-interval').value = finder.config.intervalMinutes;
  document.getElementById('finder-keywords').value = finder.config.keywords;
}

async function runScan() {
  if (finder.scanning) return;
  finder.scanning = true;
  setFinderStatus('Scanning...');

  readFinderConfigFromUI();
  const keywords = parseKeywords(finder.config.keywords);
  const cutoff = Date.now() - finder.config.maxAgeDays * 86400000;

  const feedUrls = [];
  for (const kw of keywords) {
    for (const cat of FINDER_CATEGORIES) {
      feedUrls.push(buildFeedUrl(finder.config.region, cat, kw, finder.config.zip, finder.config.radius));
    }
  }

  let newCount = 0;
  let errorCount = 0;
  const startedAt = Date.now();

  for (const url of feedUrls) {
    try {
      const xml = await fetchViaProxy(url);
      const items = parseRSS(xml);
      for (const item of items) {
        if (!item.link || finder.seenLinks.has(item.link)) continue;
        const pubMs = item.pubDate ? new Date(item.pubDate).getTime() : NaN;
        if (Number.isFinite(pubMs) && pubMs < cutoff) continue;
        const text = stripHtml(item.description);
        const phone = extractPhone(item.title + ' ' + text);
        const finding = {
          id: 'f_' + Math.random().toString(36).slice(2, 10),
          title: item.title || '(no title)',
          link: item.link,
          summary: text.slice(0, 400),
          phone,
          pubDate: item.pubDate || '',
          foundAt: new Date().toISOString(),
          source: `craigslist/${finder.config.region}`,
        };
        finder.seenLinks.add(item.link);
        finder.findings.unshift(finding);
        newCount += 1;
      }
    } catch (e) {
      errorCount += 1;
      console.warn('Scan fetch failed for', url, e);
    }
    // Gentle throttle between feed hits so we don't hammer the proxy.
    await new Promise((r) => setTimeout(r, 400));
  }

  finder.findings = finder.findings.slice(0, 500);
  finder.lastScanAt = new Date().toISOString();
  saveFinder();
  renderFinder();

  const secs = Math.round((Date.now() - startedAt) / 1000);
  const msg = errorCount
    ? `Scan done in ${secs}s — ${newCount} new, ${errorCount} feed errors`
    : `Scan done in ${secs}s — ${newCount} new findings`;
  setFinderStatus(finder.running ? `Running — ${msg}` : `Idle — ${msg}`);
  showToast(msg, errorCount ? 'error' : 'success');
  finder.scanning = false;
}

function startContinuousScan() {
  if (finder.running) return;
  readFinderConfigFromUI();
  finder.running = true;
  document.getElementById('finder-toggle').textContent = 'Stop Continuous Scan';
  const intervalMs = finder.config.intervalMinutes * 60 * 1000;
  const tick = () => {
    runScan();
    finder.nextScanAt = new Date(Date.now() + intervalMs).toISOString();
    renderFinderMeta();
  };
  tick();
  finder.timerId = setInterval(tick, intervalMs);
  finder.nextScanAt = new Date(Date.now() + intervalMs).toISOString();
  renderFinderMeta();
}

function stopContinuousScan() {
  finder.running = false;
  if (finder.timerId) {
    clearInterval(finder.timerId);
    finder.timerId = null;
  }
  finder.nextScanAt = null;
  document.getElementById('finder-toggle').textContent = 'Start Continuous Scan';
  setFinderStatus('Idle');
  renderFinderMeta();
}

function setFinderStatus(text) {
  const el = document.getElementById('finder-status');
  if (el) el.textContent = text;
}

function renderFinderMeta() {
  const el = document.getElementById('finder-meta');
  if (!el) return;
  const parts = [];
  if (finder.lastScanAt) parts.push(`Last scan: ${formatDateTime(finder.lastScanAt)}`);
  if (finder.running && finder.nextScanAt) parts.push(`Next scan: ${formatDateTime(finder.nextScanAt)}`);
  parts.push(`${finder.findings.length} findings stored`);
  el.textContent = parts.join(' · ');
}

function renderFinder() {
  const container = document.getElementById('finder-results');
  if (!container) return;
  renderFinderMeta();

  if (finder.findings.length === 0) {
    container.innerHTML = '<p class="empty-state">No findings yet. Click <strong>Scan Now</strong> to search.</p>';
    return;
  }

  container.innerHTML = '';
  for (const f of finder.findings.slice(0, 200)) {
    const card = document.createElement('div');
    card.className = 'finding-card' + (finder.importedLinks.has(f.link) ? ' imported' : '');
    const phoneHtml = f.phone
      ? `<a class="finding-phone" href="tel:${encodeURIComponent(f.phone)}">&#128222; ${escapeHtml(f.phone)}</a>`
      : '<span class="finding-nophone">No phone in post — use Craigslist reply link</span>';
    const dateHtml = f.pubDate
      ? `<span class="finding-date">${formatDateTime(f.pubDate)}</span>`
      : '';
    card.innerHTML = `
      <div class="finding-head">
        <a class="finding-title" href="${escapeHtml(f.link)}" target="_blank" rel="noopener">${escapeHtml(f.title)}</a>
        ${dateHtml}
      </div>
      <div class="finding-body">${escapeHtml(f.summary)}</div>
      <div class="finding-foot">
        ${phoneHtml}
        <span class="finding-source">${escapeHtml(f.source)}</span>
        <span class="spacer"></span>
        <button class="secondary" data-action="import-construction" data-id="${f.id}">
          ${finder.importedLinks.has(f.link) ? 'Imported ✓' : '+ Add as Construction Lead'}
        </button>
        <button class="secondary" data-action="dismiss" data-id="${f.id}">Dismiss</button>
      </div>
    `;
    container.appendChild(card);
  }
}

function importFindingAsLead(findingId) {
  const f = finder.findings.find((x) => x.id === findingId);
  if (!f) return;
  if (finder.importedLinks.has(f.link)) {
    showToast('Already imported', 'error');
    return;
  }
  const lead = {
    id: uid(),
    createdAt: Date.now(),
    company: 'construction',
    status: 'new',
    name: f.title.slice(0, 80),
    phone: f.phone || '',
    email: '',
    source: f.source,
    address: '',
    service: f.title,
    value: null,
    notes: `${f.summary}\n\nSource: ${f.link}\nPosted: ${f.pubDate || 'unknown'}`,
    reminder: { type: 'call', when: null, note: 'Follow up on Craigslist lead' },
  };
  state.leads.push(lead);
  finder.importedLinks.add(f.link);
  saveState();
  saveFinder();
  render();
  renderFinder();
  showToast('Imported as new construction lead', 'success');
}

function dismissFinding(findingId) {
  finder.findings = finder.findings.filter((x) => x.id !== findingId);
  saveFinder();
  renderFinder();
}

function clearFindings() {
  if (!confirm('Clear all current findings? (Seen-post history is kept so dedup still works.)')) return;
  finder.findings = [];
  saveFinder();
  renderFinder();
}

// ---------- Events ----------
function initEvents() {
  // Company tabs
  document.querySelectorAll('.company-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.company-btn').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      state.filter.company = btn.dataset.company;
      render();
    });
  });

  // Search & filter
  document.getElementById('search').addEventListener('input', (e) => {
    state.filter.search = e.target.value;
    render();
  });
  document.getElementById('filter-status').addEventListener('change', (e) => {
    state.filter.status = e.target.value;
    render();
  });

  // Buttons
  document.getElementById('add-lead-btn').addEventListener('click', () => openLeadModal());
  document.getElementById('export-btn').addEventListener('click', exportData);
  document.getElementById('import-btn').addEventListener('click', () => {
    document.getElementById('import-file').click();
  });
  document.getElementById('import-file').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) importData(file);
    e.target.value = '';
  });

  // Lead modal
  document.getElementById('close-modal').addEventListener('click', closeLeadModal);
  document.getElementById('cancel-lead').addEventListener('click', closeLeadModal);
  document.getElementById('lead-form').addEventListener('submit', handleLeadSubmit);
  document.getElementById('delete-lead').addEventListener('click', () => {
    const id = document.getElementById('lead-id').value;
    if (!id) return;
    if (confirm('Delete this lead? This cannot be undone.')) {
      deleteLead(id);
      saveState();
      render();
      closeLeadModal();
      showToast('Lead deleted');
    }
  });
  document.getElementById('lead-modal').addEventListener('click', (e) => {
    if (e.target.id === 'lead-modal') closeLeadModal();
  });

  // Proposal modal
  document.getElementById('close-proposal').addEventListener('click', closeProposalModal);
  document.getElementById('cancel-proposal').addEventListener('click', closeProposalModal);
  document.getElementById('proposal-form').addEventListener('submit', handleProposalSubmit);
  document.getElementById('proposal-modal').addEventListener('click', (e) => {
    if (e.target.id === 'proposal-modal') closeProposalModal();
  });

  // Leads grid delegated actions
  document.getElementById('leads-grid').addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-action]');
    if (!btn) return;
    const id = btn.dataset.id;
    const action = btn.dataset.action;
    if (action === 'edit') openLeadModal(id);
    if (action === 'remind') openLeadModal(id);
    if (action === 'proposal') openProposalModal(id);
    if (action === 'appointment') {
      const lead = getLead(id);
      if (lead) {
        lead.status = 'appointment';
        if (!lead.reminder) lead.reminder = {};
        lead.reminder.type = 'appointment';
        saveState();
        openLeadModal(id);
      }
    }
  });

  // Reminders list delegated
  document.getElementById('reminders-list').addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-action]');
    if (!btn) return;
    const id = btn.dataset.id;
    const action = btn.dataset.action;
    if (action === 'open') openLeadModal(id);
    if (action === 'done') {
      const lead = getLead(id);
      if (lead && lead.reminder) {
        lead.reminder = { type: 'none', when: null, note: '' };
        saveState();
        render();
        showToast('Reminder cleared', 'success');
      }
    }
  });

  // Keyboard
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeLeadModal();
      closeProposalModal();
    }
  });

  // Lead Finder
  document.getElementById('finder-scan-now').addEventListener('click', () => {
    runScan();
  });
  document.getElementById('finder-toggle').addEventListener('click', () => {
    if (finder.running) stopContinuousScan();
    else startContinuousScan();
  });
  document.getElementById('finder-clear').addEventListener('click', clearFindings);
  document.getElementById('finder-results').addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-action]');
    if (!btn) return;
    const id = btn.dataset.id;
    if (btn.dataset.action === 'import-construction') importFindingAsLead(id);
    if (btn.dataset.action === 'dismiss') dismissFinding(id);
  });
  // Persist config on change so it survives a reload.
  ['finder-region', 'finder-zip', 'finder-radius', 'finder-max-age', 'finder-interval', 'finder-keywords']
    .forEach((id) => {
      document.getElementById(id).addEventListener('change', readFinderConfigFromUI);
    });
}

// ---------- Init ----------
function init() {
  loadState();
  loadFinder();
  initEvents();
  applyFinderConfigToUI();
  render();
  renderFinder();
  requestNotificationsIfNeeded();
  checkReminders();
  setInterval(() => {
    checkReminders();
    render();
    renderFinderMeta();
  }, 60000);
}

document.addEventListener('DOMContentLoaded', init);
