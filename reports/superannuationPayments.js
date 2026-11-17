// =====================================================================
// PROFIT AND LOSS
// Settings  : Date = Last financial year, Compare with = None,
//             Export = Excel
// See balanceSheet.js for a full explanation of each field.
// =====================================================================

export default {
  name: 'superannuation payments',
  fileName: '{client} Superannuation Payments FY{fy}',
  reportId: '2017', // from recording: https://reporting.xero.com/!9GDjK/v1/Run/2017

  run: async () => {
    const XH = window.XeroHelpers;

    return XH.runReport('superannuation payments', async (step) => {
      await step('Wait for report settings panel', () =>
        XH.waitFor([{ css: '#report-settings' }], { timeout: 30000, label: 'report settings' }));

      await step('Open date dropdown', () =>
        XH.click([
          { aria: 'List of convenience dates' },
          { css: '#report-settings .xui-dropdown--toggledwrapper button' },
        ], { label: 'date dropdown' }));

      // Recording: #report-settings-date-option-5 / text "Last financial"
      await step('Select "Last financial year"', () =>
        XH.click([
          { text: 'Last financial year', selector: '[id^="report-settings-date-option-"]' },
          { css: '#report-settings-date-option-5 button' },
        ], { label: 'Last financial year' }));

    //   await step('Open "Compare with"', () =>
    //     XH.click([
    //       { css: '#report-settings-comparison-period-button' },
    //       { aria: 'Compare with' },
    //     ], { label: 'Compare with' }));

    //   await step('Select comparison "None"', () =>
    //     XH.click([
    //       { text: 'None', selector: '[id^="comparison-period-selection-"]' },
    //       { css: '#comparison-period-selection-0 button' },
    //     ], { label: 'None' }));

    //   await step('Verify Compare with = None', () =>
    //     XH.expectText([{ css: '#report-settings-comparison-period-button' }], 'None', { label: 'compare' }));

      await step('Click Update', () =>
        XH.click([
          { text: 'Update', selector: '#report-settings button' },
          { aria: 'Update' },
        ], { label: 'Update' }));

      await step('Wait for report to reload', () => XH.waitForReportReady());

      await step('Open Export menu', () =>
        XH.click([
          { text: 'Export', selector: '#report-toolbar button' },
          { aria: 'Export' },
        ], { label: 'Export' }));

      await step('Click Excel', () =>
        XH.click([
          { css: '#report-toolbar-export-excel-menuitem button' },
          { css: '#report-toolbar-export-excel-menuitem' },
          { text: 'Excel', selector: '[role="menuitem"], [id$="-excel-menuitem"] button' },
        ], { label: 'Excel' }));
    });
  },
};
