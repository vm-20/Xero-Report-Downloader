// =====================================================================
// ACCOUNT TRANSACTIONS
// REVIEW before use. Field explanations: see balanceSheet.js
// =====================================================================

export default {
  name: "Account Transactions",
  reportId: "1009",
  fileName: "{client} Account Transactions FY{fy}",

  run: async (item, ctx) => {
    const XH = window.XeroHelpers;
    return XH.runReport("Account Transactions", async (step) => {
      // Step 1: page opened by background.js -> https://reporting.xero.com/!HqKw7/v1/Run/1009
      await step('Wait for page', () =>
        XH.waitFor([{ css: "#report-settings" }], { timeout: 30000, label: 'page ready' }));
      // Step 2: click Open
      await step("Click Open", () =>
        XH.click([
          {"aria": "Open"},
          {"css": "div.xui-textinputwrapper > div div"},
        ], { label: "Open", timeout: 30000 }));
      // Step 3: click Select all
      await step("Click Select all", () =>
        XH.click([
          {"aria": "Select all"},
          {"css": "#select-all span"},
          {"text": "Select all"},
        ], { label: "Select all", timeout: 30000 }));
      // Step 4: click List of convenience dates
      await step("Click List of convenience dates", () =>
        XH.click([
          {"aria": "List of convenience dates"},
          {"css": "div:nth-of-type(2) > div > div.xui-dropdown--toggledwrapper div"},
        ], { label: "List of convenience dates", timeout: 30000 }));
      // Step 5: click Last financial
      await step("Click Last financial", () =>
        XH.click([
          {"text": "Last financial"},
          {"css": "#report-settings-date-option-5 span.xui-pickitem--text"},
        ], { label: "Last financial", timeout: 30000 }));


      await step('Open Grouping/Summarising dropdown', () =>
        XH.click([
          { aria: 'Grouping/Summarising' },
          { css: '#report-settings-group-by-button' },
        ], { label: 'Grouping/Summarising' }));

      await step('Select "Account Code & Name"', () =>
        XH.click([
          { text: 'Account Code & Name', selector: '[data-automationid^="report-settings-group-by-column-Account Code & Name--body"]' },
          { css: '#report-settings-group-by-column-Account Code & Name--body' },
        ], { label: 'Account Code & Name' }));



      // Step 6: click Update
      await step("Click Update", () =>
        XH.click([
          {"aria": "Update"},
          {"text": "Update"},
          {"css": "div.xui-u-flex-justify-end > button"},
        ], { label: "Update", timeout: 30000 }));
      await step('Wait for report to reload', () => XH.waitForReportReady());
      // Step 7: click Export
      await step("Click Export", () =>
        XH.click([
          {"aria": "Export"},
          {"css": "#page-toolbar div:nth-of-type(2) > div:nth-of-type(2) > button"},
          {"text": "Export"},
        ], { label: "Export", timeout: 30000 }));
      // Step 8: click Excel
      await step("Click Excel", () =>
        XH.click([
          {"aria": "Excel"},
          {"css": "#report-toolbar-export-excel-menuitem span"},
          {"text": "Excel"},
        ], { label: "Excel", timeout: 30000 }));
      // Step 9: skipped (edge://downloads-hub/) — background tracks the download
    });
  },
};
