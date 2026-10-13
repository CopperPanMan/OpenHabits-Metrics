# Create and log metrics

[Feature guides](../features.md) · [Setup](../setup.md)

A metric stores one resulting value each day. Repeated recordings replace, retain, or add to that value according to its settings.

## Create a metric

Use the Config Editor to choose the value type and how repeated recordings behave, then **Save and Apply** in the Sheet panel. Keep the generated Metric ID unless you want a different one; your logger uses that ID.

Loaded metrics start collapsed. Each header shows the type and whether points and streaks are enabled. Open a header to edit its fields; advanced sections stay collapsed until you open them. Search or use **Expand All / Collapse All** to navigate a larger configuration. Use each header’s grab handle to reorder metrics with a mouse or touch, or use the up/down arrows. New or duplicated metrics open automatically. Shared logging settings, Sheet columns, and integrations live under the collapsed **Metric Settings** section at the top.

Select **Create folder** beside **Add metric**, enter a name on the new folder tile, and select **Save name**. Drag a metric onto the middle of a folder header to move it inside, including when the folder is closed. Click a folder header to open or close it. Drag a child back between main-list tiles, or onto the main-list drop area that appears while dragging, to move it out. An insertion line shows a reorder destination; a highlighted folder shows a move inside. The **Move to folder** field also works without dragging.

Folder tiles can be reordered among the main-list cards and renamed or removed using their header buttons. Removing a folder returns its metrics to the main list. Folders have one level. Search finds metrics and folder names across the list, temporarily opening matching folders and restoring your collapsed state when cleared. Folder membership, empty folders, and tile positions are saved with your configuration and survive copy/save/reimport; changes support Undo/Redo without changing metric IDs or Sheet history.

| Track | Recipe/type | Example logger Text |
| --- | --- | --- |
| A task you completed | Completion | `[["flossed",1]]` |
| A count or rating | Number | `[["mood",8]]` |
| A note | Text | `[["daily_note","A good day"]]` |
| When something happened | Timestamp | `[["last_drank"]]` |
| Elapsed time | Duration | `[["time_working","00:25:00"]]` |

The IDs in these examples must exist in your configuration. The **Done / not done** recipe stores a number and marks the metric as a completion so the generator supplies `1` automatically. For an older completion metric, choose **Done / not done** under **What are you tracking?**; ordinary numeric metrics keep accepting input. A timestamp records the current time without a supplied value. A duration value uses `HH:MM:SS` (hours:minutes:seconds).

## Make its logger

1. Duplicate your installed **Metric(s) Logger Template** and rename it.
2. In the editor's **Shortcut-ready metric text**, select the metric and generate/copy its text.
3. Paste it into the logger's **Text** action. The generator uses the configured type: completion sends `1`, timestamps need no value, and numbers, text, and durations receive a placeholder named for their metric, such as `<mood_provided_input>`. Confirm **Run Shortcut** calls **Insights**.
4. Run it, then check the matching Sheet cell.

The shortcut's **Comment blocks** contain instructions for configuring its actions and optional integrations.

For a value you enter each time, add **Ask for Input** before Text. Replace `<mood_provided_input>` with the actual **Provided Input** magic-variable token from the action that collects your mood rating. Do this separately for each metric's named placeholder; the placeholder itself is not a variable. The generator sets numbers and string quotes for you. You can enter a fixed value beside a selected metric instead; the generator serializes it as JSON, including any quotes, backslashes, or line breaks. For example, a rating has the structure `[["mood",8]]`; a duration has the structure `[["time_working","00:25:00"]]`.

For free-form text containing quotation marks, backslashes, or newlines, build the metric entries with native List actions and serialize them as JSON before passing them to Insights; interpolating that text into a JSON Text action does not escape it automatically.

To log several metrics at once, select them together in the generator, or use:

```json
[["flossed",1],["mood",8],["daily_note","A good day"]]
```

You can select several value-bearing metrics together. Replace each named placeholder with its matching input variable. **Launch Insights with metric input** QR codes support completions, timestamps, and fixed values pasted from the generator. Use **Launch your shortcut by name** when the logger needs to collect a value at runtime.

## Schedules and completion

In **Advanced → Date Rules**, choose the days that should count toward the metric's scheduled streak. A missing schedule means every day. Logging outside those days is still possible; the schedule is not a general recording lock.

For a deadline, use the **Due-by task** recipe, add a date rule for each applicable weekday, and set its **Due By** time. Test before and after that time. A late `keep_first` recording makes no write; late `overwrite` clears that day's value and its points. The due time is a deadline, not an alarm; use [Calendar Alarms](calendar-alarms.md) to schedule reminders.

Completion means the effective day's cell is nonempty, not that it meets a numeric target. A logged `0` counts as complete. To block apps until a task is done, use a separate completion/timestamp metric instead of expecting a count to reach a goal.

Changing a saved Metric ID requires updating its loggers and rule references; the old history row is retained. See [Maintenance](maintenance.md).
