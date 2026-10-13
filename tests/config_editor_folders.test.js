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
  editor.withHistory(() => editor.renameFolder('metrics', 'Work', 'Office'));
  assert.deepEqual(Array.from(editor.getState().metricFolders), ['Office', 'Health']);
  assert.equal(editor.getState().metricSettings[0].folder, 'Office');
  editor.withHistory(() => editor.addFolder('metrics', 'Personal'));
  const restored = loadEditor(); restored.setState(JSON.parse(JSON.stringify(editor.getState())));
  assert.deepEqual(Array.from(restored.getState().metricFolders), ['Office', 'Health', 'Personal']);
  editor.withHistory(() => editor.removeFolder('metrics', 'Office'));
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
  editor.withHistory(() => editor.moveToFolder('metrics', metric, 'Health'));
  assert.equal(metric.metricID, 'plan');
  assert.equal(metric.dataType, 'timestamp');
  editor.duplicateMetric(metric, 0);
  assert.equal(editor.getState().metricSettings[1].folder, 'Health');
  assert.equal(editor.getState().metricSettings[1].metricID, 'plan_copy');
  editor.withHistory(() => editor.moveToFolder('metrics', editor.getState().metricSettings[0], ''));
  editor.undo();
  assert.equal(editor.getState().metricSettings[0].folder, 'Health');
});

test('ordering moves between siblings even when flat configuration contains other folders', () => {
  const editor = loadEditor(); editor.setState(config());
  editor.withHistory(() => editor.moveSibling('metrics', editor.getState().metricSettings[0], 1));
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
  assert.throws(() => editor.addFolder('metrics', ' work '), /already exists/);
  assert.throws(() => editor.renameFolder('metrics', 'Work', 'Health'), /already exists/);
  assert.throws(() => editor.addFolder('metrics', ' '), /name/);
  assert.throws(() => editor.moveToFolder('metrics', editor.getState().metricSettings[0], 'Missing'), /existing folder/);
  assert.throws(() => editor.setState({ ...config(), metricFolders: 'Work' }), /list/);
  assert.throws(() => editor.setState({ metricSettings: [{ ...config().metricSettings[0], folder: 42 }] }), /name/);
});

function bothLists() {
  return { metricFolders: ['Inbox', 'Empty'], metricSettings: [
    { metricID: 'a', displayName: 'A', dataType: 'number' },
    { metricID: 'b', displayName: 'B', dataType: 'number' },
    { metricID: 'c', displayName: 'C', dataType: 'number' }
  ], lockouts: { blockFolders: ['Inbox', 'Empty'], blocks: [
    { id: 'a', name: 'A', type: 'task_block' },
    { id: 'b', name: 'B', type: 'task_block' },
    { id: 'c', name: 'C', type: 'task_block' }
  ] } };
}

for (const tab of ['metrics', 'blocks']) {
  const items = editor => tab === 'metrics' ? editor.getState().metricSettings : editor.getState().lockouts.blocks;
  const ids = editor => Array.from(items(editor), item => item.metricID || item.id);
  test(`${tab}: drop into/out of folders preserves IDs, content, and rule order with undo/redo`, () => {
    const editor = loadEditor(); editor.setState(bothLists());
    const original = JSON.stringify(items(editor));
    const key = editor.itemUiKey(items(editor)[1]);
    editor.withHistory(() => assert.ok(editor.dropEntry(tab, { key }, { kind: 'folder', name: 'Inbox' })));
    assert.equal(items(editor)[1].folder, 'Inbox');
    assert.deepEqual(ids(editor), ['a', 'b', 'c']);
    editor.undo(); assert.equal(JSON.stringify(items(editor)), original);
    editor.redo(); assert.equal(items(editor)[1].folder, 'Inbox');
    editor.withHistory(() => editor.removeFolder(tab, 'Inbox'));
    assert.equal(items(editor)[1].folder, undefined);
    assert.deepEqual(ids(editor), ['a', 'b', 'c']);
    editor.undo(); assert.equal(items(editor)[1].folder, 'Inbox');
    editor.withHistory(() => assert.ok(editor.dropEntry(tab, { key }, { kind: 'root' })));
    assert.equal(items(editor)[1].folder, undefined);
    assert.deepEqual(ids(editor), ['a', 'b', 'c']);
  });

  test(`${tab}: folder positions among cards persist through rename, export/import and removal`, () => {
    const editor = loadEditor(); editor.setState(bothLists());
    editor.withHistory(() => editor.dropEntry(tab, { folder: 'Inbox' }, { kind: 'root', token: 'item:b', after: true }));
    editor.withHistory(() => editor.renameFolder(tab, 'Inbox', 'Projects'));
    editor.withHistory(() => editor.addFolder(tab, 'Personal'));
    const order = Array.from(editor.rootOrder(tab));
    assert.ok(order.indexOf('folder:Projects') > order.indexOf('item:b'));
    assert.ok(order.indexOf('folder:Projects') < order.indexOf('item:c'));
    assert.ok(order.includes('folder:Empty'));
    assert.deepEqual(ids(editor), ['a', 'b', 'c'], 'folder reordering does not reorder rules');
    const restored = loadEditor(); restored.setState(JSON.parse(JSON.stringify(editor.getState())));
    assert.deepEqual(Array.from(restored.rootOrder(tab)), order);
    editor.withHistory(() => editor.removeFolder(tab, 'Projects'));
    assert.ok(!editor.rootOrder(tab).includes('folder:Projects'));
    editor.undo(); assert.deepEqual(Array.from(editor.rootOrder(tab)), order);
  });

  test(`${tab}: explicitly reordering cards changes flat order and can move between folders`, () => {
    const editor = loadEditor(); editor.setState(bothLists());
    editor.moveToFolder(tab, items(editor)[0], 'Inbox');
    const key = editor.itemUiKey(items(editor)[2]), target = editor.itemUiKey(items(editor)[0]);
    editor.withHistory(() => editor.dropEntry(tab, { key }, { kind: 'item', key: target, after: false }));
    assert.deepEqual(ids(editor), ['c', 'a', 'b']);
    assert.equal(items(editor)[0].folder, 'Inbox');
    editor.undo(); assert.deepEqual(ids(editor), ['a', 'b', 'c']);
  });
}

test('renaming metric IDs preserves root tile positions and removes stale layout references', () => {
  const editor = loadEditor(); editor.setState(bothLists());
  editor.addFolder('metrics', 'Last');
  const before = Array.from(editor.rootOrder('metrics'));
  editor.withHistory(() => editor.setMetricId(editor.getState().metricSettings[1], 'renamed'));
  assert.deepEqual(Array.from(editor.rootOrder('metrics')), before.map(token => token === 'item:b' ? 'item:renamed' : token));
  editor.undo(); assert.deepEqual(Array.from(editor.rootOrder('metrics')), before);
  const raw = bothLists(); raw.editorLayout = { blocks: ['folder:Missing', 'item:gone', 'item:c'] };
  editor.setState(raw);
  assert.deepEqual(Array.from(editor.rootOrder('blocks')), ['item:c', 'folder:Inbox', 'folder:Empty', 'item:a', 'item:b']);
  assert.throws(() => editor.setState({ ...bothLists(), editorLayout: { blocks: [42] } }), /list/);
});

test('duplicated blocks retain folder membership with their own identity and adjacent rule priority', () => {
  const editor = loadEditor(); editor.setState(bothLists());
  const original = editor.getState().lockouts.blocks[1];
  editor.moveToFolder('blocks', original, 'Inbox');
  editor.addFolder('blocks', 'Last');
  editor.withHistory(() => editor.duplicateBlock(original, 1));
  const copy = editor.getState().lockouts.blocks[2];
  assert.equal(copy.id, 'b_copy');
  assert.equal(copy.folder, 'Inbox');
  assert.notEqual(editor.itemUiKey(copy), editor.itemUiKey(original));
  assert.deepEqual(Array.from(editor.getState().lockouts.blocks, block => block.id), ['a', 'b', 'b_copy', 'c']);
  editor.undo(); assert.deepEqual(Array.from(editor.getState().lockouts.blocks, block => block.id), ['a', 'b', 'c']);
});
