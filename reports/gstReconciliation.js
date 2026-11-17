// =====================================================================
// GST RECONCILIATION — MULTI-PAGE REPORT
// ---------------------------------------------------------------------
// This report has no fixed URL (its link contains ids that change), so we
// go to "All reports", search for it and click it — like you did.
//
// It moves across 3 pages. A page change stops any running script, so the
// work is split into `pages`: background runs page 1, waits for the next
// page to load, runs page 2, and so on.
//   Page 1  All reports      : search "GST Reconciliation" -> click it
//   Page 2  GST report       : type From / To dates -> Update (page reloads)
//   Page 3  GST report again : check dates + client name -> Export -> Excel
//
// Dates: ctx.fyStart / ctx.fyEnd = last financial year (e.g. 1 Jul 2025 –
// 30 Jun 2026). Change FROM / TO below if you need another period.
// =====================================================================

export default {
  name: 'GST Reconciliation',
  // "All reports" page (recording step 3 went here). {orgCode} = this client.
  url: 'https://reporting.xero.com/{orgCode}',

  pages: [
    // ---------- Page 1: All reports -> find and open GST Reconciliation ----------
    async () => {
      const XH = window.XeroHelpers;
      return XH.runReport('GST Reconciliation – find report', async (step) => {
        await step('Type in "Find a report"', () =>
          XH.type([
            { aria: 'Find a report' },
            { css: 'input[placeholder*="Find a report" i]' },
          ], 'GST Reconciliation', { label: 'Find a report', timeout: 30000, after: 1200 }));

        // Exact title text first (so we don't hit "GST" descriptions), then any item containing it.
        await step('Click "GST Reconciliation"', () =>
          XH.clickAndLeave([
            { text: 'GST Reconciliation', selector: '.xui-pickitem--text, .xui-pickitem--primary, a' },
            { text: 'GST Reconciliation', selector: 'li button' },
          ], { label: 'GST Reconciliation' }));
      });
    },

    // ---------- Page 2: set dates -> Update ----------
    async (_item, ctx) => {
      const XH = window.XeroHelpers;
      const FROM = ctx.fyStart; // e.g. "1 Jul 2025"
      const TO = ctx.fyEnd;     // e.g. "30 Jun 2026"
      return XH.runReport('GST Reconciliation – dates', async (step) => {
        await step(`Set From = ${FROM}`, () =>
          XH.type([{ css: '#fromDate' }], FROM, { label: 'From date', timeout: 30000, blur: true }));
        await step(`Set To = ${TO}`, () =>
          XH.type([{ css: '#toDate' }], TO, { label: 'To date', blur: true }));
        await step('Click Update (reloads page)', () =>
          XH.clickAndLeave([
            { aria: 'Update' },
            { text: 'Update', selector: 'button, a, input[type="button"]' },
          ], { label: 'Update' }));
      });
    },

    // ---------- Page 3: verify -> Export -> Excel ----------
    async (_item, ctx) => {
      const XH = window.XeroHelpers;
      return XH.runReport('GST Reconciliation – export', async (step) => {
        // Accuracy checks before exporting: right period, right client.
        await step('Check From date', () =>
          XH.expectDate([{ css: '#fromDate' }], ctx.fyStart, { label: 'From', timeout: 30000 }));
        await step('Check To date', () =>
          XH.expectDate([{ css: '#toDate' }], ctx.fyEnd, { label: 'To' }));
        if (ctx.orgName) {
          await step('Check client name on report', () =>
            XH.expectPageText(ctx.orgName, { label: '(wrong client?)' }));
        }

        await step('Open Export menu', () =>
          XH.click([
            { text: 'Export', selector: 'dt > span' }, // recorded target; click bubbles up to <dt>
            { text: 'Export', selector: 'dt' },
            { aria: 'Export' },
          ], { label: 'Export' }));
        await step('Click Excel', () =>
          XH.click([
            { text: 'Excel', selector: '#frmMain li a' },
            { aria: 'Excel' },
            { text: 'Excel', selector: 'li a' },
          ], { label: 'Excel' }));
      });
    },
  ],
};
