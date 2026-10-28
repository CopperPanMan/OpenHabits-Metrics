const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

// Exercise the generator's DOM event handlers without a browser or network.
function loadGenerator(metrics) {
  class Element {
    constructor() { this.children = []; this.listeners = {}; this.value = ''; this.classList = { toggle() {} }; }
    append(...children) { this.children.push(...children); }
    appendChild(child) { this.append(child); }
    replaceChildren(...children) { this.children = children; }
    setAttribute(name, value) { this[name] = value; }
    removeAttribute(name) { delete this[name]; }
    addEventListener(name, handler) { (this.listeners[name] ||= []).push(handler); }
    fire(name) { for (const handler of this.listeners[name] || []) handler({ target: this }); }
    scrollIntoView() { this.scrolled = true; }
    focus() { this.focused = true; }
  }
  const html = fs.readFileSync(path.join(__dirname, '../docs/index.html'), 'utf8');
  const elements = Object.fromEntries(Array.from(html.matchAll(/id="([^"]+)"/g), match => [match[1], new Element()]));
  elements.qrLaunchMode.value = 'dedicated';
  const listeners = {};
  const document = {
    readyState: 'complete', getElementById: id => elements[id], createElement: () => new Element(),
    addEventListener: (name, handler) => { listeners[name] = handler; }
  };
  const context = vm.createContext({ document, window: { OpenHabitsConfiguredMetrics: metrics } });
  vm.runInContext(fs.readFileSync(path.join(__dirname, '../docs/shortcut-qr.js'), 'utf8'), context);
  return { elements, dispatch: (name, detail) => listeners[name]({ detail }) };
}

const metrics = [
  { metricID: 'flossed', displayName: 'Flossed', dataType: 'number', inputMode: 'completion' },
  { metricID: 'water', displayName: 'Water', dataType: 'number' },
  { metricID: 'started', displayName: 'Started', dataType: 'timestamp' }
];

test('logging handoff replaces an earlier selection, clears search and focuses ready-to-copy text', () => {
  const { elements, dispatch } = loadGenerator(metrics);
  dispatch('openhabits:setup-logging', 'water');
  assert.equal(elements.shortcutMetricOutput.value, '[["water",<water_provided_input>]]');
  elements.shortcutMetricSearch.value = 'water';
  elements.shortcutMetricSearch.fire('input');
  dispatch('openhabits:setup-logging', 'flossed');
  assert.equal(elements.shortcutMetricSearch.value, '');
  assert.equal(elements.shortcutMetricOutput.value, '[["flossed",1]]');
  assert.equal(elements.shortcutMetricSelectionStatus.textContent, '1 metric selected.');
  assert.equal(elements.shortcutMetricOptions.children.length, 3);
  assert.equal(elements.shortcutMetricOutput.scrolled, true);
  assert.equal(elements.shortcutMetricOutput.focused, true);
  assert.match(elements.shortcutMetricStatus.textContent, /Ready to paste/);
});

test('logging handoff uses current metric types and clears stale output for removed metrics', () => {
  const { elements, dispatch } = loadGenerator(metrics);
  dispatch('openhabits:setup-logging', 'flossed');
  dispatch('openhabits:metrics-changed', [{ metricID: 'new_start', dataType: 'timestamp' }]);
  dispatch('openhabits:setup-logging', 'new_start');
  assert.equal(elements.shortcutMetricOutput.value, '[["new_start"]]');
  dispatch('openhabits:setup-logging', 'flossed');
  assert.equal(elements.shortcutMetricOutput.value, '');
  assert.equal(elements.shortcutMetricSelectionStatus.textContent, 'No metrics selected.');
});

test('invalid or duplicate metric IDs cannot produce an ambiguous logger', () => {
  for (const metricID of ['', 'bad id', 'duplicate']) {
    const { elements, dispatch } = loadGenerator([
      { metricID, dataType: 'timestamp' }, { metricID: 'duplicate', dataType: 'timestamp' }
    ]);
    dispatch('openhabits:setup-logging', metricID);
    assert.equal(elements.shortcutMetricOutput.value, '');
    assert.match(elements.shortcutMetricStatus.textContent, /valid, unique Metric ID/);
  }
});
