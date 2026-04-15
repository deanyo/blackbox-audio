# blackbox audio

static browser prototype for turning betaflight blackbox logs into a synthesized motor audio track for dvr footage.

## why this is viable

betaflight blackbox logs already include the pieces that matter most for a plausible sound proxy:

- time
- command being sent to each motor ESC
- RC command positions
- gyro data

betaflight documents that blackbox records motor commands, rc commands, and gyro data on flight-control iterations, and that `blackbox_decode` can turn logs into csv for analysis:

- https://www.betaflight.com/docs/development/Blackbox
- https://www.betaflight.com/docs/development/Blackbox-Internals

that means a browser app can infer:

- pitch contour from motor command level
- loudness from average motor effort
- roughness and frame buzz from gyro plus motor imbalance
- wind-like broadband noise from throttle and aggressive motion

it cannot recover true acoustic placement, room reflections, duct resonance, prop shape, or exact rpm unless richer telemetry is available, so this should be treated as a stylized reconstruction rather than authentic recorded audio.

## current scope

this prototype now supports raw `.bbl` / `.bfl` input as well as csv.

- load raw blackbox logs in the browser
- load blackbox csv in the browser
- detect `time`, `motor[...]`, throttle, gyro, and rpm/eRPM columns heuristically
- render one of three audio modes:
  - `realistic tinywhoop`
  - `cinematic chase`
  - `space ship`
  - `custom`
- toggle wind noise and frame resonance
- wind is currently experimental and is disabled by default
- upload an optional dvr video and audition the rendered clip in sync
- preview a virtual stick cam overlay when roll, pitch, yaw, and throttle fields are present
- choose between multiple embedded logs when a raw blackbox file contains more than one flight
- nudge video sync start quickly in the ui without typing offsets by hand
- tune a custom preset with sliders and import/export it as json
- download the synthesized audio as wav

for direct raw-log support, this repo now vendors and adapts a minimal parser slice from betaflight blackbox explorer. because that upstream code is gpl-3.0, this project is now licensed under gpl-3.0 as well.

when rpm or eRPM data is present, the synth now prefers that for pitch movement instead of relying only on motor command level.

## deployment

github pages is the right default for this version because the whole pipeline is client-side.

serve the folder with any static server, for example:

```bash
python3 -m http.server 8000
```

then open `http://localhost:8000`.

if you do not have a log ready, click `load demo flight`.

cloudflare workers only become worth adding when one of these becomes real:

- raw log helpers or decode assist for `.bbl`
- shareable presets or rendered output urls
- muxed video export via a queued job
- analytics or saved projects without bolting them into the client

## best next steps

1. prefer real rpm telemetry when present instead of estimating pitch from motor command.
2. add a manual sync marker workflow using arming beep alignment against dvr audio.
3. export muxed video+audio plus stick overlay, likely via ffmpeg.wasm if the static-site requirement holds.
4. add first-party sample dvr + matching blackbox log for one-click testing.
