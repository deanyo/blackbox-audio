# blackbox audio

static browser prototype for turning betaflight blackbox csv into a synthesized motor audio track for dvr footage.

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

this prototype intentionally starts with csv input instead of raw `.bbl`/`.bfl` parsing.

- load blackbox csv in the browser
- Detect `time`, `motor[...]`, throttle, and gyro columns heuristically
- render one of three audio modes:
  - `realistic tinywhoop`
  - `cinematic chase`
  - `space ship`
- toggle wind noise and frame resonance
- upload an optional dvr video and audition the rendered clip in sync
- download the synthesized audio as wav

## deployment

github pages is the right default for this version because the whole pipeline is client-side.

serve the folder with any static server, for example:

```bash
python3 -m http.server 8000
```

then open `http://localhost:8000`.

if you do not have a csv ready, click `load demo flight`.

cloudflare workers only become worth adding when one of these becomes real:

- raw log helpers or decode assist for `.bbl`
- shareable presets or rendered output urls
- muxed video export via a queued job
- analytics or saved projects without bolting them into the client

## best next steps

1. add raw betaflight log decoding in-browser so users can drop `.bbl` files directly.
2. prefer real rpm telemetry when present instead of estimating pitch from motor command.
3. add a manual sync marker workflow using arming beep alignment against dvr audio.
4. export muxed video+audio, likely via ffmpeg.wasm if the static-site requirement holds.
