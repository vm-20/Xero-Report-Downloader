// =====================================================================
// shared/xero.js — small "pure" functions used by popup.js AND background/
// Pure = no chrome.* calls, no page access. Input -> output only,
// so they are easy to test and safe to import anywhere.
// =====================================================================

// Client code: starts with "!" and appears in Xero URLs, e.g.
//   https://reporting.xero.com/!9GDjK/v1/Run/1016
//   https://go.xero.com/app/!9GDjK/homepage
export function getOrgCodeFromUrl(url) {
  if (!url || !/^https:\/\/[^/]*\.xero\.com\//i.test(url)) return null; // not Xero
  const m = url.match(/\/(![A-Za-z0-9_-]+)(?=[/?#]|$)/);
  return m ? m[1] : null;
}

// A valid client code looks like "!9GDjK" (used to reject bad messages).
export const isOrgCode = (s) => typeof s === 'string' && /^![A-Za-z0-9_-]{2,20}$/.test(s);

// Client NAME from the tab title. Xero uses two title styles:
//   new reports : "Xero | Balance Sheet | Nicholas Playfair Investments"   -> last part
//   go.xero.com : "Homepage – Nicholas Playfair Investments – Xero"        -> middle part
// Returns null when the title is empty or in another format.
export function getOrgNameFromTitle(title) {
  const t = (title || '').trim();
  const pipe = t.split('|').map((s) => s.trim()).filter(Boolean);
  if (pipe.length >= 3 && /^xero$/i.test(pipe[0])) return pipe[pipe.length - 1];
  const dash = t.split(' – ').map((s) => s.trim()).filter(Boolean); // en dash " – "
  if (dash.length >= 3 && /^xero$/i.test(dash[dash.length - 1])) return dash.slice(1, -1).join(' – ');
  return null;
}

// URL to open for a report, for ANY client.
//   report.url      -> full URL with {orgCode}
//   report.reportId -> https://reporting.xero.com/<org>/v1/Run/<id>
export function getReportUrl(report, orgCode) {
  if (report.url) return report.url.replace(/\{orgCode\}/g, orgCode);
  if (report.reportId) return `https://reporting.xero.com/${orgCode}/v1/Run/${report.reportId}`;
  throw new Error(`"${report.name}" has no url or reportId`);
}

// Last completed Australian FY (1 Jul – 30 Jun). In Nov 2026 -> "26".
export function lastFinancialYear(date = new Date()) {
  const endYear = date.getMonth() >= 6 ? date.getFullYear() : date.getFullYear() - 1; // month 6 = July
  return String(endYear).slice(-2);
}

// FY "26" -> { fyStart: "1 Jul 2025", fyEnd: "30 Jun 2026" }  (Xero's date style)
export function fyDates(fy) {
  const end = 2000 + Number(fy);
  return { fyStart: `1 Jul ${end - 1}`, fyEnd: `30 Jun ${end}` };
}

// "{client} {item} Bank Reco FY{fy}" + values -> final text
export function fillTemplate(template, values) {
  return template.replace(/\{(\w+)\}/g, (_, k) => values[k] ?? '').replace(/\s+/g, ' ').trim();
}

// Windows does not allow \ / : * ? " < > | in file names.
export function safeName(s) {
  return (s || '').replace(/[\\/:*?"<>|]+/g, '-').replace(/\s+/g, ' ').trim().slice(0, 120);
}
