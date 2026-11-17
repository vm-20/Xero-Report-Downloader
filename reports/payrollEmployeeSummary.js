// =====================================================================
// Date = Last financial year, Compare with = None, Export = Excel
// Field explanations: see balanceSheet.js
// =====================================================================

export default {
  name: 'Payroll Employee Summary',
  reportId: '2031',
  fileName: "{client} Payroll Employee Summary FY{fy}",

  run: async () => {
    const XH = window.XeroHelpers;
    return XH.runReport('Payroll Employee Summary', async (step) => {
      await step('Wait for report settings panel', () =>
        XH.waitFor([{ css: '#report-settings' }], { timeout: 30000, label: 'report settings' }));

      await step('Open date dropdown', () =>
        XH.click([
          { aria: 'List of convenience dates' },
          { css: '#report-settings-convenience-date-dropdown-button' },
        ], { label: 'date dropdown' }));

      await step('Select "Last financial year"', () =>
        XH.click([
          { text: 'Last financial year', selector: '[data-automationid^="report-settings-date-option-Last financial year"]' },
          { css: '#report-settings-date-option-Last financial year--body' },
        ], { label: 'Last financial year' }));

    //   await step('Open "Compare with"', () =>
    //     XH.click([{ css: '#report-settings-comparison-period-button' }, { aria: 'Compare with' }],
    //       { label: 'Compare with' }));

    //   await step('Select comparison "None"', () =>
    //     XH.click([
    //       { text: 'None', selector: '[id^="comparison-period-selection-"]' },
    //       { css: '#comparison-period-selection-0 button' },
    //     ], { label: 'None' }));

    //   await step('Verify Compare with = None', () =>
    //     XH.expectText([{ css: '#report-settings-comparison-period-button' }], 'None', { label: 'compare' }));

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
