# third-party notices

this project includes adapted source files derived from betaflight blackbox explorer:

- project: https://github.com/betaflight/blackbox-log-viewer
- license: gpl-3.0
- upstream license file: `LICENSE`

vendored and adapted files live under `vendor/betaflight/` and are based on:

- `src/flightlog_parser.js`
- `src/flightlog_fielddefs.js`
- `src/datastream.js`
- `src/decoders.js`
- `src/tools.js`

local adapter and compatibility files added in this project:

- `vendor/betaflight/decoder-adapter.js`
- `vendor/betaflight/flightlog_fields_presenter.js`
- `vendor/betaflight/semver-lite.js`

the vendored code is used here solely to decode raw betaflight blackbox logs in-browser for audio synthesis and stick-overlay preview.
