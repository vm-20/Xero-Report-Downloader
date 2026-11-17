// =====================================================================
// background/state.js — progress that the popup shows.
// ---------------------------------------------------------------------
// Stored in chrome.storage.SESSION under the key "runState":
//   - kept in memory only, wiped when Edge closes (nothing left on disk)
//   - the popup listens for changes and redraws itself
// Shape:
//   { running, orgCode, orgName, fy, startedAt, finishedAt, fatalError,
//     warning, current,
//     results: [ { name, status, path, xeroName, secs, error,
//                  items: [ { name, status, path, error } ] } ] }
// status = pending | running | success | failed | partial
// =====================================================================

const store = chrome.storage.session;

// Every change is "read, modify, write". If two changes run at the same time,
// one can overwrite the other. So ALL changes wait in one queue.
let queue = Promise.resolve();
function inQueue(fn) {
  const p = queue.then(fn);
  queue = p.catch(() => {}); // a failed change must not block later ones
  return p;
}

export async function getState() {
  return (await store.get('runState')).runState || {};
}

// Replace the whole state (used at the start of a run).
export const resetState = (state) => inQueue(() => store.set({ runState: state }));

// Change some top-level fields, keep the rest.
export const setState = (patch) => inQueue(async () => {
  await store.set({ runState: { ...(await getState()), ...patch } });
});

// Change one report row (index i).
export const updateResult = (i, patch) => inQueue(async () => {
  const s = await getState();
  if (!s.results?.[i]) return;
  s.results[i] = { ...s.results[i], ...patch };
  await store.set({ runState: s });
});

// Change one loop item (report i, item j).
export const updateItem = (i, j, patch) => inQueue(async () => {
  const s = await getState();
  if (!s.results?.[i]?.items?.[j]) return;
  s.results[i].items[j] = { ...s.results[i].items[j], ...patch };
  await store.set({ runState: s });
});
