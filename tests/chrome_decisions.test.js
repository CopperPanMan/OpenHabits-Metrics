const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync(require.resolve('../Chrome Extension/background.js'), 'utf8');
function client(fetch, timers = {}) {
  const listener = { addListener() {} };
  const context = vm.createContext({ fetch, AbortController, setTimeout, clearTimeout, Intl, URL,
    chrome: { runtime: { onInstalled: listener, onMessage: listener },
      tabs: { onUpdated: listener, onActivated: listener, onRemoved: listener },
      windows: { onFocusChanged: listener }, idle: { onStateChanged: listener } }, ...timers });
  vm.runInContext(source, context);
  return context;
}
const cfg = { lockoutsServerUrl: 'https://example.invalid/exec', lockoutsSecret: 'private-secret' };
const response = data => ({ ok: true, text: async () => JSON.stringify(data) });
test('allowed decisions still permit access', async () => {
  assert.equal((await client(async () => response({ status: 'allowed' })).queryServerBlockDecision(cfg)).allowed, true);
});
test('transient connection failure retries and recovers', async () => {
  let calls = 0;
  const result = await client(async () => { if (++calls === 1) throw Error('offline'); return response({ status: 'allowed' }); }).queryServerBlockDecision(cfg);
  assert.equal(calls, 2); assert.equal(result.allowed, true);
});
test('persistent connection failure allows access, explains why and retries only once', async () => {
  let calls = 0;
  const result = await client(async () => { calls++; throw Error(cfg.lockoutsSecret); }).queryServerBlockDecision(cfg);
  assert.equal(calls, 2); assert.equal(result.allowed, true); assert.match(result.warning, /could not connect/);
  assert.ok(!result.warning.includes(cfg.lockoutsSecret));
});
for (const [status, calls] of [[503, 2], [429, 2], [403, 1]]) {
  test(`HTTP ${status} explains failure with ${calls} attempt(s)`, async () => {
    let count = 0;
    const result = await client(async () => { count++; return { ok: false, status }; }).queryServerBlockDecision(cfg);
    assert.equal(count, calls); assert.equal(result.allowed, true); assert.match(result.warning, new RegExp(String(status)));
  });
}
test('timeout aborts requests and displays a timeout explanation', async () => {
  let calls = 0, cleared = 0;
  const c = client(async (url, options) => new Promise((resolve, reject) => {
    calls++; options.signal.addEventListener('abort', () => reject(Error('aborted')));
  }), { setTimeout: (callback, milliseconds) => { assert.equal(milliseconds, 3000); queueMicrotask(callback); return 1; }, clearTimeout: () => cleared++ });
  const result = await c.queryServerBlockDecision(cfg);
  assert.equal(calls, 2); assert.equal(cleared, 2); assert.equal(result.allowed, true); assert.match(result.warning, /too long/);
});
test('text/plain authentication JSON displays the error and redacts the secret', async () => {
  const result = await client(async () => response({ ok: false, errors: ['Unauthorized request: ' + cfg.lockoutsSecret] })).queryServerBlockDecision(cfg);
  assert.equal(result.allowed, true); assert.match(result.warning, /Unauthorized/); assert.ok(!result.warning.includes(cfg.lockoutsSecret));
});
test('configuration errors are surfaced from debug.errors', async () => {
  const result = await client(async () => response({ status: 'error', debug: { errors: ['Invalid duration config'] } })).queryServerBlockDecision(cfg);
  assert.equal(result.allowed, true); assert.match(result.warning, /Invalid duration config/);
});
for (const body of ['<html>Sign in</html>', '{invalid']) {
  test(`unreadable response explains deployment checks: ${body}`, async () => {
    const result = await client(async () => ({ ok: true, text: async () => body })).queryServerBlockDecision(cfg);
    assert.equal(result.allowed, true); assert.match(result.warning, /unreadable response/);
  });
}
for (const data of [null, [], 42, {}, { status: 'unexpected' }]) {
  test(`invalid decision allows access with an explanation: ${JSON.stringify(data)}`, async () => {
    const result = await client(async () => response(data)).queryServerBlockDecision(cfg);
    assert.equal(result.allowed, true); assert.ok(result.warning.trim());
  });
}
for (const type of ['task_block', 'duration_block', 'firstXMinutesAfterTimestamp_block', 'time_block']) {
  test(`empty message for ${type} receives an explanation without retrying`, async () => {
    let calls = 0;
    const result = await client(async () => { calls++; return response({ status: 'blocked', block: { type, id: 'rule1' }, ui: { message: '  ', usedMinutes: 1, allowedNowMinutes: 0.5 } }); }).queryServerBlockDecision(cfg);
    assert.equal(calls, 1); assert.equal(result.allowed, false); assert.ok(result.message.trim());
    if (type === 'duration_block') assert.match(result.message, /1 minutes used; 0.5 minutes allowed/);
  });
}
test('configured block message is preserved', async () => {
  const result = await client(async () => response({ status: 'blocked', ui: { message: 'Finish your tasks first.' } })).queryServerBlockDecision(cfg);
  assert.equal(result.message, 'Finish your tasks first.');
});
test('missing URL explains how to configure the extension', async () => {
  const result = await client(() => { throw Error('must not fetch'); }).queryServerBlockDecision({});
  assert.equal(result.allowed, false); assert.match(result.message, /no server URL/);
});

function attachStorage(c, state) {
  c.chrome.storage = { local: {
    get: async keys => Object.fromEntries(keys.filter(key => key in state).map(key => [key, state[key]])),
    set: async patch => Object.assign(state, patch),
    remove: async keys => keys.forEach(key => delete state[key])
  } };
}

test('an outage permits navigation and a recovered server enforces its next decision', async () => {
  let offline = true;
  const c = client(async (url, options) => {
    if (JSON.parse(options.body).key !== 'app_closer') return response({ ok: true });
    if (offline) throw Error('offline');
    return response({ status: 'blocked', ui: { message: 'Finish your tasks.' } });
  });
  const state = { ...cfg, unlockedUntil: Date.now() - 1000, notificationsEnabled: true,
    screenTimeLoggingEnabled: true, screenTimeDurationMetricID: 'desktop_time' };
  attachStorage(c, state);
  const redirects = [], notices = [];
  c.chrome.tabs.update = async (id, patch) => redirects.push(patch.url);
  c.chrome.notifications = { create: notice => notices.push(notice.message) };
  c.chrome.runtime.getURL = path => 'chrome-extension://example/' + path;
  c.isStableActiveTab = async () => true;
  const tab = { id: 1, windowId: 1, url: 'https://youtube.com/watch', active: true };
  await c.handlePotentialSessionTransition(1, tab);
  assert.equal(redirects.length, 0);
  assert.equal(notices.length, 1);
  assert.equal(state.activeScreenTimeSession.decisionUnavailable, true);
  await c.handlePotentialSessionTransition(1, tab);
  assert.equal(notices.length, 1, 'repeat outage warnings are rate-limited');
  offline = false;
  await c.handlePotentialSessionTransition(1, tab);
  assert.equal(redirects.length, 1);
  assert.match(redirects[0], /blocked.html/);
  assert.match(decodeURIComponent(redirects[0]), /Finish your tasks/);
});

test('unlock redirects and returns even while both logging requests are stalled', async () => {
  const aborts = [], attempts = [];
  const c = client(async (url, options) => new Promise((resolve, reject) => {
    attempts.push(JSON.parse(options.body).data);
    options.signal.addEventListener('abort', () => reject(Error('aborted')));
  }), { setTimeout: callback => { aborts.push(callback); return aborts.length; }, clearTimeout() {} });
  const state = { ...cfg, illegalUnlockWait: Date.now() - 31000, illegalUnlockMetricID: 'penalty', notificationsEnabled: false };
  attachStorage(c, state);
  const redirects = [];
  c.chrome.tabs.update = async (id, patch) => redirects.push(patch.url);
  const result = await c.handleUnlockAttempt('illegal', 'https://youtube.com', { tab: { id: 1 } });
  assert.equal(result.status, 'unlock_granted');
  assert.ok(state.unlockedUntil > Date.now());
  assert.deepEqual(redirects, ['https://youtube.com']);
  assert.deepEqual(JSON.parse(JSON.stringify(attempts)), [[['illegal_unlock']], [['penalty']]]);
  aborts.forEach(abort => abort());
});

test('metric logging times out without retrying an ambiguous recording', async () => {
  let calls = 0, cleared = 0;
  const c = client(async (url, options) => new Promise((resolve, reject) => {
    calls++;
    options.signal.addEventListener('abort', () => reject(Error('aborted')));
  }), { setTimeout: (callback, milliseconds) => { assert.equal(milliseconds, 3000); queueMicrotask(callback); return 1; }, clearTimeout: () => cleared++ });
  await c.sendMetricIfConfigured('desktop_time', cfg, '00:01:00');
  assert.equal(calls, 1);
  assert.equal(cleared, 1);
});
