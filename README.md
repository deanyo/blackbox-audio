# Blackbox Audio

Blackbox Audio is a static web app for generating synthetic tinywhoop audio from Betaflight blackbox logs and lining it up against DVR footage.

It runs entirely in the browser. Users can load raw `.bbl` / `.bfl` files or CSV exports, preview the generated sound, overlay virtual stick cams on video, and export a WAV track for editing.

## What It Does

- Loads raw Betaflight blackbox logs in the browser
- Also supports CSV exports
- Detects motor, throttle, gyro, stick, and RPM/eRPM fields when available
- Synthesizes audio using built-in modes:
  - `Realistic Tinywhoop`
  - `Cinematic Chase`
  - `Arcade Sim`
  - `Micro Sim`
  - `Space Ship`
  - `Custom`
- Provides a custom mode with slider-based tuning
- Imports and exports custom presets as JSON
- Supports optional DVR video preview with sync offset controls
- Shows a virtual stick overlay when the required stick data is present
- Handles raw blackbox files that contain multiple embedded flights
- Exports the generated audio as WAV

## How It Works

Betaflight blackbox logs contain the signals that matter most for a plausible synthetic motor track:

- time
- motor command history
- RC command positions
- gyro data
- sometimes RPM/eRPM telemetry

That is enough to infer pitch movement, loudness, imbalance, and some aggressive-flight texture. It is not enough to recover a true recording of microphone placement, room reflections, frame acoustics, or exact wind behavior, so the output should be treated as a stylized reconstruction rather than authentic recorded sound.

When RPM or eRPM fields are present, the synth prefers them for pitch movement instead of relying only on motor command level.

## Project Status

Current implementation:

- Raw `.bbl` / `.bfl` support
- Multi-flight selection for embedded logs
- Preset import/export
- Generic simulator-inspired preset voices
- Stick cam preview overlay
- Sync nudges for manual alignment

Current limitations:

- Wind is still experimental and is disabled by default
- Video export is not implemented yet
- The project still needs first-party real-world sample footage and matching logs for tuning

## Guides

- [Blackbox Setup and Export Guide](./docs/BLACKBOX_SETUP_GUIDE.md)

## Running Locally

Serve the directory with any static file server:

```bash
python3 -m http.server 8000
```

Then open:

```text
http://localhost:8000
```

If you do not have a log ready yet, use `Load Demo Flight`.

## Deployment

GitHub Pages is the default deployment target because the current pipeline is fully client-side.

Cloudflare Workers would only become useful if the project later adds server-backed capabilities such as:

- raw log preprocessing helpers
- shareable saved renders or presets
- queued video export
- analytics or stored projects

## Licensing

This project is licensed under GPL-3.0. See [LICENSE](./LICENSE).

For direct raw-log support, the repository vendors and adapts a minimal parser slice from Betaflight Blackbox Explorer. See [THIRD_PARTY_NOTICES.md](./THIRD_PARTY_NOTICES.md).

## References

- Betaflight Blackbox documentation: https://www.betaflight.com/docs/development/Blackbox
- Betaflight Blackbox internals: https://www.betaflight.com/docs/development/Blackbox-Internals
- Oscar Liang Blackbox guide: https://oscarliang.com/blackbox/
