// =====================================================================
// content/helpers.js — injected INTO the Xero page before each report runs.
// Report files use these via window.XeroHelpers (short: XH).
//
// These helpers do NOT move your real mouse — they send click events
// straight to the element. Moving the mouse cannot break them.
// BUT the automation tab must stay the visible tab (see README).
//
// This file runs in Edge's "isolated world": Xero's own scripts cannot
// see or call anything defined here.
// =====================================================================
(() => {
  if (window.XeroHelpers) return; // already loaded on this page

  const TAG = '%c[XeroExt]';
  const STYLE = 'color:#13b5ea;font-weight:bold';
  const log = (...a) => console.log(TAG, STYLE, ...a);
  const warn = (...a) => console.warn(TAG, STYLE, ...a);

  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const norm = (s) => (s || '').replace(/\s+/g, ' ').trim().toLowerCase();

  function isVisible(el) {
    if (!el || !el.isConnected) return false;
    const s = getComputedStyle(el);
    if (s.visibility === 'hidden' || s.display === 'none') return false;
    return el.getClientRects().length > 0;
  }
  const isEnabled = (el) => !(el.disabled || el.getAttribute('aria-disabled') === 'true');

  // ---------------------------------------------------------------
  // LOCATORS (same as the recording JSON):
  //   "#id ..."      -> { css: '#id ...' }
  //   "aria/Update"  -> { aria: 'Update' }
  //   "text/None"    -> { text: 'None', selector: 'CSS to narrow (optional)' }
  // A LIST = try first, then next (fallbacks).
  // ---------------------------------------------------------------
  function findOne(loc) {
    if (loc.css) {
      return [...document.querySelectorAll(loc.css)].find(isVisible) || null;
    }
    if (loc.aria) {
      const want = norm(loc.aria);
      const byLabel = [...document.querySelectorAll('[aria-label]')]
        .find((el) => norm(el.getAttribute('aria-label')) === want && isVisible(el));
      if (byLabel) return byLabel;
      const byText = [...document.querySelectorAll('button, [role="button"], [role="menuitem"]')]
        .find((el) => norm(el.textContent) === want && isVisible(el));
      if (byText) return byText;
      // Inputs often get their accessible name from a placeholder or a <label for="...">
      const byPlaceholder = [...document.querySelectorAll('input[placeholder], textarea[placeholder]')]
        .find((el) => norm(el.getAttribute('placeholder')) === want && isVisible(el));
      if (byPlaceholder) return byPlaceholder;
      const label = [...document.querySelectorAll('label[for]')].find((l) => norm(l.textContent) === want);
      const forEl = label && document.getElementById(label.getAttribute('for'));
      return forEl && isVisible(forEl) ? forEl : null;
    }
    if (loc.text) {
      const want = norm(loc.text);
      const pool = [...document.querySelectorAll(
        loc.selector || 'button, [role="button"], [role="menuitem"], [role="option"], li, a, span'
      )].filter(isVisible);
      const exact = pool.filter((el) => norm(el.textContent) === want);           // exact first
      const list = exact.length ? exact : pool.filter((el) => norm(el.textContent).includes(want));
      list.sort((a, b) => a.textContent.length - b.textContent.length);           // most specific
      return list[0] || null;
    }
    return null;
  }
  const describe = (loc) => JSON.stringify(loc);

  async function waitFor(locators, { timeout = 15000, enabled = false, label = '' } = {}) {
    const list = Array.isArray(locators) ? locators : [locators];
    const end = Date.now() + timeout;
    while (Date.now() < end) {
      for (const loc of list) {
        const el = findOne(loc);
        if (el && (!enabled || isEnabled(el))) {
          log(`found ${label} via ${describe(loc)}`, el);
          return el;
        }
      }
      await sleep(200);
    }
    throw new Error(`Element not found after ${timeout} ms: ${label} (tried ${list.map(describe).join(' | ')})`);
  }

  // ---------------------------------------------------------------
  // Which element really receives the click?
  // Xero list options look like:  <li role="option"><button>Text</button></li>
  // The click handler is on the INNER <button>, so we click that.
  // Order: element itself if it is a button/link
  //        -> a button INSIDE it -> the button AROUND it -> the element.
  // ---------------------------------------------------------------
  function clickTarget(el) {
    if (el.matches('button, a, [role="button"], [role="menuitem"]')) return el;
    return el.querySelector('button, a, [role="button"]') ||
      el.closest('button, a, [role="button"], [role="menuitem"]') || el;
  }

  // Fire the events a real mouse click makes (Xero's React UI needs them).
  function realClick(el) {
    const target = clickTarget(el);
    target.scrollIntoView({ block: 'center', inline: 'center' });
    const r = target.getBoundingClientRect();
    const base = {
      bubbles: true, cancelable: true, composed: true, view: window,
      clientX: r.left + r.width / 2, clientY: r.top + r.height / 2, button: 0,
    };
    target.dispatchEvent(new PointerEvent('pointerdown', { ...base, pointerType: 'mouse', isPrimary: true }));
    target.dispatchEvent(new MouseEvent('mousedown', base));
    target.dispatchEvent(new PointerEvent('pointerup', { ...base, pointerType: 'mouse', isPrimary: true }));
    target.dispatchEvent(new MouseEvent('mouseup', base));
    target.dispatchEvent(new MouseEvent('click', base));
    return target;
  }

  async function click(locators, opts = {}) {
    const el = await waitFor(locators, { enabled: true, ...opts });
    const clicked = realClick(el);
    log(`clicked ${opts.label || ''}`, clicked);
    await sleep(opts.after ?? 400);
    return clicked;
  }

  // For a click that OPENS A NEW PAGE (multi-page reports, e.g. GST).
  // A page change destroys this script, so we find the element now,
  // and do the click a moment AFTER this step has finished and reported
  // back to background.js. background.js then waits for the new page.
  async function clickAndLeave(locators, opts = {}) {
    const el = await waitFor(locators, { enabled: true, ...opts });
    log(`will click ${opts.label || ''} and leave this page`, el);
    setTimeout(() => realClick(el), 300);
  }

  // Type into an input in a way React / ExtJS notices.
  //   opts.blur = true -> leave the field afterwards (old Xero date boxes read the value on blur)
  async function type(locators, value, opts = {}) {
    const el = await waitFor(locators, { enabled: true, ...opts });
    el.focus();
    const proto = el.tagName === 'SELECT' ? HTMLSelectElement.prototype
      : el.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
    Object.getOwnPropertyDescriptor(proto, 'value').set.call(el, value);
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
    if (opts.blur) {
      el.dispatchEvent(new FocusEvent('blur'));
      el.dispatchEvent(new FocusEvent('focusout', { bubbles: true }));
      el.blur();
    }
    log(`typed "${value}" into ${opts.label || ''}`);
    await sleep(opts.after ?? 300);
    return el;
  }

  async function press(key, opts = {}) {
    const target = document.activeElement || document.body;
    for (const t of ['keydown', 'keyup']) {
      target.dispatchEvent(new KeyboardEvent(t, { key, code: key, bubbles: true, cancelable: true }));
    }
    log(`pressed ${key}`);
    await sleep(opts.after ?? 300);
  }

  // LOOP reports: open a dropdown, read every option's text, close it.
  //   optionSelector = CSS matching each option's TEXT element
  async function listOptions(openLocators, optionSelector, { label = 'dropdown', exclude = [] } = {}) {
    await click(openLocators, { label, timeout: 30000 });
    await waitFor([{ css: optionSelector }], { label: `${label} options` });
    const skip = exclude.map(norm);
    const names = [...new Set(
      [...document.querySelectorAll(optionSelector)]
        .map((el) => el.textContent.replace(/\s+/g, ' ').trim())
        .filter((t) => t && !skip.includes(norm(t)))
    )];
    // Close the dropdown: Escape first; if options are still showing, click the toggle again.
    await press('Escape');
    if ([...document.querySelectorAll(optionSelector)].some(isVisible)) {
      await click(openLocators, { label: `${label} (close)` }).catch(() => {});
    }
    log(`${label} options:`, names);
    return names;
  }

  // After "Update": wait for Xero's spinner to appear and disappear.
  async function waitForReportReady({ appearTimeout = 3000, timeout = 60000 } = {}) {
    const loaderSel = '.xui-loader, [role="progressbar"], [aria-busy="true"]';
    const anyLoader = () => [...document.querySelectorAll(loaderSel)].some(isVisible);
    let end = Date.now() + appearTimeout;
    while (Date.now() < end && !anyLoader()) await sleep(100);
    end = Date.now() + timeout;
    while (Date.now() < end && anyLoader()) await sleep(250);
    if (anyLoader()) throw new Error(`Report still loading after ${timeout} ms`);
    await sleep(800);
    log('report ready');
  }

  // Check an element's text OR an input's value contains `expected`.
  async function expectText(locators, expected, { timeout = 5000, label = '' } = {}) {
    const end = Date.now() + timeout;
    let last = '';
    while (Date.now() < end) {
      const el = (Array.isArray(locators) ? locators : [locators]).map(findOne).find(Boolean);
      last = el ? norm(el.value ?? el.textContent) || norm(el.textContent) : '(not found)';
      if (last.includes(norm(expected))) return true;
      await sleep(200);
    }
    throw new Error(`Check failed ${label}: expected "${expected}", saw "${last}"`);
  }

  // Check a date box holds the expected DATE ("1 Jul 2025" == "01 Jul 2025").
  async function expectDate(locators, expected, { timeout = 5000, label = '' } = {}) {
    const want = new Date(expected).toDateString();
    const end = Date.now() + timeout;
    let seen = '';
    while (Date.now() < end) {
      const el = (Array.isArray(locators) ? locators : [locators]).map(findOne).find(Boolean);
      seen = el ? (el.value ?? el.textContent).trim() : '(not found)';
      if (seen && new Date(seen).toDateString() === want) return true;
      await sleep(200);
    }
    throw new Error(`Date check failed ${label}: expected "${expected}", box shows "${seen}"`);
  }

  // Check the visible page text contains `text` (e.g. the client name).
  async function expectPageText(text, { timeout = 10000, label = '' } = {}) {
    const end = Date.now() + timeout;
    while (Date.now() < end) {
      if (norm(document.body?.innerText).includes(norm(text))) return true;
      await sleep(250);
    }
    throw new Error(`Page does not show "${text}" ${label}`);
  }

  // Wraps a report. NEVER throws: returns {ok:true} or {ok:false, step, error}.
  async function runReport(name, body) {
    let current = '(start)';
    const t0 = performance.now();
    const step = async (label, fn) => {
      current = label;
      log(`[${name}] STEP: ${label}`);
      return fn();
    };
    try {
      log(`[${name}] started on ${location.href}`);
      await body(step);
      log(`[${name}] finished in ${Math.round(performance.now() - t0)} ms`);
      return { ok: true };
    } catch (e) {
      warn(`[${name}] FAILED at "${current}":`, e);
      return { ok: false, step: current, error: e?.message || String(e) };
    }
  }

  window.XeroHelpers = {
    log, warn, sleep, norm, isVisible, waitFor, click, clickAndLeave, realClick, type, press,
    listOptions, waitForReportReady, expectText, expectDate, expectPageText, runReport,
  };
  log('helpers loaded');
})();
