// =====================================================================
// popup.js — the UI. Lives ONLY while the popup is open.
// 1. Reads the client code (+ name if the title shows it) from your tab.
// 2. Button -> sends START to background.js (which does the work).
// 3. Draws progress from chrome.storage.session (written by background/state.js).
// Only textContent is used (never innerHTML) so names can't inject HTML.
// Status is shown with coloured dots + text badges (styles in popup.html).
// =====================================================================

import { getOrgCodeFromUrl, getOrgNameFromTitle } from './shared/xero.js';

// Text shown in the badge for each status
const LABEL = { pending: 'Pending', running: 'Running', success: 'Done', failed: 'Failed', partial: 'Partial' };
const $ = (id) => document.getElementById(id);
let detected = null; // { orgCode, orgName }

// Small helper: create an element with a class and text
function el(tag, className, text) {
  const e = document.createElement(tag);
  if (className) e.className = className;
  if (text != null) e.textContent = text;
  return e;
}

// ---------- 1. Detect client ----------
async function detectClient() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const orgCode = getOrgCodeFromUrl(tab?.url);
  if (!orgCode) {
    detected = null;
    $('client').className = 'bad';
    $('clientName').textContent = 'No Xero client detected';
    $('clientCode').textContent = 'Open the client in Xero, then click the extension again.';
    return;
  }
  detected = { orgCode, orgName: getOrgNameFromTitle(tab.title) };
  $('client').className = '';
  $('clientName').textContent = detected.orgName || 'Client name will be read when the run starts';
  $('clientCode').textContent = `Organisation code: ${orgCode}`;
}

// ---------- One row for a report or a loop item ----------
function row(r) {
  const li = el('li', `s-${r.status || 'pending'}`);

  const line = el('div', 'row');
  line.append(el('span', 'dot'), el('span', 'name', r.name));
  if (r.name) line.lastChild.title = r.name; // full name on hover if cut off
  if (r.secs) line.append(el('span', 'secs', `${r.secs}s`));
  line.append(el('span', 'badge', LABEL[r.status] || 'Pending'));
  li.append(line);

  if (r.path) {
    const f = el('div', 'file', r.path.split(/[\\/]/).pop());
    f.title = `Xero name: ${r.xeroName}\n${r.path}`;
    li.append(f);
  }
  if (r.error) li.append(el('div', 'err', r.error));

  if (r.items?.length) {
    const ul = el('ul', 'items');
    r.items.forEach((it) => ul.append(row(it)));
    li.append(ul);
  }
  return li;
}

// Show/hide a message box with a style
function message(id, text, kind = '') {
  $(id).textContent = text || '';
  $(id).className = `msg ${kind} ${text ? 'show' : ''}`;
}

// ---------- 3. Draw progress ----------
function render(state) {
  const results = state?.results || [];
  const finished = (s) => ['success', 'failed', 'partial'].includes(s);
  const done = results.filter((r) => finished(r.status)).length;
  const ok = results.filter((r) => r.status === 'success').length;
  const pct = results.length ? Math.round((done / results.length) * 100) : 0;

  $('start').disabled = !!state?.running || !detected;
  $('start').textContent = state?.running ? 'Downloading reports...' : 'Download All Reports';
  $('count').textContent = results.length ? `${done} of ${results.length}` : '';
  $('fill').style.width = `${pct}%`;
  $('bar').setAttribute('aria-valuenow', String(pct));
  $('list').replaceChildren(...results.map(row));
  message('warning', state?.warning);

  const who = state?.orgName || state?.orgCode || '';
  if (state?.fatalError) {
    message('summary', `Stopped: ${state.fatalError}`, 'bad');
  } else if (!state?.running && state?.finishedAt) {
    if (ok === results.length) message('summary', `${who} FY${state.fy}: all ${ok} reports downloaded.`, 'ok');
    else message('summary', `${who} FY${state.fy}: ${ok} of ${results.length} completed. Review the items marked Failed or Partial.`, 'bad');
  } else if (state?.running) {
    message('summary', `Working on: ${state.current || 'starting'}`, 'info');
  } else {
    message('summary', '');
  }
}

// ---------- 2. Start ----------
$('start').addEventListener('click', async () => {
  await detectClient();
  if (!detected) return;
  const res = await chrome.runtime.sendMessage({ type: 'START', ...detected });
  if (!res?.started) message('summary', res?.reason || 'Could not start', 'bad');
});

// background writes progress -> this fires -> redraw
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'session' && changes.runState) render(changes.runState.newValue);
});

$('version').textContent = `v${chrome.runtime.getManifest().version}`;
await detectClient();
render((await chrome.storage.session.get('runState')).runState);
