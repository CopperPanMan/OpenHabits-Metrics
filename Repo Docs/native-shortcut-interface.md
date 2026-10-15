# Native Shortcut interface v1

The complete [action readouts](shortcut-actions/index.md) define the native interface for OpenHabits Runtime 1.2.2. This is a compatibility baseline for future code updates, not a new request parameter. Install the matching Runtime/native flows for this migration, then preserve their existing calls.

Keep command names, List positions, response keys, types, and meanings stable. New inputs are optional with compatible defaults; extra output keys are allowed. Preserve the existing adapter when adding an incompatible command. The script version can advance without requiring native edits. Retain the POST/shared-secret server contract; plain metric logging stays native.

| Native call | Stable return |
| --- | --- |
| `app_open` / `["app_open", Shortcut Input]` | Dictionary with `route` Text (`allow`, `block`, `evaluate`), notification Text when appropriate, and existing grant/evaluation fields |
| `["evaluator_input", OpenResult, PresetTitle]` | JSON Text for lockouts.js, including `cache` and `presetOverride` |
| `begin_legitimate` / `begin_penalty` | Dictionary with notification Text |
| `["cache_prepare", original input]` | Dictionary retaining legacy `updatedState` (Number 1 or empty Text), plus numeric `cacheOK` 0/1; `url`, `secret`, and `clientNow` Text when native HTTP is required |
| `["cache_commit", native HTTP response]` | Dictionary with numeric `cacheOK` 0/1 and notification Text on rejection |
| `["timer_ack", metric ID, submitted seconds, recording response]` | Dictionary with numeric `acknowledged` 0/1, `remainingPending` Number on acknowledgement, and notification Text |

Cache and recording responses accept Dictionary or JSON Text. Update Lockout Cache returns its entire selected status Dictionary; Calendar Alarms Actions reads numeric `cacheOK`. The old `updatedState` field remains supported inside Runtime results. `ok` and recording `writeToNotion` are Booleans, not numeric status fields. Preserve `metricsByID` capitalization and the first recording response as Insights' final result.

Tests use saved examples from `tests/fixtures/native-shortcut-v1.json` to exercise existing List calls, legacy outputs, and response types. They complement behavioral tests for cache freshness, task completion, and timer state. Keep these fixtures as compatibility checks when editing code; change them only for an intentional, documented native migration. Calendar Alarms' matching baseline is documented in its companion PR. Native type conversion, device actions, and iOS scheduling still need phone verification.
