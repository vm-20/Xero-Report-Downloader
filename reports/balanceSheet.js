// =====================================================================
// Date = End of last financial year, Compare with = None, Export = Excel
// ---------------------------------------------------------------------
// FIELDS a report file can have:
//   name      shown in popup + logs                          (required)
//   reportId  number after /v1/Run/ in the recording URL     (this OR url)
//   url       full URL with {orgCode} for other page types   (this OR reportId)
//   fileName  optional template, overrides CONFIG in background/config.js
//             tokens: {xeroName} {report} {item} {client} {fy} {date}
//   run       the clicks, executed INSIDE the Xero page      (this OR pages)
//   pages     list of run-functions, one per PAGE, for reports that move
//             across pages (see gstReconciliation.js)
//   getItems  optional — LOOP reports (see bankReconciliation.js)
//
// run(item, ctx) receives:
//   item -> loop item (e.g. bank name) or null
//   ctx  -> { orgCode, orgName, fy, fyStart, fyEnd }
// =====================================================================

export default {
  name: 'Balance Sheet',
  fileName: '{client} Balance Sheet FY{fy}',
  reportId: '1017',

  // run() is copied into the Xero page: it can ONLY use window.XeroHelpers
  // and its arguments — not variables from this file.
  run: async () => {
    const XH = window.XeroHelpers;
    return XH.runReport('Balance Sheet', async (step) => {
      await step('Wait for report settings panel', () =>
        XH.waitFor([{ css: '#report-settings' }], { timeout: 30000, label: 'report settings' }));

      await step('Open date dropdown', () =>
        XH.click([
          { aria: 'List of convenience dates' },
          { css: '#report-settings .xui-dropdown--toggledwrapper button' },
        ], { label: 'date dropdown' }));

      // Text first: "option-4" can change, the text won't.
      await step('Select "End of last financial year"', () =>
        XH.click([
          { text: 'End of last financial year', selector: '[id^="report-settings-date-option-"]' },
          { css: '#report-settings-date-option-4 button' },
        ], { label: 'End of last financial year' }));

      await step('Open "Compare with"', () =>
        XH.click([{ css: '#report-settings-comparison-period-button' }, { aria: 'Compare with' }],
          { label: 'Compare with' }));

      await step('Select comparison "1 year"', () =>
        XH.click([
          { text: '1 year', selector: '[id^="comparison-period-selection-"]' },
          { css: '#comparison-period-selection-1--body' },
        ], { label: '1 year' }));

      await step('Verify Compare with = 1 year', () =>
        XH.expectText([{ css: '#report-settings-comparison-period-button' }], '1 year', { label: 'compare' }));

      await step('Click Update', () =>
        XH.click([{ text: 'Update', selector: '#report-settings button' }, { aria: 'Update' }],
          { label: 'Update' }));

      await step('Wait for report to reload', () => XH.waitForReportReady());

      await step('Open Export menu', () =>
        XH.click([{ text: 'Export', selector: '#report-toolbar button' }, { aria: 'Export' }],
          { label: 'Export' }));

      await step('Click Excel', () =>
        XH.click([
          { css: '#report-toolbar-export-excel-menuitem button' },
          { css: '#report-toolbar-export-excel-menuitem' },
          { text: 'Excel', selector: '[role="menuitem"], [id$="-excel-menuitem"] button' },
        ], { label: 'Excel' }));
    });
  },
};
