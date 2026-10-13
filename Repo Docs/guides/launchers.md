# Quick launchers

[Feature guides](../features.md)

First [test a logger](metrics.md) manually. A launcher runs that same logging flow.

## QR codes

Use **Shortcut QR Code Generator** in the [Config Editor](https://copperpanman.github.io/OpenHabits-Metrics/).

| Mode | Use it for |
| --- | --- |
| Launch your shortcut by name (default) | A named installed Shortcut, including one that asks for a value or performs other actions |
| Launch Insights with metric input | One or more metrics logged directly, without a separate logger Shortcut per metric |

For your own Shortcut, enter its exact installed name. For Insights mode, keep **Insights** as the Shortcut name or enter its installed name if you renamed it. Paste the **Shortcut-ready metric text** generated above, or select **Use generated metric text**. Insights must still be installed and set up on your phone. Generate the code, download its PNG, and scan it with the iPhone Camera app. Check the Sheet before printing or placing it permanently.

The generator makes the QR in your browser. Name mode encodes the Shortcut name; Insights mode also includes the exact metric text. Connection credentials come from your phone's existing settings; the generator does not add your deployment URL or secret.

Insights mode supports timestamps, completions, and fixed number, text, or duration values, including several metrics at once. Replace every input placeholder with a fixed value first. A QR cannot supply an Apple Shortcuts magic variable or ask for live input through this mode. To collect a value when scanned, use your own logger Shortcut with **Ask for Input**, then launch it by name.

## NFC tags

In **Shortcuts → Automation**, add an **NFC** automation, scan/name your tag, and choose **Run Immediately** where available. Add **Run Shortcut** pointing to your logger. Scan the tag again and confirm the Sheet updates.

## Home Screen, widgets, and Siri

Use your logger Shortcut's **Add to Home Screen** option, add a Shortcuts widget and select it, or ask Siri to run it by name. These use the same logger and connection settings.

## Other automations

Choose the trigger in Shortcuts and run the desired logger. For an input-bearing logger, make sure the automation supplies the expected value or the logger asks for it. Run once with the phone unlocked to finish granting permissions before relying on unattended execution.
