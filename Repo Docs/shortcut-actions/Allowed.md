# Allowed

Full action readout, 2026-10-19, for OpenHabits Runtime 1.2.2, with an optional blocking-app comment. The native flow is unchanged. This does not modify installed Shortcut exports. Empty input
starts an unlock attempt; nonempty input handles an allowed session. Arrows label magic-variable outputs, not extra
Set Variable actions. All Run Script actions use Run in App: Off.

```text
IF Shortcut Input does not have any value
    CHOOSE FROM MENU: Choose Unlock Type
        Unlock after 60 seconds
            TEXT: begin_legitimate
        Penalty unlock after 30 seconds
            TEXT: begin_penalty
        Cancel
            STOP THIS SHORTCUT
    END MENU
    RUN SCRIPT: OpenHabits Runtime
        Parameter: Menu Result
        -> UnlockResult (Dictionary)
    GET DICTIONARY VALUE: notification from UnlockResult
    SHOW NOTIFICATION: Dictionary Value
    STOP THIS SHORTCUT
END IF
COMMENT: Optional — stop the blocking session in the blocking app of your choice.
SHOW NOTIFICATION: Shortcut Input
GET SHORTCUTS: All Shortcuts
IF Shortcuts contains Start Screen Time Timer
    RUN SHORTCUT: Start Screen Time Timer
        Input: None
END IF
STOP THIS SHORTCUT
```
