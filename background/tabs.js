// =====================================================================
// background/tabs.js — everything about the automation TAB:
//   open it, go to a URL, wait for pages, check the client,
//   read the client name, run report code inside the page.
// =====================================================================

import { CONFIG } from './config.js';
import { log, warn } from './log.js';
import { getOrgCodeFromUrl, getOrgNameFromTitle } from '../shared/xero.js';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Reject if `promise` takes longer than `ms`.
export const withTimeout = (promise, ms, what) =>
  Promise.race([promise, new Promise((_, rej) => setTimeout(() => rej(new Error(`${what} timed out after ${ms} ms`)), ms))]);

// Open the tab (or window) used for the whole run. Returns { tabId, windowId }.
export async function openWorkTab() {
  if (CONFIG.openInNewWindow) {
    const win = await chrome.windows.create({ url: 'about:blank', focused: true, state: 'maximized' });
    return { tabId: win.tabs[0].id, windowId: win.id };
  }
  const tab = await chrome.tabs.create({ url: 'about:blank', active: true });
  return { tabId: tab.id, windowId: null };
}

// If the user closed our tab, open a new one so the run can continue.
export async function ensureTab(work) {
  try {
    await chrome.tabs.get(work.tabId);
  } catch {
    warn('automation tab was closed — opening a new one');
    Object.assign(work, await openWorkTab());
  }
}

// Wait for the tab's NEXT page load (status "loading" then "complete").
// Arm it BEFORE the click that changes page. Returns { promise, cancel }.
export function waitForNextLoad(tabId, timeoutMs = CONFIG.pageLoadTimeoutMs) {
  let listener, timer;
  const cancel = () => { chrome.tabs.onUpdated.removeListener(listener); clearTimeout(timer); };
  const promise = new Promise((resolve, reject) => {
    let sawLoading = false;
    listener = (id, info, tab) => {
      if (id !== tabId) return;
      if (info.status === 'loading') sawLoading = true;
      if (info.status === 'complete' && sawLoading) { cancel(); resolve(tab); }
    };
    chrome.tabs.onUpdated.addListener(listener);
    timer = setTimeout(() => { cancel(); reject(new Error(`Next page did not load within ${timeoutMs} ms`)); }, timeoutMs);
  });
  return { promise, cancel };
}

// Open a URL in our tab, make it the visible tab, wait for load.
export async function navigate(tabId, url) {
  log(`navigating to ${url}`);
  const next = waitForNextLoad(tabId);
  try {
    await chrome.tabs.update(tabId, { url, active: true });
    await next.promise;
  } catch (e) {
    next.cancel();
    throw new Error(`Could not open page: ${e.message}`);
  }
  const tab = await chrome.tabs.get(tabId);
  log(`loaded: ${tab.url} | ${tab.title}`);
  return tab;
}

// Safety: still logged in, and still the SAME client we started with?
// Pages without a client code / name in URL or title are not blocked here
// (multi-page reports check the client name on the page instead).
export function checkClient(tab, run) {
  if (/login\.xero\.com|identity\.xero\.com/i.test(tab.url)) {
    throw new Error('Not logged in to Xero. Log in, then run again.');
  }
  const codeNow = getOrgCodeFromUrl(tab.url);
  if (codeNow && codeNow !== run.orgCode) throw new Error(`Wrong client: expected ${run.orgCode}, got ${codeNow}`);
  const nameNow = getOrgNameFromTitle(tab.title);
  if (nameNow && run.orgName && nameNow !== run.orgName) {
    throw new Error(`Wrong client: expected "${run.orgName}", page shows "${nameNow}"`);
  }
}

// Read the client NAME from the tab title. Xero fills the title a moment
// AFTER the page loads, so we keep checking for up to CONFIG.orgNameWaitMs.
export async function readOrgName(tabId) {
  const end = Date.now() + CONFIG.orgNameWaitMs;
  while (Date.now() < end) {
    const tab = await chrome.tabs.get(tabId);
    const name = getOrgNameFromTitle(tab.title);
    if (name) return name;
    await sleep(300);
  }
  return null;
}

// Inject helpers, then run a function from a report file inside the page.
// `args` must be plain values (text, numbers, simple objects).
export async function runInPage(tabId, func, args = []) {
  await chrome.scripting.executeScript({ target: { tabId }, files: ['content/helpers.js'] });
  const [injection] = await withTimeout(
    chrome.scripting.executeScript({ target: { tabId }, func, args }),
    CONFIG.scriptTimeoutMs, 'Report steps');
  return injection?.result;
}
