# Insights

Full replacement action readout, 2026-10-19, including setup, logging, optional cache/Calendar integration, and Notion. The logging path remains native; Scriptable is optional for logging alone. The installer guard checks for Update Lockout Cache or Toggle Timer Template, supporting Calendar Alarms/timers without Locked or Allowed. A renamed timer still needs the matching Runtime installed before use. Updating this file does not update the shared or installed Shortcut. Historical source transcriptions remain provenance.

Arrows label magic-variable outputs; Set Variable lines are real actions. `ok` and `writeToNotion` are **Booleans**. `updateNotion` is a **Number**. Bind all hooks and the final return to the **first** recording response, never the subsequent Notion HTTP result. Keep errors visible when debug is off. Install the companion Calendar Alarms Engine/runtime changes before enabling its hook; forwarded metric responses must select completion-only cleanup.

Run Inline Script below means paste the entire `Inline Scriptable/Insights
Installer.js` source into that action, not a URL or a filesystem path. Run in App
is Off. Leave Parameter empty; the installer downloads both scripts itself.

```text
GET FILE FROM SHORTCUTS
    Path: /OpenHabits/OpenHabits Metrics/settings.json
    Error If Not Found: Off
    -> SettingsFile
IF Shortcut Input does not have any value
    IF SettingsFile has any value
        GET DICTIONARY FROM INPUT: SettingsFile
            -> Settings
        GET DICTIONARY VALUE: openHabitsSecret from Settings
        SET VARIABLE: openHabitsSecret = Dictionary Value
        GET DICTIONARY VALUE: webAppId from Settings
        SET VARIABLE: webAppId = Dictionary Value
        SET VARIABLE: fileFound = 1
    OTHERWISE
        TEXT: [empty]
        SET VARIABLE: openHabitsSecret = Text
        TEXT: [empty]
        SET VARIABLE: webAppId = Text
        SHOW ALERT:
            Welcome to OpenHabits Metrics!
            There are a few simple questions to get set up.
            You can change these settings at any time by running this shortcut again.
        SET VARIABLE: fileFound = 0
    END IF
    SET VARIABLE: endRepeat = 0
    REPEAT 10 TIMES
        IF endRepeat is 0
            CHOOSE FROM MENU: What would you like to setup or change?
                Secret
                    ASK FOR INPUT: Text
                        Prompt: Please enter your OpenHabits Metrics secret:
                        Default: openHabitsSecret
                    SET VARIABLE: openHabitsSecret = Provided Input
                Web App Id
                    ASK FOR INPUT: Text
                        Prompt: Please enter your OpenHabits Metrics web app Id:
                        Default: webAppId
                    SET VARIABLE: webAppId = Provided Input
                More Info
                    SHOW ALERT:
                        Your Secret is the "password" you set in your Google Sheet's settings.
                        Your web app ID is shown under your active Apps Script deployment.
                        Think of it like the address to send a letter to, and in this case,
                        the letter is a logging request from your phone.
                I'm Finished
                    SET VARIABLE: endRepeat = 1
            END MENU
        END IF
    END REPEAT
    DICTIONARY
        openHabitsSecret: openHabitsSecret
        webAppId: webAppId
    SAVE FILE: Dictionary
        Path: /OpenHabits/OpenHabits Metrics/settings.json
        Ask Where to Save: Off
        Overwrite If File Exists: On
    GET SHORTCUTS: All Shortcuts
    IF ANY ARE TRUE:
        Shortcuts (Names) contains Update Lockout Cache
        Shortcuts (Names) contains Toggle Timer Template
        RUN INLINE SCRIPT: Insights Installer
            Parameter: (empty)
    END IF
    SHOW NOTIFICATION: Settings Updated!
    STOP THIS SHORTCUT
END IF
IF SettingsFile has any value
    GET DICTIONARY FROM INPUT: SettingsFile
        -> Settings
    GET DICTIONARY VALUE: openHabitsSecret from Settings
        -> Secret
    GET DICTIONARY VALUE: webAppId from Settings
        -> WebAppId
OTHERWISE
    SHOW NOTIFICATION: Warning: no OpenHabits settings found. Please run Insights and follow setup.
    STOP THIS SHORTCUT
END IF
SET VARIABLE: debug = false
TEXT: https://script.google.com/macros/s/[WebAppId]/exec
    -> RequestURL
TEXT:
    {
      "key": "record_metric_iOS",
      "secret": "[Secret]",
      "data": [Shortcut Input]
    }
    -> RecordBody
GET CONTENTS OF URL: RequestURL
    Method: POST
    Headers: Content-Type = application/json
    Request Body: File = RecordBody
    -> RecordHTTPResponse
GET TEXT FROM INPUT: RecordHTTPResponse
    -> RecordResponseText
IF RecordResponseText does not contain metricsByID
    SHOW NOTIFICATION:
        Error: unable to access Google Drive at this time. Please try again later.
        [RecordResponseText]
    STOP THIS SHORTCUT
END IF
GET DICTIONARY FROM INPUT: RecordHTTPResponse
    -> RecordResponse (Dictionary)
GET DICTIONARY VALUE: errors from RecordResponse
    -> RecordErrors (List)
IF RecordErrors has any value
    SHOW NOTIFICATION: RecordErrors
END IF
GET DICTIONARY VALUE: ok from RecordResponse
    -> RecordOK (Boolean)
IF RecordOK is No
    STOP AND OUTPUT: RecordResponse
END IF
GET SHORTCUTS: All Shortcuts
    -> InstalledShortcuts
IF InstalledShortcuts contains Update Lockout Cache
    RUN SHORTCUT: Update Lockout Cache
        Input: RecordResponse
END IF
IF InstalledShortcuts contains Calendar Alarm Engine
    RUN SHORTCUT: Calendar Alarm Engine
        Input: RecordResponse
END IF
IF debug is true
    SHOW RESULT: RecordResponse
END IF
GET DICTIONARY VALUE: metricsByID from RecordResponse
    -> Metrics
GET DICTIONARY VALUE: todayPoints from RecordResponse
    -> TodayPoints
ROUND NUMBER: TodayPoints to Tenths
    -> RoundedTotal
GET DICTIONARY VALUE: pointsDelta from RecordResponse
    -> PointsDelta
ROUND NUMBER: PointsDelta to Tenths
    -> RoundedDelta
GET DICTIONARY VALUE: messages from RecordResponse
    -> Messages
IF Messages has any value
    IF ANY ARE TRUE: TodayPoints > 0, PointsDelta > 0
        SHOW NOTIFICATION: [Messages] (+[RoundedDelta]pts = [RoundedTotal])
    OTHERWISE
        SHOW NOTIFICATION: Messages
    END IF
END IF
SET VARIABLE: updateNotion = 0
REPEAT WITH EACH ITEM IN Metrics
    SET VARIABLE: CurrentMetric = Repeat Item (Dictionary)
    GET DICTIONARY VALUE: status from CurrentMetric
        -> MetricStatus (Text)
    GET DICTIONARY VALUE: errors from CurrentMetric
        -> MetricErrors (List)
    IF MetricStatus is not error
        IF MetricErrors does not have any value
            GET DICTIONARY VALUE: writeToNotion from CurrentMetric
                -> MetricWriteToNotion (Boolean)
            IF MetricWriteToNotion is Yes
                SET VARIABLE: updateNotion = 1
            END IF
        END IF
    END IF
END REPEAT
IF updateNotion is 1
    TEXT:
        {
          "key": "update_metric_notion",
          "secret": "[Secret]",
          "data": [Shortcut Input]
        }
    GET CONTENTS OF URL: RequestURL
        Method: POST
        Headers: Content-Type = application/json
        Request Body: File = Text
END IF
STOP AND OUTPUT: RecordResponse
```

The first response's `metricsByID` list controls the cache patch, completion cleanup, and Notion eligibility. A top-level failure returns before hooks; individual failed entries cannot request Notion writes. The Notion endpoint still receives the original request tuples and applies server validation. The initial text guard catches the common Google Drive HTML response before Dictionary conversion; unexpected malformed JSON may still stop the native conversion action. No automatic recording retry is added.
