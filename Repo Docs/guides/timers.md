# Track time

The [setup demo](../setup.md#time-a-session) uses **Toggle Timer Template** itself, preloaded with `[["time_working"]]`. Run it once to start and again to stop; completed sessions add to **Time Working** in the Sheet.

Before using the current timer, complete [Prepare Scriptable](../setup.md#prepare-scriptable): install **OpenHabits Runtime** and create its **Shortcuts** file bookmark. The timer needs these to confirm a recording even when app protection and Calendar Alarms are not in use.

## Make your own timer

Add a duration metric in the Config Editor and choose additive recording if sessions should accumulate. Duplicate your installed **Toggle Timer Template**, replace its configured metric ID, and confirm its recording action calls **Insights**. Test a short session before adding automations.

Each shortcut contains **Comment blocks with instructions**. The timer template's blocks explain its configuration and identify optional calendar events, Focus changes, wallpapers, or native countdown timers. Choose the actions you want in your copy; no separate demo shortcut is needed.

Passing `start` or `stop` as Shortcut input requests that operation explicitly. With no input, it toggles. Starting alone does not write a duration; stopping submits the elapsed value. For automatic protected-app timing, see [Screen-time allowance](ios-lockouts.md#add-a-screen-time-allowance).

The [updated timer readout](../shortcut-actions/Toggle%20Timer%20Template.md) also accepts `start_overwrite`: start fresh now even if an interval is already running. This discards that active interval without logging it and keeps completed pending seconds. Ordinary `start` still does nothing while running. In an existing timer, add `Shortcut Input is not start_overwrite` as a Text comparison to its main running-state condition and choose **All**. Updating these docs does not update your installed Shortcut.

For screen time, name the configured timer **Toggle Screen Time Timer**. Make **Start Screen Time Timer** call it with input `start_overwrite` at each new allowed app session and **Stop Screen Time Timer** call it with input `stop`. Add support for the new input to the installed timer first; an unmodified timer may interpret it as a toggle and stop an active interval. Configure the start helper inside **Allowed**, and the stop helper in an app-closed automation for all protected apps. The linked screen-time guide includes the temporary-unlock wiring and a test session; the [timer readout](../shortcut-actions/Toggle%20Timer%20Template.md#screen-time-helper-readouts) shows both helper action flows.

Each allowed app opening will then start a fresh interval even if a missed app-close automation left the timer running. Use this helper only if every call marks a new session; callers used for blind repeated starts should retain `start`. A missed stop followed by a successful overwrite and a later stop will no longer count the intervening hours. For example, start at 09:00, miss the stop, reopen at 14:00, then stop at 14:05: the new interval contributes five minutes. The unfinished earlier interval is discarded. A stop arriving before any new overwrite still uses the old timestamp, and completed pending durations can still be submitted later.

Timer state lives at `iCloud Drive/Shortcuts/OpenHabits/OpenHabits Metrics/timerStates.json`. Avoid operating the same timer simultaneously from two devices. If submission fails, check the Sheet before retrying an additive duration, since the server may already have received it.

[Developer review notes](../runtime-review-notes.md#toggle-timer) record outstanding recovery issues in the historical timer transcription. Shared native shortcuts still need verification before publication.

When rebuilding the current template, store start timestamps in **RFC 2822**, keep the stopped-state sentinel as the literal Text `null`, and use the [current timer readout](../shortcut-actions/Toggle%20Timer%20Template.md). ISO numeric-offset parsing in Get Dates from Input produced incorrect durations in native tests. A short on-device duration write and acknowledgement passed after this correction; simultaneous runs and uncertain-response retries remain limitations.
