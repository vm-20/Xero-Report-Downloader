// =====================================================================
// BANK RECONCILIATION — LOOP REPORT
//   (recording did 3 banks by hand; this file does ALL banks)
// Date = "Last financial year", one Excel per bank account.
// File: "<Client> <Bank> Bank Reco FY26.xlsx"
// =====================================================================

export default {
  name: 'Bank Reconciliation',
  reportId: '1066', // from recording: reporting.xero.com/!9GDjK/v1/Run/1066
  fileName: '{client} {item} Bank Reconciliation FY{fy}',

  // ---- Step A: read all bank accounts (runs in the page) ----
  getItems: async () => {
    const XH = window.XeroHelpers;
    // Recording: click "aria/Open" (the arrow of the Bank Account box)
    const OPEN = [
      { css: '#report-settings div.xui-textinputwrapper button' },
      { aria: 'Open' },
    ];
    // Options have ids "Bank Account-selector-dropdown-text-0, -1, -2 ..."
    // The id has a SPACE, so we use [id^="..."] (id starts with) instead of #id.
    const OPTION_TEXT = '[id^="Bank Account-selector-dropdown-text-"] > div';

    await XH.waitFor([{ css: '#report-settings' }], { timeout: 30000, label: 'report settings' });
    return XH.listOptions(OPEN, OPTION_TEXT, { label: 'bank accounts' });
  },

  // ---- Step B: download ONE bank (runs in the page, once per bank) ----
  run: async (bank) => {
    const XH = window.XeroHelpers;
    const OPEN = [
      { css: '#report-settings div.xui-textinputwrapper button' },
      { aria: 'Open' },
    ];
    const OPTION_TEXT = '[id^="Bank Account-selector-dropdown-text-"] > div';

    return XH.runReport(`Bank Reconciliation – ${bank}`, async (step) => {
      await step('Wait for report settings panel', () =>
        XH.waitFor([{ css: '#report-settings' }], { timeout: 30000, label: 'report settings' }));

      // Date is set for every bank: harmless if already set, and safe after a reload.
      await step('Open date dropdown', () =>
        XH.click([
          { aria: 'List of convenience dates' },
          { css: '#report-settings .xui-dropdown--toggledwrapper button' },
        ], { label: 'date dropdown' }));

      await step('Select "Last financial year"', () =>
        XH.click([
          { text: 'Last financial year', selector: '[id^="report-settings-date-option-"]' },
          { css: '#report-settings-date-option-5 button' },
        ], { label: 'Last financial year' }));

      await step('Open bank account dropdown', () =>
        XH.click(OPEN, { label: 'bank account dropdown' }));

      await step(`Select bank "${bank}"`, () =>
        XH.click([{ text: bank, selector: OPTION_TEXT }], { label: bank }));

      // Safety: the account box should now show this bank (warn only).
      await step('Check bank selected', () =>
        XH.expectText([{ css: '#report-settings div.xui-textinputwrapper input' },
                       { css: '#report-settings div.xui-textinputwrapper' }], bank, { label: 'bank account' })
          .catch((e) => XH.warn('bank name not confirmed:', e.message)));

      await step('Click Update', () =>
        XH.click([{ text: 'Update', selector: '#report-settings button' }, { aria: 'Update' }],
          { label: 'Update' }));
      await step('Wait for report to reload', () => XH.waitForReportReady());

      await step('Open Export menu', () =>
        XH.click([{ text: 'Export', selector: '#report-toolbar button' }, { aria: 'Export' }],
          { label: 'Export' }));
      await step('Click PDF', () =>
        XH.click([
          { css: '#report-toolbar-export-pdf-menuitem button' },
          { css: '#report-toolbar-export-pdf-menuitem' },
          { text: 'PDF', selector: '[role="menuitem"], [id$="-pdf-menuitem"] button' },
        ], { label: 'PDF' }));
    });
  },
};
