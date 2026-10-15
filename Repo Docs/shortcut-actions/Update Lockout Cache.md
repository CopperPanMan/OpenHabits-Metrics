# Update Lockout Cache

Full replacement action readout, 2026-10-15, for OpenHabits Runtime 1.2.2. Input is empty for refresh, `fetch_new_cache` for forced refresh, or a metric response for local patching. Output is the selected prepare/commit **Dictionary**, including numeric `cacheOK` (1 usable, 0 failed/unavailable). The legacy `updatedState` field remains inside that Dictionary.

Arrows label magic-variable outputs; Set Variable lines are real actions. Run Script uses Run in App Off, Output Type Dictionary. This flow fetches/patches cache only. An earlier repository readout called Calendar Alarm Engine in the HTTP branch; the audited shared Shortcut already omits that call. Keep refresh free of Engine/playback calls. Insights forwards successful metric responses to the Engine separately. Updating this file does not update the shared or installed Shortcut.

```text
TEXT: cache_prepare
    -> PrepareCommand
LIST
    Item 1: PrepareCommand (Text)
    Item 2: Shortcut Input
    -> PrepareRequest
RUN SCRIPT: OpenHabits Runtime
    Parameter: PrepareRequest
    -> PrepareResult
SET VARIABLE: CacheStatus = PrepareResult (Dictionary)
GET DICTIONARY VALUE: notification from PrepareResult
IF Dictionary Value has any value
    SHOW NOTIFICATION: Dictionary Value
END IF
GET DICTIONARY VALUE: url from PrepareResult
    -> RequestURL
IF RequestURL has any value
    GET DICTIONARY VALUE: secret from PrepareResult
        -> Secret
    GET DICTIONARY VALUE: clientNow from PrepareResult
        -> ClientNow
    GET CONTENTS OF URL: RequestURL
        Method: POST
        Headers: Content-Type = application/json
        Request Body: JSON
            key: config_snapshot
            secret: Secret
            clientNow: ClientNow
        -> ServerResponse
    TEXT: cache_commit
        -> CommitCommand
    LIST
        Item 1: CommitCommand (Text)
        Item 2: ServerResponse
        -> CommitRequest
    RUN SCRIPT: OpenHabits Runtime
        Parameter: CommitRequest
        -> CommitResult (Dictionary)
    SET VARIABLE: CacheStatus = CommitResult
    GET DICTIONARY VALUE: notification from CommitResult
    IF Dictionary Value has any value
        SHOW NOTIFICATION: Dictionary Value
    END IF
    GET DICTIONARY VALUE: cacheOK from CommitResult
        -> CommitCacheOK (Number)
    IF CommitCacheOK is 1
        IF Shortcut Input does not have any value
            SHOW NOTIFICATION: Updated Cache.
        END IF
    END IF
END IF
STOP AND OUTPUT: CacheStatus (Dictionary)
```
