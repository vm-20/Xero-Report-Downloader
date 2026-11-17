// =====================================================================
// background.js — ENTRY POINT of the background "service worker".
// ---------------------------------------------------------------------
// Edge starts this file (see "background" in manifest.json). It only
// wires things together; the real work lives in background/:
//
//   config.js     settings (file names, timeouts)
//   runner.js     runs every report in order            <- main logic
//   tabs.js       open pages, wait, check client, run code in page
//   downloads.js  rename files + wait for downloads
//   state.js      progress shown in the popup
//   keepAlive.js  stops Edge putting the worker to sleep mid-run
//   log.js        console logging
// =====================================================================

import { runAll, isRunning } from './background/runner.js';
import { setState } from './background/state.js';
import { isOrgCode } from './shared/xero.js';
import './background/downloads.js'; // registers the file-rename listener at startup

// ---------- messages from popup.js ----------
// popup sends: { type: 'START', orgCode: '!9GDjK', orgName: 'Client name' | null }
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (sender.id !== chrome.runtime.id) return false; // only our own extension
  if (msg?.type !== 'START') return false;

  if (isRunning()) sendResponse({ started: false, reason: 'Already running' });
  else if (!isOrgCode(msg.orgCode)) sendResponse({ started: false, reason: 'No Xero client detected' });
  else {
    const orgName = typeof msg.orgName === 'string' ? msg.orgName.slice(0, 200) : null;
    runAll(msg.orgCode, orgName); // not awaited: the popup may close
    sendResponse({ started: true });
  }
  return false;
});

// Clear a stale "running" flag after Edge restarts or the extension reloads.
// (Skipped while a run is active, so it can never wipe live progress.)
const clearStale = () => { if (!isRunning()) setState({ running: false, current: null }); };
chrome.runtime.onStartup.addListener(clearStale);
chrome.runtime.onInstalled.addListener(clearStale);
