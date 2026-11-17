// =====================================================================
// REPORT LIST — the ONLY place reports are registered.
// Order of REPORTS = download order.
// tools/recording_to_js.py adds new reports above the "@converter" lines.
// =====================================================================

import balanceSheet from './balanceSheet.js'; 
import profitAndLoss from './profitAndLoss.js';
import bankReconciliation from './bankReconciliation.js';
import gstReconciliation from './gstReconciliation.js';
import agedPayablesSummary from './agedPayablesSummary.js';
import agedReceivablesSummary from './agedReceivablesSummary.js';
import superannuationPayments from './superannuationPayments.js';
import accountTransactions from './accountTransactions.js';
import payrollEmployeeSummary from './payrollEmployeeSummary.js';
// @converter-imports

export const REPORTS = [
  payrollEmployeeSummary,
  accountTransactions,
  agedPayablesSummary,
  agedReceivablesSummary,
  superannuationPayments,
  balanceSheet,
  profitAndLoss,
  bankReconciliation,
  gstReconciliation,
  // @converter-reports
];
