const test = require('node:test');
const assert = require('node:assert/strict');
const { buildShortcutUrl, normalizeShortcutName, buildInsightsUrl, buildShortcutMetricText } = require('../docs/shortcut-qr.js');

test('buildShortcutUrl URL-encodes an exact Shortcut name', () => {
  assert.equal(
    buildShortcutUrl('Log weight & notes'),
    'shortcuts://run-shortcut?name=Log%20weight%20%26%20notes'
  );
});

test('buildShortcutUrl supports Unicode and trims surrounding whitespace', () => {
  assert.equal(
    buildShortcutUrl('  Log café ☕  '),
    'shortcuts://run-shortcut?name=Log%20caf%C3%A9%20%E2%98%95'
  );
});

test('normalizeShortcutName preserves meaningful internal whitespace', () => {
  assert.equal(normalizeShortcutName('  Log  Meditation  '), 'Log  Meditation');
});

test('buildShortcutUrl rejects an empty Shortcut name', () => {
  assert.throws(() => buildShortcutUrl('   '), /Enter a Shortcut name first/);
});

test('infers input and quoting from configured types, supports multiple metrics, and sends completion 1', () => {
  assert.equal(buildShortcutMetricText([
    { metricID: 'done', dataType: 'number', inputMode: 'completion' },
    { metricID: 'water', dataType: 'number', recordType: 'keep_first' },
    { metricID: 'note', dataType: 'text' },
    { metricID: 'focus', dataType: 'duration' },
    { metricID: 'started', dataType: 'timestamp' }
  ]), '[[' + '"done",1],["water",<water_provided_input>],["note","<note_provided_input>"],["focus","<focus_provided_input>"],["started"]]');
});

test('fixed inputs are valid JSON with numeric conversion and lossless text escaping', () => {
  const value = 'quote " backslash \\ and newline\n';
  const output = buildShortcutMetricText([{ metricID: 'number', dataType: 'number', value: '3.5' }, { metricID: 'note', dataType: 'text', value }]);
  assert.deepEqual(JSON.parse(output), [['number', 3.5], ['note', value]]);
  for (const value of ['bad', '', 'Infinity']) assert.throws(() => buildShortcutMetricText([{ metricID: 'n', dataType: 'number', value }]), /valid number/);
});

test('Insights QR preserves pasted multiple metrics, fixed inputs, Unicode and renamed Shortcuts', () => {
  const text = buildShortcutMetricText([
    { metricID: 'done', dataType: 'number', inputMode: 'completion' },
    { metricID: 'water', dataType: 'number', value: 2 },
    { metricID: 'note', dataType: 'text', value: 'café & "tea"\n' },
    { metricID: 'focus', dataType: 'duration', value: '00:25:00' },
    { metricID: 'started', dataType: 'timestamp' }
  ]);
  const url = buildInsightsUrl(text, 'My Insights ☕');
  assert.equal(decodeURIComponent(url.split('&text=')[1]), text);
  assert.match(url, /name=My%20Insights%20%E2%98%95&input=text/);
});

test('Insights QR rejects unresolved numeric, quoted and legacy input placeholders', () => {
  for (const dataType of ['number', 'duration', 'text']) {
    assert.throws(() => buildInsightsUrl(buildShortcutMetricText([{ metricID: 'n', dataType }])), /fixed value/);
  }
  assert.throws(() => buildInsightsUrl('[["n","<Provided Input>"]]'), /fixed value/);
});

test('Insights QR rejects malformed JSON and invalid metric tuples before generating a code', () => {
  assert.throws(() => buildInsightsUrl(''), /Paste/);
  assert.throws(() => buildInsightsUrl('[broken'), /valid JSON/);
  for (const input of ['[]', '{}', '[null]', '["metric"]', '[[""]]', '[["bad id"]]', '[["n",null]]', '[["n",true]]', '[["n",{}]]', '[["n",1,2]]', '[["n",1e999]]']) {
    assert.throws(() => buildInsightsUrl(input), /metric entries/);
  }
});

test('builds a credential-free direct Insights URL', () => {
  const url = buildInsightsUrl('[["focus_start"]]');
  assert.match(url, /^shortcuts:\/\/run-shortcut\?name=Insights&input=text&text=/);
  assert.equal(url.includes('secret'), false);
});
