# Blackbox Setup and Export Guide

This guide is for new users who want to:

1. enable Blackbox logging on their quad
2. record logs in a way that is useful for this project
3. export logs correctly for use in Blackbox Audio

It is based on:

- Oscar Liang's Blackbox guide: https://oscarliang.com/blackbox/
- Betaflight Blackbox documentation: https://www.betaflight.com/docs/development/Blackbox

## What Blackbox Audio Prefers

For this project, the best input is a raw `.bbl` or `.bfl` file.

Why:

- raw logs preserve more information than CSV
- raw logs can contain multiple embedded flights
- the app can decode them directly in the browser
- they keep optional RPM or eRPM data when it exists

CSV still works, but raw logs should be your default unless you have a specific reason to export CSV.

## Hardware Requirements

Your flight controller needs one of the following:

- onboard flash memory
- a microSD card slot
- or an external logger such as OpenLog on a spare UART

Oscar Liang's guide is a good overview of the common hardware setups. Betaflight's documentation also covers OpenLog and serial logging details, including the warning that serial logging should use a real hardware UART rather than SoftSerial when possible.

## Step 1: Enable Blackbox in Betaflight

In Betaflight Configurator:

1. Connect your quad.
2. Open the `Configuration` tab.
3. Enable the `BLACKBOX` feature.
4. Save and reboot.

Then go to the `Blackbox` tab and choose the correct logging device:

- `Onboard Flash` if your FC has built-in flash
- `SD Card` if your FC logs to microSD
- `Serial` only if you are using an external logger

If you are using an external logger:

1. Open the `Ports` tab
2. Find the UART connected to the logger
3. Enable `Blackbox` logging on that UART
4. Save and reboot

For serial loggers, Betaflight recommends using a hardware UART. SoftSerial can work, but the official documentation notes that its limited baud rate forces a much lower logging rate.

## Step 2: Use Sensible Logging Settings

For general use, Oscar Liang recommends:

- `2 kHz` logging rate
- `1.6 kHz` if your gyro is a BMI270

That is a good default here as well.

Practical advice:

- Keep the rate high enough to preserve useful motor and gyro detail
- Avoid logging unnecessary fields if you are trying to save space
- If RPM or eRPM telemetry is available on your build, keep it enabled because Blackbox Audio can use it
- Clear or download logs regularly if you are using onboard flash, because recording stops once storage is full

Fields this project benefits from most:

- motor outputs
- RC commands
- gyro data
- throttle
- RPM or eRPM when available

## Step 3: Record Useful Flights

Blackbox Audio does not need a full tuning session to work, but it helps if the log contains a range of sounds and flight behavior.

Good test flights include:

- idle to hover
- throttle sweeps
- punch-outs
- quick yaw snaps
- sharp turns
- propwash moments

If you also plan to sync against DVR later:

- keep the DVR footage
- avoid heavy stabilization if you want accurate visual comparison
- try to keep the clip you care about easy to identify
- if your quad has an arming beep, keep it in the recorded audio because Betaflight documents it as a useful sync point

## Step 4: Understand How Logs Are Created

Oscar Liang highlights an important detail:

- On onboard flash, multiple arm/disarm segments can end up grouped into a combined log until the flight controller is power-cycled
- On SD card logging, each blackbox activation usually creates a separate file

That matters here because:

- a single raw `.bbl` can contain multiple embedded flights
- Blackbox Audio now exposes an `embedded flight` selector when that happens

If you see several segments in one file, that is normal.

## Step 5: Export Logs Correctly

### Preferred: Raw Log Export

If your FC uses onboard flash:

1. Open the `Blackbox` tab in Betaflight Configurator
2. Use `Activate Mass Storage Device Mode`
3. Copy the `.bbl` files to your computer

Oscar Liang notes that this is much faster than using `Save flash to file`.

You may see several files after mounting the device. Oscar Liang points out that `btfl_all.bbl` is the combined file containing all logs. If you already know which individual file you want, you do not need to use the combined file.

If your FC logs to microSD:

1. Remove the card or mount it normally
2. Copy the raw `.bbl` files directly

Use the raw log in Blackbox Audio whenever possible.

### Optional: CSV Export

If you really need CSV:

1. Open the log in Blackbox Explorer
2. Export CSV from there
3. Load that CSV into Blackbox Audio

For CSV, the most useful columns are:

- `time`
- `motor[...]`
- `rcCommand[...]` or `setpoint[...]`
- `gyroADC[...]`
- `eRPM[...]` or similar RPM fields if present

## Step 6: Load the Log into Blackbox Audio

Once you have the file:

1. Open Blackbox Audio
2. Upload the raw `.bbl` / `.bfl` file, or CSV if necessary
3. If the file contains multiple flights, select the one you want
4. Render audio
5. Optionally load DVR footage and adjust `video sync start`

Useful current behavior:

- raw logs are preferred
- the app can choose between embedded flights
- the app prefers RPM-driven pitch if RPM data exists

## Recommended Workflow for New Users

If you are trying this for the first time, use this order:

1. Enable Blackbox and confirm the quad is actually logging
2. Fly a short test pack with hover, punch-out, and a few turns
3. Export the raw `.bbl`
4. Load it into Blackbox Audio
5. Try the built-in modes first
6. Use `Custom` mode only after you have heard the defaults

If you are also syncing video:

1. Use the raw log instead of CSV if possible
2. Pick the correct embedded flight when prompted
3. Start by aligning around the arm event or first obvious throttle movement
4. Use the sync nudges to fine-tune the preview

## Common Mistakes

- Exporting CSV first when the raw log would have worked better
- Recording logs with very little throttle variation
- Forgetting to clear full onboard flash storage
- Using logs with no usable motor fields
- Expecting wind to sound realistic right now; it is still experimental

## If You Want the Best Results Later

When you have time to capture real reference material, the ideal set is:

- DVR video
- matching raw blackbox log
- a separate real audio recording of the same quad if possible

That will be the best foundation for future per-quad preset fitting and realism tuning.

## References

- Oscar Liang: https://oscarliang.com/blackbox/
- Betaflight Blackbox guide: https://www.betaflight.com/docs/development/Blackbox
- Betaflight Blackbox internals: https://www.betaflight.com/docs/development/Blackbox-Internals
