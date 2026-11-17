// =====================================================================
// background/downloads.js — rename each report file + wait for it.
// ---------------------------------------------------------------------
// How renaming works:
//   1. Before the Excel click, runner.js calls expectDownload({...})
//      saying which folder / name template / values to use.
//   2. Xero starts the download. Edge asks every extension "what file
//      name?" -> onDeterminingFilename below. item.filename is the name
//      Xero suggested; that becomes {xeroName}.
//   3. We fill the template, e.g. "{client} {item} Bank Reco FY{fy}"
//      -> "Nicholas Playfair Investments CC - NP Invest Bank Reco FY26.xlsx"
//   4. Downloads that start when we are NOT expecting one keep their
//      normal name (your own manual downloads are never touched).
// =====================================================================

import { CONFIG } from './config.js';
import { log } from './log.js';
import { fillTemplate, safeName } from '../shared/xero.js';

let pending = null; // { folder, template, values, xeroName } while a report exports

export function expectDownload(info) { pending = { ...info, xeroName: '' }; }
export function clearExpectedDownload() { pending = null; }

// Registered once, when the service worker starts (top-level code).
chrome.downloads.onDeterminingFilename.addListener((item, suggest) => {
  if (!pending) return suggest(); // not ours: keep Edge's default
  const original = item.filename.split(/[\\/]/).pop();
  const ext = (original.match(/\.[a-z0-9]+$/i) || ['.xlsx'])[0];
  const xeroName = original.slice(0, original.length - ext.length);
  pending.xeroName = xeroName;
  const name = safeName(fillTemplate(pending.template, { ...pending.values, xeroName })) || xeroName;
  const filename = `${pending.folder}/${name}${ext}`;
  log(`Xero file "${original}" -> saving as "${filename}"`);
  suggest({ filename, conflictAction: 'uniquify' }); // never overwrite: adds (1)
});

// Arm BEFORE the Excel click. promise resolves { path, xeroName } when saved.
export function waitForDownload() {
  let id = null, onCreated, onChanged, startTimer, finishTimer;
  const cancel = () => {
    chrome.downloads.onCreated.removeListener(onCreated);
    chrome.downloads.onChanged.removeListener(onChanged);
    clearTimeout(startTimer); clearTimeout(finishTimer);
  };
  const promise = new Promise((resolve, reject) => {
    onCreated = (item) => {
      if (id !== null) return; // only track the first one
      id = item.id;
      clearTimeout(startTimer);
      log(`download started id=${id}`);
      finishTimer = setTimeout(() => { cancel(); reject(new Error('Download did not finish in time')); },
        CONFIG.downloadFinishTimeoutMs);
    };
    onChanged = async (d) => {
      if (d.id !== id || !d.state) return;
      if (d.state.current === 'complete') {
        const [item] = await chrome.downloads.search({ id });
        cancel();
        resolve({ path: item?.filename || '', xeroName: pending?.xeroName || '' });
      } else if (d.state.current === 'interrupted') {
        cancel();
        reject(new Error(`Download interrupted: ${d.error?.current || 'unknown'}`));
      }
    };
    chrome.downloads.onCreated.addListener(onCreated);
    chrome.downloads.onChanged.addListener(onChanged);
    startTimer = setTimeout(() => { cancel(); reject(new Error('No download started after clicking export')); },
      CONFIG.downloadStartTimeoutMs);
  });
  return { promise, cancel };
}
