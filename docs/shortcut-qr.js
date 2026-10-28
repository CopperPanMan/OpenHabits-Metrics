(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.OpenHabitsShortcutQr = api;
}(typeof window !== 'undefined' ? window : globalThis, function () {
  const PREFIX = 'shortcuts://run-shortcut?name=';

  function normalizeShortcutName(value) {
    return String(value || '').trim();
  }

  function buildShortcutUrl(value) {
    const name = normalizeShortcutName(value);
    if (!name) throw new Error('Enter a Shortcut name first.');
    return PREFIX + encodeURIComponent(name);
  }

  function buildInsightsUrl(metricText, shortcutName) {
    const text = String(metricText || '').trim();
    if (!text) throw new Error('Paste the shortcut-ready metric text first.');
    if (/<[^<>]*provided[\s_]input[^<>]*>/i.test(text)) {
      throw new Error('Replace every input placeholder with a fixed value. To ask for a value when scanned, launch your own logger Shortcut instead.');
    }
    let entries;
    try { entries = JSON.parse(text); }
    catch (_) { throw new Error('Metric text must be valid JSON, such as [["flossed",1]].'); }
    if (!Array.isArray(entries) || !entries.length || entries.some(entry =>
      !Array.isArray(entry) || entry.length < 1 || entry.length > 2 ||
      typeof entry[0] !== 'string' || !/^[A-Za-z0-9][A-Za-z0-9_-]*$/.test(entry[0]) ||
      (entry.length === 2 && typeof entry[1] !== 'string' && !(typeof entry[1] === 'number' && Number.isFinite(entry[1])))
    )) throw new Error('Use a list of metric entries: ["metric_id"] or ["metric_id", value], with a number or quoted text value.');
    return buildShortcutUrl(shortcutName || 'Insights') + '&input=text&text=' + encodeURIComponent(text);
  }

  function needsInput(metric) {
    return ['number', 'text', 'duration'].includes(metric.dataType) && !(metric.dataType === 'number' && metric.inputMode === 'completion');
  }

  function buildShortcutMetricText(metrics) {
    if (!Array.isArray(metrics) || !metrics.length) throw new Error('Select at least one metric first.');
    const entries = metrics.map(metric => {
      const id = normalizeShortcutName(metric && metric.metricID);
      if (!id) throw new Error('Every selected metric needs a metric ID.');
      if (metric.dataType === 'number' && metric.inputMode === 'completion') return JSON.stringify([id, 1]);
      if (!needsInput(metric)) return JSON.stringify([id]);
      if (metric.value !== undefined) {
        const value = metric.dataType === 'number' ? Number(metric.value) : String(metric.value);
        if (metric.dataType === 'number' && (String(metric.value).trim() === '' || !Number.isFinite(value))) throw new Error(`Enter a valid number for ${id}.`);
        return JSON.stringify([id, value]);
      }
      const placeholder = `<${id}_provided_input>`;
      return `[${JSON.stringify(id)},${metric.dataType === 'number' ? placeholder : JSON.stringify(placeholder)}]`;
    });
    return `[${entries.join(',')}]`;
  }

  function init() {
    if (typeof document === 'undefined') return;
    const nameInput = document.getElementById('qrShortcutName');
    const modeInput = document.getElementById('qrLaunchMode');
    const metricTextInput = document.getElementById('qrMetricText');
    const metricTextGroup = document.getElementById('qrMetricTextGroup');
    const modeHint = document.getElementById('qrModeHint');
    const urlInput = document.getElementById('qrLaunchUrl');
    const generateBtn = document.getElementById('qrGenerateBtn');
    const copyBtn = document.getElementById('qrCopyBtn');
    const downloadBtn = document.getElementById('qrDownloadBtn');
    const openLink = document.getElementById('qrOpenLink');
    const preview = document.getElementById('qrPreview');
    const status = document.getElementById('qrStatus');
    const shortcutSearch = document.getElementById('shortcutMetricSearch');
    const shortcutOptions = document.getElementById('shortcutMetricOptions');
    const shortcutSelectionStatus = document.getElementById('shortcutMetricSelectionStatus');
    const shortcutOutput = document.getElementById('shortcutMetricOutput');
    const shortcutStatus = document.getElementById('shortcutMetricStatus');
    const shortcutGenerateBtn = document.getElementById('shortcutTextGenerate');
    const shortcutCopyBtn = document.getElementById('shortcutTextCopy');
    if (!nameInput || !modeInput || !metricTextInput || !generateBtn || !shortcutSearch || !shortcutOptions) return;

    let canvas = null;
    let configuredMetrics = [];
    const selectedMetricIds = new Set();
    const fixedValues = new Map();
    const modeNames = { dedicated: '', insights: 'Insights' };
    let currentMode = modeInput.value;

    function renderShortcutOptions() {
      const query = normalizeShortcutName(shortcutSearch.value).toLowerCase();
      const matches = configuredMetrics.filter(metric =>
        `${metric.displayName || ''} ${metric.metricID || ''}`.toLowerCase().includes(query)
      );
      shortcutOptions.replaceChildren();
      matches.forEach((metric) => {
        if (!metric.metricID) return;
        const label = document.createElement('label');
        label.className = 'metric-option';
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.value = metric.metricID;
        checkbox.checked = selectedMetricIds.has(metric.metricID);
        checkbox.addEventListener('change', () => {
          if (checkbox.checked) selectedMetricIds.add(metric.metricID);
          else selectedMetricIds.delete(metric.metricID);
          shortcutSelectionStatus.textContent = selectedMetricIds.size
            ? `${selectedMetricIds.size} metric${selectedMetricIds.size === 1 ? '' : 's'} selected.`
            : 'No metrics selected.';
          shortcutOutput.value = '';
        });
        const text = document.createElement('span');
        const name = normalizeShortcutName(metric.displayName);
        text.textContent = name && name !== metric.metricID ? `${name} — ${metric.metricID}` : metric.metricID;
        label.append(checkbox, text);
        const row = document.createElement('div');
        row.className = 'shortcut-metric-row';
        row.appendChild(label);
        if (checkbox.checked && needsInput(metric)) {
          const value = document.createElement('input');
          value.type = metric.dataType === 'number' ? 'number' : 'text';
          if (value.type === 'number') value.step = 'any';
          value.placeholder = metric.dataType === 'duration' ? 'Fixed duration, e.g. 00:25:00 (optional)' : `Fixed ${metric.dataType} (optional)`;
          value.setAttribute('aria-label', `Value for ${metric.displayName || metric.metricID}`);
          value.value = fixedValues.get(metric.metricID) ?? '';
          value.addEventListener('input', () => {
            if (value.value === '') fixedValues.delete(metric.metricID);
            else fixedValues.set(metric.metricID, value.value);
            shortcutOutput.value = '';
          });
          row.appendChild(value);
          const hint = document.createElement('p');
          hint.className = 'field-hint metric-input-hint';
          const expectedValue = { number: 'a number, e.g. 2', text: 'text, e.g. A good day', duration: 'elapsed time in HH:MM:SS, e.g. 00:25:00' }[metric.dataType];
          hint.textContent = `Leave blank to generate <${metric.metricID}_provided_input>, then replace it with the magic variable from the input action for ${metric.displayName || metric.metricID}. Expected value: ${expectedValue}. Or enter a fixed value here.`;
          row.appendChild(hint);
        }
        checkbox.addEventListener('change', renderShortcutOptions);
        shortcutOptions.appendChild(row);
      });
      if (!shortcutOptions.children.length) {
        const empty = document.createElement('p');
        empty.className = 'muted metric-option-empty';
        empty.textContent = configuredMetrics.length ? 'No configured metrics match your search.' : 'Add or import a metric to select it here.';
        shortcutOptions.appendChild(empty);
      }
    }

    function selectedShortcutMetrics() {
      return configuredMetrics
        .filter(metric => selectedMetricIds.has(metric.metricID))
        .map(metric => fixedValues.has(metric.metricID) ? { ...metric, value: fixedValues.get(metric.metricID) } : metric);
    }

    function generateShortcutText() {
      try {
        shortcutOutput.value = buildShortcutMetricText(selectedShortcutMetrics());
        shortcutStatus.textContent = selectedShortcutMetrics().some(metric => needsInput(metric) && metric.value === undefined)
          ? 'Each placeholder names its metric. Replace it with the magic variable from that metric’s input action. Value types and quotes are already set.'
          : 'Ready to paste into the Shortcut Text action.';
        return true;
      } catch (error) {
        shortcutOutput.value = '';
        shortcutStatus.textContent = error.message;
        return false;
      }
    }

    function updateConfiguredMetrics(metrics) {
      configuredMetrics = Array.isArray(metrics) ? metrics : [];
      const availableIds = new Set(configuredMetrics.map(metric => metric.metricID));
      [...selectedMetricIds].forEach(id => { if (!availableIds.has(id)) selectedMetricIds.delete(id); });
      shortcutSelectionStatus.textContent = selectedMetricIds.size
        ? `${selectedMetricIds.size} metric${selectedMetricIds.size === 1 ? '' : 's'} selected.`
        : 'No metrics selected.';
      shortcutOutput.value = '';
      renderShortcutOptions();
    }

    function setOutputEnabled(enabled) {
      copyBtn.disabled = !enabled;
      downloadBtn.disabled = !enabled;
      openLink.classList.toggle('disabled', !enabled);
      openLink.setAttribute('aria-disabled', String(!enabled));
      if (!enabled) openLink.removeAttribute('href');
    }

    function drawQr(url, shortcutName) {
      if (typeof qrcode !== 'function') {
        throw new Error('The QR generator could not be loaded. Check your connection and try again.');
      }
      const qr = qrcode(0, 'M');
      qr.addData(url, 'Byte');
      qr.make();

      const quietZone = 4;
      const moduleCount = qr.getModuleCount();
      const moduleSize = Math.max(5, Math.floor(320 / (moduleCount + quietZone * 2)));
      const size = (moduleCount + quietZone * 2) * moduleSize;
      canvas = document.createElement('canvas');
      canvas.width = size;
      canvas.height = size;
      canvas.setAttribute('role', 'img');
      canvas.setAttribute('aria-label', `QR code that launches the Shortcut “${shortcutName}”`);
      const context = canvas.getContext('2d');
      context.fillStyle = '#ffffff';
      context.fillRect(0, 0, size, size);
      context.fillStyle = '#000000';
      for (let row = 0; row < moduleCount; row += 1) {
        for (let col = 0; col < moduleCount; col += 1) {
          if (qr.isDark(row, col)) {
            context.fillRect((col + quietZone) * moduleSize, (row + quietZone) * moduleSize, moduleSize, moduleSize);
          }
        }
      }
      preview.replaceChildren(canvas);
    }

    function generate() {
      try {
        const shortcutName = normalizeShortcutName(nameInput.value);
        if (!shortcutName) throw new Error('Enter a Shortcut name first.');
        const url = modeInput.value === 'insights' ? buildInsightsUrl(metricTextInput.value, shortcutName) : buildShortcutUrl(shortcutName);
        nameInput.value = shortcutName;
        drawQr(url, shortcutName);
        urlInput.value = url;
        openLink.href = url;
        setOutputEnabled(true);
        status.textContent = modeInput.value === 'insights' ? 'QR code generated. It sends the metric text to your installed Insights Shortcut; connection credentials come from your phone’s settings.' : 'QR code generated. Scan it on a device where this Shortcut is installed.';
      } catch (error) {
        canvas = null;
        urlInput.value = '';
        preview.innerHTML = '<p class="muted">Your QR code will appear here.</p>';
        setOutputEnabled(false);
        status.textContent = error.message;
      }
    }

    function clearQr() {
      canvas = null;
      urlInput.value = '';
      preview.innerHTML = '<p class="muted">Your QR code will appear here.</p>';
      status.textContent = '';
      setOutputEnabled(false);
    }

    function updateMode() {
      const insights = modeInput.value === 'insights';
      metricTextGroup.hidden = !insights;
      modeHint.textContent = insights
        ? 'Log metrics without a separate logger Shortcut for each metric. Insights must still be installed and set up on your phone. The QR sends fixed input; it does not ask for values.'
        : 'Launch an installed Shortcut by its exact name. Use this for loggers that ask for input or perform other actions.';
      nameInput.placeholder = insights ? 'Insights' : 'Log Meditation';
    }

    modeInput.addEventListener('change', () => {
      modeNames[currentMode] = nameInput.value;
      currentMode = modeInput.value;
      nameInput.value = modeNames[currentMode];
      updateMode();
      clearQr();
    });
    nameInput.addEventListener('input', clearQr);
    metricTextInput.addEventListener('input', clearQr);
    document.getElementById('qrUseMetricText').addEventListener('click', () => {
      if (!shortcutOutput.value && !generateShortcutText()) return;
      metricTextInput.value = shortcutOutput.value;
      clearQr();
    });
    nameInput.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') generate();
    });
    generateBtn.addEventListener('click', generate);
    shortcutSearch.addEventListener('input', renderShortcutOptions);
    shortcutGenerateBtn.addEventListener('click', generateShortcutText);
    shortcutCopyBtn.addEventListener('click', async () => {
      if (!shortcutOutput.value && !generateShortcutText()) return;
      try {
        await navigator.clipboard.writeText(shortcutOutput.value);
        shortcutStatus.textContent = 'Copied. Replace the Metric Logger Shortcut Text action.';
      } catch (_) {
        shortcutStatus.textContent = 'Clipboard copy failed. Select and copy the generated text manually.';
      }
    });
    copyBtn.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(urlInput.value);
        status.textContent = 'Launch URL copied to clipboard.';
      } catch (_) {
        status.textContent = 'Clipboard copy failed. Select and copy the launch URL manually.';
      }
    });
    downloadBtn.addEventListener('click', () => {
      if (!canvas) return;
      const link = document.createElement('a');
      link.download = `${normalizeShortcutName(nameInput.value).replace(/[^a-z0-9_-]+/gi, '-') || 'shortcut'}-qr.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
      status.textContent = 'QR code downloaded as a PNG.';
    });

    document.addEventListener('openhabits:metrics-changed', event => updateConfiguredMetrics(event.detail));
    document.addEventListener('openhabits:setup-logging', event => {
      const id = event.detail;
      selectedMetricIds.clear();
      shortcutSearch.value = '';
      if (/^[A-Za-z0-9][A-Za-z0-9_-]*$/.test(id || '') && configuredMetrics.filter(metric => metric.metricID === id).length === 1) {
        selectedMetricIds.add(id);
        updateConfiguredMetrics(configuredMetrics);
        generateShortcutText();
      } else {
        updateConfiguredMetrics(configuredMetrics);
        shortcutStatus.textContent = 'Give this metric a valid, unique Metric ID before setting up its logger.';
      }
      shortcutOutput.scrollIntoView({ block: 'center' });
      shortcutOutput.focus({ preventScroll: true });
    });
    updateMode();
    updateConfiguredMetrics(window.OpenHabitsConfiguredMetrics || []);
  }

  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
  }

  return { normalizeShortcutName, buildShortcutUrl, buildInsightsUrl, buildShortcutMetricText };
}));
