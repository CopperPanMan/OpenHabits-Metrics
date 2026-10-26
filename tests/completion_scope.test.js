const assert = require('node:assert/strict');
const test = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { createFixture } = require('./helpers/apps_script_fixture');
const lockoutsSource = fs.readFileSync(path.join(__dirname, '..', 'Lockouts.gs'), 'utf8');

function fixture(options) {
  const f = createFixture(options);
  vm.runInContext(lockoutsSource, f.context, {filename: 'Lockouts.gs'});
  return f;
}

function includes(scope, time) {
  return Date.parse(time) >= Date.parse(scope.windowStartISO) &&
    Date.parse(time) < Date.parse(scope.windowEndISO);
}

test('successful recording returns the authoritative effective-day window and server evaluation time', () => {
  const f = fixture({now: '2026-10-26T16:00:00Z', timezone: 'America/New_York',
    config: {lateExtensionHours: 5}});
  const r = f.post([['metric', 1]]);
  assert.equal(r.metricsByID[0].status, 'written');
  assert.equal(r.metricsByID[0].complete, true);
  assert.deepEqual(r.completionScope, {
    evaluatedAtISO: '2026-10-26T16:00:00.000Z', timezone: 'America/New_York',
    windowStartISO: '2026-10-26T09:00:00.000Z', windowEndISO: '2026-10-27T09:00:00.000Z',
  });
  assert.equal(includes(r.completionScope, '2026-10-27T02:00:00Z'), true); // Tonight, completed early.
  assert.equal(includes(r.completionScope, '2026-10-28T02:00:00Z'), false); // Tomorrow's occurrence.
  assert.equal(includes(r.completionScope, r.completionScope.windowEndISO), false);
});

test('after-midnight completion retains the preceding extended day and excludes the next night', () => {
  const f = fixture({now: '2026-10-27T06:00:00Z', timezone: 'America/New_York',
    config: {lateExtensionHours: 5}});
  const r = f.post([['metric', 1]]);
  assert.equal(r.completionScope.windowStartISO, '2026-10-26T09:00:00.000Z');
  assert.equal(r.completionScope.windowEndISO, '2026-10-27T09:00:00.000Z');
  assert.equal(includes(r.completionScope, '2026-10-27T02:00:00Z'), true);
  assert.equal(includes(r.completionScope, '2026-10-28T02:00:00Z'), false);
});

test('caller timezone and supplied clock cannot relabel the physical column that was recorded', () => {
  const f = fixture({now: '2026-10-27T06:00:00Z', timezone: 'America/New_York',
    config: {lateExtensionHours: 5},
    metrics: [{metricID: 'metric', dataType: 'number', timezoneMode: 'floating'}]});
  const r = f.post([['metric', 1]], 'record_metric_iOS', {
    timezone: 'Asia/Tokyo', clientNow: 'Wed, 28 Oct 2026 14:00:00 +0900',
    completionScope: {windowStartISO: '2099-01-01T00:00:00Z'},
  });
  assert.equal(r.completionScope.evaluatedAtISO, '2026-10-27T06:00:00.000Z');
  assert.equal(r.completionScope.timezone, 'America/New_York');
  assert.equal(r.completionScope.windowStartISO, '2026-10-26T09:00:00.000Z');
  assert.equal(r.completionScope.windowEndISO, '2026-10-27T09:00:00.000Z');
});

test('effective-day boundaries honor daylight-saving changes rather than assuming 24 hours', () => {
  for (const [now, hours] of [['2026-03-08T16:00:00Z', 23], ['2026-11-01T17:00:00Z', 25]]) {
    const f = fixture({now, timezone: 'America/New_York', config: {lateExtensionHours: 0}});
    const scope = f.post([['metric', 1]]).completionScope;
    assert.equal((Date.parse(scope.windowEndISO) - Date.parse(scope.windowStartISO)) / 3600000, hours);
    assert.equal(includes(scope, now), true);
  }
});

test('failed batches and Notion-only pushes do not claim a recording scope', () => {
  for (const [data, key] of [[ [['missing', 1]], 'record_metric_iOS'],
    [ [['metric', 'invalid']], 'record_metric_iOS'],
    [ [['metric', 1]], 'update_metric_notion']]) {
    const f = fixture();
    const response = f.post(data, key);
    assert.equal(Object.hasOwn(response, 'completionScope'), false);
    assert.equal(f.counts.writes.length, 0);
  }
});

test('partial success supplies scope without making erroneous metric entries successful', () => {
  const f = fixture();
  const response = f.post([['metric', 1], ['missing', 1]]);
  assert.ok(response.completionScope);
  assert.equal(response.metricsByID[0].complete, true);
  assert.equal(response.metricsByID[1].status, 'error');
  assert.equal(response.metricsByID[1].complete, false);
  assert.ok(response.metricsByID[1].errors.length);
});

test('keep-first completion carries the day of the value being evaluated', () => {
  const f = fixture({metrics: [{metricID: 'metric', dataType: 'number', recordType: 'keep_first'}]});
  f.set('metric', 2);
  const response = f.post([['metric', 1]]);
  assert.equal(response.metricsByID[0].status, 'kept_first');
  assert.ok(response.completionScope.windowStartISO);
  assert.equal(f.counts.writes.length, 0);
});

test('Main-only or unavailable boundary helper retains a conservative timestamp without failing a recorded write', () => {
  for (const missing of [true, false]) {
    const f = createFixture({now: '2026-10-26T12:00:00Z'});
    if (!missing) f.context.lockouts_buildEffectiveDayWindow_ = () => { throw Error('Unavailable boundary'); };
    const response = f.post([['metric', 1]]);
    assert.equal(response.metricsByID[0].status, 'written');
    assert.equal(f.get('metric'), 1);
    assert.deepEqual(response.completionScope, {evaluatedAtISO: '2026-10-26T12:00:00.000Z', timezone: 'UTC'});
  }
});

test('optional scope calculation adds no sheet reads or writes', () => {
  const f = fixture();
  f.post([['metric', 1]]);
  const before = {reads: f.counts.reads.length, writes: f.counts.writes.length};
  const scope = f.context.buildRecordingCompletionScope_();
  assert.ok(scope.windowStartISO);
  assert.deepEqual({reads: f.counts.reads.length, writes: f.counts.writes.length}, before);
});
