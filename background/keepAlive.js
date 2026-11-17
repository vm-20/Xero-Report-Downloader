// =====================================================================
// background/keepAlive.js — Edge stops an idle service worker after ~30 s.
// A tiny API call every 20 s keeps it awake while a run is going.
// =====================================================================

let timer = null;

export function startKeepAlive() {
  timer = setInterval(() => chrome.runtime.getPlatformInfo(() => {}), 20000);
}

export function stopKeepAlive() {
  clearInterval(timer);
  timer = null;
}
