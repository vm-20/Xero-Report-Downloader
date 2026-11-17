// =====================================================================
// background/runner.js — runs all reports, one after another.
// ---------------------------------------------------------------------
//   runAll()
//     0. open tab; if client name unknown -> open client homepage, read name
//     1. for each report in reports/index.js:
//          normal / multi-page report -> runPagesReport()
//          loop report (getItems)     -> runLoopReport()
//        any error -> report marked , logged, NEXT report starts
//        (only "Not logged in" stops the run: every report would fail)
//     2. mark run finished
// =====================================================================

import { REPORTS } from '../reports/index.js';
import { CONFIG } from './config.js';
import { log, warn, err } from './log.js';
import { getState, resetState, setState, updateResult, updateItem } from './state.js';
import { startKeepAlive, stopKeepAlive } from './keepAlive.js';
import { openWorkTab, ensureTab, navigate, waitForNextLoad, checkClient, readOrgName, runInPage } from './tabs.js';
import { expectDownload, clearExpectedDownload, waitForDownload } from './downloads.js';
import { getReportUrl, lastFinancialYear, fyDates, safeName } from '../shared/xero.js';

const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
const isLoginError = (e) => /Not logged in/.test(e?.message || '');

// Plain values handed to report code in the page: run(item, ctx)
const makeCtx = (run) => ({ orgCode: run.orgCode, orgName: run.orgName, fy: run.fy, ...fyDates(run.fy) });

// Tell downloads.js how to name the next file.
function prepareFileName(report, run, item) {
  expectDownload({
    folder: `${CONFIG.downloadFolder}/${safeName(run.orgName || run.orgCode)}/${today()}`,
    template: report.fileName || (item ? CONFIG.itemFileNameTemplate : CONFIG.fileNameTemplate),
    values: { report: report.name, item: item || '', client: run.orgName || run.orgCode, fy: run.fy, date: today() },
  });
}

// Run report code in the page; turn a {ok:false} result into an error.
async function runStep(tabId, func, args, where) {
  const result = await runInPage(tabId, func, args);
  log(`page result (${where}):`, result);
  if (!result?.ok) throw new Error(`${where}: failed at "${result?.step ?? 'unknown'}": ${result?.error ?? 'no result'}`);
}

// ---------------------------------------------------------------------
// NORMAL + MULTI-PAGE report  (report.run  or  report.pages = [p1, p2, ...])
// Pages before the last one end with a page change -> wait for it.
// The last page starts the download -> wait for the file.
// ---------------------------------------------------------------------
async function runPagesReport(tabId, report, run, i) {
  const t0 = Date.now();
  const pages = report.pages || [report.run];
  const tab = await navigate(tabId, getReportUrl(report, run.orgCode));
  checkClient(tab, run);

  for (let k = 0; k < pages.length; k++) {
    const where = pages.length > 1 ? `page ${k + 1}/${pages.length}` : 'page';
    const isLast = k === pages.length - 1;

    if (!isLast) {
      const nextLoad = waitForNextLoad(tabId); // arm before the click that changes page
      try {
        await runStep(tabId, pages[k], [null, makeCtx(run)], where);
        const newTab = await nextLoad.promise;
        log(`moved to ${newTab.url}`);
        checkClient(newTab, run);
      } catch (e) {
        nextLoad.cancel();
        throw e;
      }
      continue;
    }

    prepareFileName(report, run, null);
    const download = waitForDownload(); // arm before the Excel click
    try {
      await runStep(tabId, pages[k], [null, makeCtx(run)], where);
      const file = await download.promise;
      await updateResult(i, { status: 'success', ...file, secs: ((Date.now() - t0) / 1000).toFixed(1) });
    } catch (e) {
      download.cancel();
      throw e;
    } finally {
      clearExpectedDownload();
    }
  }
}

// ---------------------------------------------------------------------
// LOOP report (e.g. one file per bank) — page opened ONCE.
// The page is reloaded only after a failed item, so the next item starts clean.
// ---------------------------------------------------------------------
async function runLoopReport(tabId, report, run, i) {
  const url = getReportUrl(report, run.orgCode);
  checkClient(await navigate(tabId, url), run);

  const items = await runInPage(tabId, report.getItems, [null, makeCtx(run)]);
  if (!Array.isArray(items) || items.length === 0) throw new Error('getItems() found no items in the dropdown');
  log(`${report.name}: ${items.length} items`, items);
  await updateResult(i, { items: items.map((name) => ({ name, status: 'pending' })) });

  let ok = 0;
  let reloadFirst = false;
  for (let j = 0; j < items.length; j++) {
    await updateItem(i, j, { status: 'running' });
    try {
      if (reloadFirst) {
        log(`reloading report after a failure, before "${items[j]}"`);
        checkClient(await navigate(tabId, url), run);
        reloadFirst = false;
      }
      prepareFileName(report, run, items[j]);
      const download = waitForDownload();
      try {
        await runStep(tabId, report.run, [items[j], makeCtx(run)], items[j]);
        const file = await download.promise;
        await updateItem(i, j, { status: 'success', ...file });
        ok++;
      } catch (e) {
        download.cancel();
        throw e;
      } finally {
        clearExpectedDownload();
      }
    } catch (e) {
      err(`${report.name} / ${items[j]} FAILED:`, e); // log, continue with next item
      await updateItem(i, j, { status: 'failed', error: e.message });
      if (isLoginError(e)) throw e;
      reloadFirst = true;
    }
  }
  await updateResult(i, {
    status: ok === items.length ? 'success' : ok === 0 ? 'failed' : 'partial',
    error: ok === items.length ? undefined : `${items.length - ok} of ${items.length} failed`,
  });
}

// ---------------------------------------------------------------------
// FULL RUN
// ---------------------------------------------------------------------
let running = false;
export const isRunning = () => running;

export async function runAll(orgCode, orgName) {
  if (running) return;
  running = true;
  startKeepAlive();
  // `run` = this run's client + FY. Fixed at the start.
  const run = { orgCode, orgName, fy: CONFIG.fyOverride || lastFinancialYear() };
  console.group(`[XeroExt] Run ${new Date().toLocaleString()} — ${orgName || orgCode} — FY${run.fy}`);

  await resetState({
    running: true, orgCode, orgName, fy: run.fy,
    startedAt: Date.now(), finishedAt: null, fatalError: null, warning: null, current: null,
    results: REPORTS.map((r) => ({ name: r.name, status: 'pending' })),
  });

  let work = null; // { tabId, windowId }
  try {
    work = await openWorkTab();

    // Step 0: make sure we know the client NAME (used in file names + checks).
    if (!run.orgName) {
      try {
        const tab = await navigate(work.tabId, `https://go.xero.com/app/${orgCode}/homepage`);
        checkClient(tab, run);
        run.orgName = await readOrgName(work.tabId);
      } catch (e) {
        if (isLoginError(e)) throw e;
        warn('could not open client homepage:', e.message);
      }
      if (run.orgName) {
        log(`client name: ${run.orgName}`);
        await setState({ orgName: run.orgName });
      } else {
        await setState({ warning: `Client name not found — files use code ${orgCode}` });
      }
    }

    for (let i = 0; i < REPORTS.length; i++) {
      const report = REPORTS[i];
      log(`(${i + 1}/${REPORTS.length}) START ${report.name}`);
      await setState({ current: report.name });
      await updateResult(i, { status: 'running' });
      try {
        await ensureTab(work);
        if (typeof report.getItems === 'function') await runLoopReport(work.tabId, report, run, i);
        else await runPagesReport(work.tabId, report, run, i);
        log(`(${i + 1}/${REPORTS.length}) DONE ${report.name}`);
      } catch (e) {
        // ONE report failing does NOT stop the run — mark it and go on.
        err(`(${i + 1}/${REPORTS.length}) FAILED ${report.name}:`, e);
        await updateResult(i, { status: 'failed', error: e.message });
        if (isLoginError(e)) throw e;
      }
    }
  } catch (e) {
    err('Run stopped:', e);
    await setState({ fatalError: e.message });
  } finally {
    if (CONFIG.closeWhenDone && work) {
      if (work.windowId !== null) chrome.windows.remove(work.windowId).catch(() => {});
      else chrome.tabs.remove(work.tabId).catch(() => {});
    }
    await setState({ running: false, current: null, finishedAt: Date.now() });
    console.table((await getState()).results);
    console.groupEnd();
    stopKeepAlive();
    running = false;
  }
}
