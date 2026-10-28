const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const test = require('node:test');
const { loadEditor } = require('./helpers/config_editor_fixture');

function server() {
  const context = vm.createContext({});
  vm.runInContext(fs.readFileSync(path.join(__dirname, '../SetupV2.gs'), 'utf8'), context);
  return context;
}

function config(type, references) {
  return { trackingSheetName: 'Tracking Data', metricSettings: [
    { metricID: 'water', displayName: 'Water', dataType: 'number' },
    { metricID: 'screen_time', displayName: 'Screen time', dataType: 'duration' },
    { metricID: 'planned', displayName: 'Day plan', dataType: 'timestamp' },
    { metricID: 'note', displayName: 'Daily note', dataType: 'text' }
  ], lockouts: { blocks: [{ id: 'rule', type, times: { beg: '00:00', end: '00:00' }, typeSpecific: {
    duration: { screenTimeID: references[0], maxMinutes: 0 },
    firstXMinutes: { timestampID: references[0], minutes: 30 },
    task_block_IDs: references
  } }] } };
}

for (const [type, valid, wrongType] of [
  ['duration_block', 'screen_time', 'water'],
  ['firstXMinutesAfterTimestamp_block', 'planned', 'screen_time']
]) {
  test(`${type} accepts only a present metric of the required type in editor and server saves`, () => {
    const editor = loadEditor(), backend = server();
    for (const [id, message] of [[valid, null], ['', /required/], ['deleted', /not found/], [wrongType, /must reference/]]) {
      const raw = config(type, [id]);
      editor.setState(raw);
      const uiErrors = Array.from(editor.validateState());
      const serverErrors = Array.from(backend.openHabitsValidateBlockReferences_(raw));
      assert.deepEqual(uiErrors, serverErrors);
      if (message) {
        assert.match(uiErrors.join(' '), message);
        // Invalid saves return before any Sheet access, lock, or mutation.
        assert.equal(backend.openHabitsSaveAndApply(JSON.stringify(raw)).ok, false);
      } else assert.deepEqual(uiErrors, []);
    }
  });
}

test('task rules require at least one existing metric and reject empty entries', () => {
  const editor = loadEditor(), backend = server();
  for (const refs of [[], [''], ['planned', ''], ['planned', 'missing']]) {
    const raw = config('task_block', refs);
    editor.setState(raw);
    assert.ok(editor.validateState().length);
    assert.deepEqual(Array.from(editor.validateState()), Array.from(backend.openHabitsValidateBlockReferences_(raw)));
    assert.equal(backend.openHabitsSaveAndApply(raw).ok, false);
  }
  const raw = config('task_block', ['water', 'screen_time', 'planned', 'note']);
  editor.setState(raw);
  assert.deepEqual(Array.from(editor.validateState()), []);
  assert.deepEqual(Array.from(backend.openHabitsValidateBlockReferences_(raw)), []);
});

test('empty task rule diagnostics open its add-metric action; blank entries target the exact selector', () => {
  const editor = loadEditor();
  editor.setState(config('task_block', []));
  assert.equal(editor.collectValidationIssues()[0].target.action, 'Add Required Metric ID');
  editor.setState(config('task_block', ['planned', '']));
  const issue = editor.collectValidationIssues()[0];
  assert.equal(issue.target.field, 'Required Metric ID');
  assert.equal(issue.target.occurrence, 1);
});

test('type-specific choices preserve incompatible or removed imported references for repair', () => {
  const editor = loadEditor(); editor.setState(config('duration_block', ['water']));
  const options = type => Array.from(editor.metricReferenceOptions('', type), option => option.value);
  assert.deepEqual(options('duration'), ['', 'screen_time']);
  assert.deepEqual(options('timestamp'), ['', 'planned']);
  assert.deepEqual(options(), ['', 'water', 'screen_time', 'planned', 'note']);
  assert.match(editor.metricReferenceOptions('water', 'duration').at(-1).label, /needs a duration metric/);
  assert.match(editor.metricReferenceOptions('removed', 'timestamp').at(-1).label, /not found/);
  assert.equal(editor.getState().lockouts.blocks[0].typeSpecific.duration.screenTimeID, 'water');
});

test('changing a referenced metric type is caught, while inactive rule settings are ignored', () => {
  const editor = loadEditor(), backend = server();
  const raw = config('duration_block', ['screen_time']);
  raw.lockouts.blocks[0].typeSpecific.firstXMinutes.timestampID = 'removed';
  raw.lockouts.blocks[0].typeSpecific.task_block_IDs = ['removed'];
  editor.setState(raw);
  assert.deepEqual(Array.from(editor.validateState()), []);
  assert.deepEqual(Array.from(backend.openHabitsValidateBlockReferences_(raw)), []);
  raw.metricSettings[1].dataType = 'number';
  editor.setState(raw);
  assert.match(editor.validateState().join(' '), /must reference a duration metric/);
  assert.equal(backend.openHabitsSaveAndApply(raw).ok, false);
});

test('older configurations still pass load validation, but must repair invalid references before saving', () => {
  const backend = server(), raw = config('duration_block', ['water']);
  assert.equal(backend.openHabitsValidateConfig_(raw).ok, true);
  assert.equal(backend.openHabitsPreviewConfig(raw).ok, false);
  assert.equal(backend.openHabitsSaveAndApply(raw).ok, false);
});
