# Metrics Shortcut readouts

Complete manual action flows updated 2026-10-19 for OpenHabits Runtime 1.2.2 and the current server contracts. They incorporate the shared-Shortcut audit and the agreed native fixes. Replace the corresponding action flows using these readouts; Git history retains the older versions. These describe corrected target flows, rather than a verbatim dump of existing buggy exports. Updating documentation does not change shared iCloud links or installed Shortcuts. The reconstructed flows have partial native/iPhone verification; the notes below distinguish what was tested.

| Shortcut | Full readout |
| --- | --- |
| Insights | [Setup, logging, cache/Calendar hooks, and Notion](Insights.md) |
| Update Lockout Cache | [Prepare, native HTTP, commit, and status return](Update%20Lockout%20Cache.md) |
| Toggle Timer Template | [Initialization, start/stop, start_overwrite, pending duration, acknowledgement, and screen-time helpers](Toggle%20Timer%20Template.md) |
| Metric(s) Logger Template | [Native logging demo](Metric%28s%29%20Logger%20Template.md) |
| Locked | [Runtime evaluation, preset Title, and blocking/allow flows](Locked.md) |
| Allowed | [Unlock selection and allowed-session handling](Allowed.md) |

Arrows label magic-variable outputs; Set Variable lines are real actions. Read the type notes in each flow. `cacheOK` is numeric 0/1; `ok` and `writeToNotion` are Booleans. Scriptable Run Script uses Run in App Off and Output Type Dictionary unless specified otherwise. The inline Insights installer is [Insights Installer.js](../../Inline%20Scriptable/Insights%20Installer.js); paste the complete source into Run Inline Script and leave Parameter empty. It downloads OpenHabits Runtime and lockouts.js; update existing scripts directly when needed.

Insights logging and timer start/stop remain native. The rebuilt timer uses one Scriptable acknowledgement call to avoid a large native response/state-checking block; it needs the matching Runtime installed. Scriptable is also needed for cache/lockout integration, while plain logging remains native. Update Lockout Cache returns a status Dictionary and never calls the full Calendar Alarm Engine. The optional Insights Engine hook requires the [companion Calendar Alarms changes](https://github.com/CopperPanMan/Calendar-Alarms-for-iOS/pull/121), which interpret a metric response as completion-only cleanup. Calendar Alarms Actions consumes this cache status.

The original handwritten transcriptions and legacy installer remain in `source-transcriptions/` for provenance. They can contain omissions or superseded behavior; use the full readouts above to rebuild. Current sharing links are on [Downloads](../downloads.md). Optional app, wallpaper, calendar, and Focus actions should be customized on the device.

Prefer short native flows when choosing between equivalent designs, including moving parsing/state work into the existing Runtime. These readouts reflect the six rebuilt core shortcuts; personalized loggers and timers are outside this update. Keep working native behavior when a minor action-count reduction would require disproportionate rebuilding. The timer's acknowledgement/state update uses one helper call; device actions and HTTP stay native.

The [native interface v1](../native-shortcut-interface.md) records the commands, types, and compatibility rules to preserve across future script releases. Saved native-request fixtures exercise these calls so code changes do not silently require another native rebuild.

Native rebuild conventions: after a Scriptable call expected to return a Dictionary, explicitly use **Get Dictionary from Input** on its output and bind subsequent actions to that Dictionary. Text guards marked `[blank]` mean **is / is not** with a truly empty comparison field, after Text coercion; collection/file presence and numeric/Boolean comparisons retain their own types. This avoids blank notification banners from missing dictionary fields. Device-only actions and personal app/calendar/Focus/wallpaper choices must be selected on iPhone. The manual flows omit device identifiers and personal selections.

Rebuild verification (October 2026): cache refresh returned `cacheOK = 1` without a blank notification; timestamp and numeric replacement writes succeeded; a duration timer added the expected short interval and passed acknowledgement/repeated start-stop checks. Lockout routes, all optional device actions, and every logging type have not all received disposable end-to-end tests. Runtime and lockouts sources already match this repository and are unchanged by the readout update. Published download links are unchanged.
