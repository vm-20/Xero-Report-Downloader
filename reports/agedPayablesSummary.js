// =====================================================================
// AGED PAYABLES SUMMARY
// REVIEW before use. Field explanations: see balanceSheet.js
// =====================================================================

export default {
  name: "Aged Payables Summary",
  reportId: "1400",
  fileName: "{client} Aged Payables Summary FY{fy}",

  run: async (item, ctx) => {
    const XH = window.XeroHelpers;
    return XH.runReport("Aged Payables Summary", async (step) => {
      // Step 1: page opened by background.js -> https://reporting.xero.com/!HqKw7/v1/Run/1400
      await step('Wait for page', () =>
        XH.waitFor([{ css: "#report-settings" }], { timeout: 30000, label: 'page ready' }));
      // Step 2: click List of convenience dates

      // Step 4: click #report-settings > div > div > div:nth-of-type(2) div
      await step("Click #report-settings > div > div > div:nth-of-type(2) div", () =>
        XH.click([
          {"css": "#report-settings > div > div > div:nth-of-type(2) div"},
        ], { label: "#report-settings > div > div > div:nth-of-type(2) div", timeout: 30000 }));
      // Step 5: click div.xui-portal div:nth-of-type(1) > div.xui-textinput  (REVIEW: click on a plain area — probably not needed)
      await step("Click div.xui-portal div:nth-of-type(1) > div.xui-textinput", () =>
        XH.click([
          {"css": "div.xui-portal div:nth-of-type(1) > div.xui-textinput"},
        ], { label: "div.xui-portal div:nth-of-type(1) > div.xui-textinput", timeout: 30000 }));
      // Step 6: click Ageing Periods
      // await step("Click Ageing Periods", () =>
      //   XH.click([
      //     {"aria": "Ageing Periods"},
      //     {"css": "#bWxAGB4mPR"},
      //   ], { label: "Ageing Periods", timeout: 30000 }));
      // Step 7: doubleClick Ageing Periods
      await step("Click Ageing Periods", () =>
        XH.click([
          {"aria": "Ageing Periods"},
          {"css": '[data-automationid^="report-settings-ageing-periods-modal-periodCount--input"]'},
        ], { label: "Ageing Periods", timeout: 30000 }));
      // Step 8: type "4" in Ageing Periods
      await step("Set Ageing Periods = 4", () =>
        XH.type([
          {"aria": "Ageing Periods"},
          {"css": '[data-automationid^="report-settings-ageing-periods-modal-periodCount--input"]'},
        ], "4", { label: "Ageing Periods", timeout: 30000 }));
      // Step 9: doubleClick periods of
      await step("Click periods of", () =>
        XH.click([
          {"aria": "periods of"},
          {"css": "#report-settings-ageing-periods-modal-periodFrequency--input"},
        ], { label: "periods of", timeout: 30000 }));
      // Step 10: type "12" in periods of
      await step("Set periods of = 12", () =>
        XH.type([
          {"aria": "periods of"},
          {"css": "#report-settings-ageing-periods-modal-periodFrequency--input"},
        ], "12", { label: "periods of", timeout: 30000 }));
      // Step 11: click Apply
      await step("Click Apply", () =>
        XH.click([
          {"aria": "Apply"},
          {"text": "Apply"},
          {"css": "div.xui-portal button.xui-button-primary"},
        ], { label: "Apply", timeout: 30000 }));
      await step('Wait for report to reload', () => XH.waitForReportReady());



      await step('Open Columns dropdown', () =>
        XH.click([
          { aria: 'Columns' },
          { css: '#report-settings-columns-button' },
        ], { label: 'Columns' }));

      await step('Select "Outstanding GST"', () =>
        XH.click([
          { css: 'li[data-automationid="column-selection-taxamountdue"] [data-automationid="column-selection-taxamountdue--body"]' },
      ], { label: 'Outstanding GST' }));

      // await step('Select "Outstanding GST"', () =>
      //   XH.click([
      //     { text: 'Outstanding GST', selector: '[data-automationid^="column-selection-taxamountdue--body--checkbox--input"]' },
      //     { css: '#column-selection-taxamountdue--body--checkbox--input' },
      //   ], { label: 'Outstanding GST' }));
      

      await step('Open date dropdown', () =>
        XH.click([
          { aria: 'List of convenience dates' },
          { css: '#report-settings-convenience-date-dropdown-button' },
        ], { label: 'date dropdown' }));

      await step('Select "End of last financial year"', () =>
        XH.click([
          { text: 'End of last financial year', selector: '[data-automationid^="report-settings-date-option-End of last financial year--body"]' },
          { css: '#report-settings-date-option-End of last financial year--body' },
        ], { label: 'End of last financial year' }));


      // Step 12: click Update
      await step("Click Update", () =>
        XH.click([
          {"aria": "Update"},
          {"text": "Update"},
          {"css": "div.xui-u-flex-justify-end > button"},
        ], { label: "Update", timeout: 30000 }));
      await step('Wait for report to reload', () => XH.waitForReportReady());
      // Step 13: click Export
      await step("Click Export", () =>
        XH.click([
          {"aria": "Export"},
          {"css": "#page-toolbar div:nth-of-type(2) > button"},
          {"text": "Export"},
        ], { label: "Export", timeout: 30000 }));
      // Step 14: click PDF
      await step("Click PDF", () =>
        XH.click([
          {"aria": "PDF"},
          {"css": "#report-toolbar-export-pdf-menuitem span"},
        ], { label: "PDF", timeout: 30000 }));
      // Step 15: skipped (edge://downloads-hub/) — background tracks the download
    });
  },
};
