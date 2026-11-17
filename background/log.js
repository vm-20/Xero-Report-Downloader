// =====================================================================
// background/log.js — console logging for the background worker.
// See these in edge://extensions -> "service worker" link -> Console.
// =====================================================================

const TAG = '[XeroExt]';
export const log = (...a) => console.log(TAG, ...a);
export const warn = (...a) => console.warn(TAG, ...a);
export const err = (...a) => console.error(TAG, ...a);
