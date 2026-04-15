# TODO

This file tracks planned work, dependencies, and known blockers.

## Active Priorities

- Tune the synth against real tinywhoop recordings and matched blackbox logs
  - Dependency: real DVR footage, blackbox logs, and reference audio from the same flights
- Implement baked video export
  - Goal: output a finished clip with synthesized audio and optional stick overlay
  - Likely path: in-browser ffmpeg.wasm or equivalent
- Improve wind modeling
  - Status: currently experimental and disabled by default
  - Blocker: needs real recordings to tune against

## Short-Term Features

- Add a manual sync marker workflow based on arming beeps or other obvious alignment events
- Allow users to rename exported custom presets
- Add preset management in the UI
  - save multiple local presets
  - duplicate presets
  - delete presets
- Add per-log notes in the UI when multiple embedded flights are detected
- Add clearer field detection diagnostics when logs are partially usable

## Realism Improvements

- Prefer richer RPM handling when logs expose better telemetry fields
- Add prop or build-oriented preset packs
  - examples: 65mm brushed, 65mm brushless, 75mm whoop
- Explore fitting a custom preset from a real reference recording
  - Dependency: real audio/log pairs from the same quad
- Reduce remaining synthetic artifacts in wind and resonance layers

## Content and Demo Assets

- Add first-party sample DVR footage
- Add matching sample blackbox log
- Add matching reference audio if available
- Create a one-click “try sample footage” path on the site

## Possible Later Work

- Shareable preset links or preset URLs
- Optional Cloudflare-backed render or storage helpers
- Downloadable packaged render outputs
- Batch rendering for multiple clips from the same flight

## Known Blockers

- Real footage and matched logs are needed for serious realism tuning
- Video export may require a large browser-side dependency and careful performance work
- Auto-fitting presets from recordings is possible, but not worth building seriously before real sample data exists
