// =====================================================================
// background/config.js — ALL settings in one place. Safe to change.
// =====================================================================

export const CONFIG = {
  // ---- File names ----
  // Tokens: {xeroName} Xero's own file name, {report} report name,
  //         {item} loop item (e.g. bank), {client} client name,
  //         {fy} e.g. 26, {date} yyyy-mm-dd
  fileNameTemplate: '{xeroName} FY{fy}',                   // normal reports
  itemFileNameTemplate: '{client} {item} {report} FY{fy}', // loop reports without their own fileName
  fyOverride: null,               // e.g. '25' to force FY25; null = automatic (last completed FY)
  downloadFolder: 'Xero Reports', // Downloads/Xero Reports/<Client>/<date>/

  // ---- Tab ----
  // false = new TAB in your current window (recommended).
  // true  = separate window (Xero dropdowns can fail if it gets hidden).
  openInNewWindow: false,
  closeWhenDone: false,

  // ---- Timeouts (milliseconds) ----
  pageLoadTimeoutMs: 60000,        // a page must load within this
  scriptTimeoutMs: 120000,         // one page's clicks must finish within this
  downloadStartTimeoutMs: 60000,   // after the Excel click, the download must start
  downloadFinishTimeoutMs: 120000, // ...and finish
  orgNameWaitMs: 10000,            // how long to wait for Xero to show the client name in the title
};
