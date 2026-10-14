# Toggle Timer Template

Full replacement action readout, 2026-10-14, based on the audited shared template, with the recording acknowledgement fix. It includes initialization, native start/stop behavior, durable pending time, optional actions, and submission to Insights. Updating this file does not update the shared or installed Shortcut. Native start/stop and HTTP recording are retained. One `timer_ack` call to OpenHabits Runtime 1.2.2 validates the response and clears only confirmed pending time, avoiding a long native acknowledgement ladder. Install the matching Runtime and its Shortcuts bookmark before rebuilding this timer.

Arrows name magic variables; Set Variable lines are real actions. Use Number values for state flags and pending seconds. File paths below are relative to the Shortcuts folder. Save File always has Ask Where to Save Off and Overwrite On. Bind every Set Dictionary Value to the preceding updated Dictionary; do not repeatedly bind to the original file.

The configured metric Text identifies one duration metric. Use additive recording if sessions should accumulate. Explicit `start` while running and `stop` while stopped do nothing, as in the shared template. A failed or unconfirmed submission keeps pending seconds; another start/stop cycle can submit them with the next interval. Check the Sheet first because a timed-out request may already have written. Simultaneous runs/devices can still race file writes; this flow does not add transactions or automatic retries.

```text
COMMENT:
    Run once to start timing and again to stop and add elapsed time to
    Time Working. Starting alone does not write a duration to the Sheet.
    Duplicate this template for another duration metric and replace its ID.
    Input "start" or "stop" requests that operation instead of toggling.
    Choose optional calendar, Focus, wallpaper, and timer actions below.
TEXT: [["time_working"]]
    -> ConfiguredMetric
REPLACE TEXT:
    Input: ConfiguredMetric
    Find: [["
    Replace With: [empty]
    Regular Expression: Off
    -> UnwrappedMetric
REPLACE TEXT:
    Input: UnwrappedMetric
    Find: "]]
    Replace With: [empty]
    Regular Expression: Off
    -> MetricID (Text)
GET FILE FROM SHORTCUTS:
    Path: /OpenHabits/OpenHabits Metrics/timerStates.json
    Error If Not Found: Off
    -> StateFile
CURRENT DATE
    -> Now
IF StateFile has any value
    GET DICTIONARY FROM INPUT: StateFile
        -> LoadedState
    SET VARIABLE: State = LoadedState (Dictionary)
OTHERWISE
    DICTIONARY: [empty dictionary]
    SET VARIABLE: State = Dictionary
END IF
GET DICTIONARY VALUE: [MetricID]_startTime from State
    -> StartTime (Text)
NUMBER: 0
SET VARIABLE: TimerRunning = Number
IF StartTime has any value
    IF StartTime is not null (the literal Text "null")
        NUMBER: 1
        SET VARIABLE: TimerRunning = Number
    END IF
END IF
GET DICTIONARY VALUE: [MetricID]_pendingSeconds from State
    -> StoredPending (Number)
IF StoredPending has any value
    SET VARIABLE: PendingSeconds = StoredPending
OTHERWISE
    NUMBER: 0
    SET VARIABLE: PendingSeconds = Number
END IF

IF TimerRunning is 1
    IF Shortcut Input is start
        STOP THIS SHORTCUT
    END IF
    GET DATES FROM INPUT: StartTime
        -> StartTimeDate (Date)
    GET TIME BETWEEN DATES:
        From: StartTimeDate
        To: Now
        Unit: Seconds
        -> ElapsedSeconds
    CALCULATE: ElapsedSeconds + PendingSeconds
        -> Duration (Number)
    SET DICTIONARY VALUE:
        Dictionary: State
        Key: [MetricID]_pendingSeconds
        Value: Duration (Number)
        -> StateWithPending
    SET DICTIONARY VALUE:
        Dictionary: StateWithPending
        Key: [MetricID]_startTime
        Value: null (literal Text, not a magic variable)
        -> StoppedState
    SAVE FILE: StoppedState
        Folder: Shortcuts
        Path: /OpenHabits/OpenHabits Metrics/timerStates.json
        Ask Where to Save: Off
        Overwrite If File Exists: On
    NUMBER: 0
    SET VARIABLE: StartingTimer = Number

    COMMENT:
        Optional calendar event block. Delete this If and its contents if
        unwanted; otherwise choose your calendar in Add New Event below.
        Pending duration is already saved before any optional UI/network work.
    IF StartTimeDate is not in the last 5 minutes
        ASK FOR INPUT: Text
            Prompt: Task worked on:
            -> TaskTitle
        ADD NEW EVENT:
            Title: TaskTitle
            Start Date: StartTimeDate
            End Date: Now
            Calendar: Timeblocks (select your calendar)
            Show Compose Sheet: Off
    END IF
OTHERWISE
    IF Shortcut Input is stop
        STOP THIS SHORTCUT
    END IF
    FORMAT DATE:
        Input: Now
        Format: ISO 8601
        Include Time: On
        -> StartTimestamp (Text)
    SET DICTIONARY VALUE:
        Dictionary: State
        Key: [MetricID]_startTime
        Value: StartTimestamp (Text)
        -> StateWithStart
    SET DICTIONARY VALUE:
        Dictionary: StateWithStart
        Key: [MetricID]_pendingSeconds
        Value: PendingSeconds (Number)
        -> StartedState
    SAVE FILE: StartedState
        Folder: Shortcuts
        Path: /OpenHabits/OpenHabits Metrics/timerStates.json
        Ask Where to Save: Off
        Overwrite If File Exists: On
    NUMBER: 1
    SET VARIABLE: StartingTimer = Number
END IF

IF StartingTimer is 1
    COMMENT:
        Optional start actions. Add, edit, or remove the following actions
        without changing the state/submission blocks.
    SHOW NOTIFICATION: Timer Started!
    SWITCH BETWEEN WALLPAPERS: your work wallpaper
    SET FOCUS: Work On until turned off
    START TIMER: 50 minutes
OTHERWISE
    COMMENT: Optional stop actions, ending at the next Comment.
    SHOW NOTIFICATION: Timer Stopped.
    SWITCH BETWEEN WALLPAPERS: your normal wallpaper
    START TIMER: 10 minutes
    SET FOCUS: Work Off
    COMMENT: End of optional actions. Keep all submission actions below.

    CALCULATE EXPRESSION: floor([Duration])
        -> SubmittedSeconds (Number)
    CALCULATE EXPRESSION: floor([SubmittedSeconds] / 3600)
        -> Hours
    CALCULATE EXPRESSION: floor(([SubmittedSeconds] % 3600) / 60)
        -> Minutes
    CALCULATE EXPRESSION: [SubmittedSeconds] % 60
        -> Seconds
    TEXT: [["[MetricID]","[Hours]:[Minutes]:[Seconds]"]]
        -> MetricWithDuration
    RUN SHORTCUT: Insights
        Input: MetricWithDuration
        -> RecordResponse
    TEXT: timer_ack
        -> AcknowledgeCommand
    LIST:
        Item 1: AcknowledgeCommand (Text)
        Item 2: MetricID (Text)
        Item 3: SubmittedSeconds (Number)
        Item 4: RecordResponse
        -> AcknowledgeRequest
    RUN SCRIPT: OpenHabits Runtime
        Parameter: AcknowledgeRequest
        Run in App: Off
        Output Type: Dictionary
        -> Acknowledgement (Dictionary)
    GET DICTIONARY VALUE: notification from Acknowledgement
        -> AcknowledgeNotification (Text)
    IF AcknowledgeNotification has any value
        SHOW NOTIFICATION: AcknowledgeNotification
    END IF
END IF
STOP THIS SHORTCUT
```

The runtime performs acknowledgement and the state update in one call. A response containing the word `metricsByID` is insufficient acknowledgement. Only a successful response with this metric's `written` or `late_overwritten` entry and no entry errors clears the submitted amount. Re-read state before clearing it, preserving other metrics and any newly accumulated pending seconds. Fractional seconds that were not submitted remain pending. The acknowledgement fix requires the updated Insights readout to return the first recording response.
