## Folder tiles for metrics and blocks

- Folders appear as cards in both lists, with Create folder, rename/removal, counts, and open/close controls.
- Mouse/touch drag-and-drop moves cards into closed folders, out into the main list, or between cards; folder tiles can also be reordered among main-list cards.
- Folder membership, empty folders, and tile positions survive copy/save/reimport and support Undo/Redo.
- Search temporarily reveals matches inside folders, then restores their collapsed state; validation opens the affected folder and field.
- Block headers show evaluation priority. Folder organization preserves rule order; explicitly reordering block cards changes priority.

## Desktop reliability and editor organization

- Chrome allows website access when a configured lockouts server is unavailable or returns an error; actual rule blocks and local blocking without a server URL still apply.
- Server attempts time out after three seconds, and metric logging never delays website navigation or temporary unlocks.
- QR launch modes now use an exact Shortcut name or pasted metric text for Insights, including multiple metrics and fixed values. Unresolved input placeholders are rejected.
- Generated input placeholders identify their metric and explain which input action's magic variable to use.
- Metrics can be organized into saved, single-level folders with search, move, rename, removal, undo/redo, and validation navigation.

## Lockouts cache virtual-day windows

- Prevented client-timezone `config_snapshot` responses from accepting stale task values merely because they exist in an adjacent date column.
- Timestamped task completions now use exact effective-day window membership across adjacent physical columns.
- Non-timestamp task completions retain spreadsheet day semantics and use a documented, lenient physical-day-end inference when projected across timezones.
- Virtual-day and per-metric metadata now expose the evaluated window and whether a completion instant was stored or inferred.
