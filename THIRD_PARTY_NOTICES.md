# Third-Party Notices

This project includes adapted source files derived from Betaflight Blackbox Explorer:

- Project: https://github.com/betaflight/blackbox-log-viewer
- License: GPL-3.0
- Upstream license file: `LICENSE`

Vendored and adapted files live under `vendor/betaflight/` and are based on:

- `src/flightlog_parser.js`
- `src/flightlog_fielddefs.js`
- `src/datastream.js`
- `src/decoders.js`
- `src/tools.js`

Local adapter and compatibility files added in this project:

- `vendor/betaflight/decoder-adapter.js`
- `vendor/betaflight/flightlog_fields_presenter.js`
- `vendor/betaflight/semver-lite.js`

The vendored code is used here solely to decode raw Betaflight blackbox logs in-browser for audio synthesis and stick-overlay preview.
