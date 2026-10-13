const assert = require('node:assert/strict');
const test = require('node:test');
const { loadEditor } = require('./helpers/config_editor_fixture');
const config = () => ({ metricFolders: ['Work', 'Health'], metricSettings: [
  { metricID: 'plan', displayName: 'Plan', dataType: 'timestamp', folder: 'Work' },
  { metricID: 'water', displayName: 'Water', dataType: 'number', folder: 'Health' },
  { metricID: 'focus', displayName: 'Focus', dataType: 'duration', folder: 'Work' }
] });

test('folder membership and empty folders survive config round-trips, rename, removal and undo', () => {
  const editor = loadEditor(); editor.setState(config());
  const ids = () => Array.from(editor.getState().metricSettings, metric => metric.metricID);
  const key = editor.itemUiKey(editor.getState().metricSettings[0]);
  editor.withHistory(() => editor.renameMetricFolder('Work', 'Office'));
  assert.deepEqual(Array.from(editor.getState().metricFolders), ['Office', 'Health']);
  assert.equal(editor.getState().metricSettings[0].folder, 'Office');
  editor.withHistory(() => editor.addMetricFolder('Personal'));
  const restored = loadEditor(); restored.setState(JSON.parse(JSON.stringify(editor.getState())));
  assert.deepEqual(Array.from(restored.getState().metricFolders), ['Office', 'Health', 'Personal']);
  editor.withHistory(() => editor.removeMetricFolder('Office'));
  assert.equal(editor.getState().metricSettings[0].folder, undefined);
  assert.deepEqual(ids(), ['plan', 'water', 'focus']);
  editor.undo();
  assert.equal(editor.getState().metricSettings[0].folder, 'Office');
  assert.equal(editor.itemUiKey(editor.getState().metricSettings[0]), key);
  editor.redo();
  assert.equal(editor.getState().metricSettings[0].folder, undefined);
});

test('moving and duplicating preserve metric IDs, settings and folder membership', () => {
  const editor = loadEditor(); editor.setState(config());
  const metric = editor.getState().metricSettings[0];
  editor.withHistory(() => editor.moveMetricToFolder(metric, 'Health'));
  assert.equal(metric.metricID, 'plan');
  assert.equal(metric.dataType, 'timestamp');
  editor.duplicateMetric(metric, 0);
  assert.equal(editor.getState().metricSettings[1].folder, 'Health');
  assert.equal(editor.getState().metricSettings[1].metricID, 'plan_copy');
  editor.withHistory(() => editor.moveMetricToFolder(editor.getState().metricSettings[0], ''));
  editor.undo();
  assert.equal(editor.getState().metricSettings[0].folder, 'Health');
});

test('ordering moves between siblings even when flat configuration contains other folders', () => {
  const editor = loadEditor(); editor.setState(config());
  editor.withHistory(() => editor.moveMetric(editor.getState().metricSettings[0], 1));
  assert.deepEqual(Array.from(editor.getState().metricSettings, metric => metric.metricID), ['focus', 'water', 'plan']);
  assert.equal(editor.getState().metricSettings[1].folder, 'Health');
  editor.undo();
  assert.deepEqual(Array.from(editor.getState().metricSettings, metric => metric.metricID), ['plan', 'water', 'focus']);
});

test('imports recover membership-only folders and reject invalid metadata or duplicate creation', () => {
  const editor = loadEditor();
  const raw = config(); delete raw.metricFolders;
  editor.setState(raw);
  assert.deepEqual(Array.from(editor.getState().metricFolders), ['Work', 'Health']);
  assert.throws(() => editor.addMetricFolder(' work '), /already exists/);
  assert.throws(() => editor.renameMetricFolder('Work', 'Health'), /already exists/);
  assert.throws(() => editor.addMetricFolder(' '), /name/);
  assert.throws(() => editor.moveMetricToFolder(editor.getState().metricSettings[0], 'Missing'), /existing folder/);
  assert.throws(() => editor.setState({ ...config(), metricFolders: 'Work' }), /list/);
  assert.throws(() => editor.setState({ metricSettings: [{ ...config().metricSettings[0], folder: 42 }] }), /name/);
});
