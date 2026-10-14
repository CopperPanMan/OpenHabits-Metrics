# Metrics Shortcut readouts

Complete manual action flows updated 2026-10-14 for OpenHabits Runtime 1.2.2 and the current server contracts. They incorporate the shared-Shortcut audit and the agreed native fixes. Replace the corresponding action flows using these readouts; Git history retains the older versions. These describe corrected target flows, rather than a verbatim dump of existing buggy exports. Updating documentation does not change shared iCloud links or installed Shortcuts, and the rebuilt flows need device verification.

| Shortcut | Full readout |
| --- | --- |
| Insights | [Setup, logging, cache/Calendar hooks, and Notion](Insights.md) |
| Update Lockout Cache | [Prepare, native HTTP, commit, and status return](Update%20Lockout%20Cache.md) |
| Toggle Timer Template | [Initialization, start/stop, pending duration, optional actions, and acknowledgement](Toggle%20Timer%20Template.md) |
| Metric(s) Logger Template | [Native logging demo](Metric%28s%29%20Logger%20Template.md) |
| Locked | [Runtime evaluation, preset Title, and blocking/allow flows](Locked.md) |
| Allowed | [Unlock selection and allowed-session handling](Allowed.md) |

Arrows label magic-variable outputs; Set Variable lines are real actions. Read the type notes in each flow. `cacheOK` is numeric 0/1; `ok` and `writeToNotion` are Booleans. Scriptable Run Script uses Run in App Off and Output Type Dictionary unless specified otherwise. The inline Insights installer is [Insights Installer.js](../../Inline%20Scriptable/Insights%20Installer.js); paste the complete source into Run Inline Script and leave Parameter empty. It downloads OpenHabits Runtime and lockouts.js; update existing scripts directly when needed.

Insights logging and timer start/stop remain native. The rebuilt timer uses one Scriptable acknowledgement call to avoid a large native response/state-checking block; it needs the matching Runtime installed. Scriptable is also needed for cache/lockout integration, while plain logging remains native. Update Lockout Cache returns a status Dictionary and never calls the full Calendar Alarm Engine. The optional Insights Engine hook requires the [companion Calendar Alarms changes](https://github.com/CopperPanMan/Calendar-Alarms-for-iOS/pull/121), which interpret a metric response as completion-only cleanup. Calendar Alarms Actions consumes this cache status.

The original handwritten transcriptions and legacy installer remain in `source-transcriptions/` for provenance. They can contain omissions or superseded behavior; use the full readouts above to rebuild. Current sharing links are on [Downloads](../downloads.md). Optional app, wallpaper, calendar, and Focus actions should be customized on the device.

Prefer short native flows when choosing between equivalent designs, including moving parsing/state work into the existing Runtime. These readouts are proposed rebuilds; they are not a claim that all helper flows have already been adopted on-device. Keep working native behavior when a minor action-count reduction would require disproportionate rebuilding. The timer's acknowledgement/state update uses one helper call; device actions and HTTP stay native.
