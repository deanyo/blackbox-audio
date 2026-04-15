# Preset Contribution Guide

Blackbox Audio can load community presets directly from JSON files in this repository. The intent is that contributors should be able to add a preset without editing the synth code.

## How It Works

- preset files live under `presets/community/`
- `presets/index.json` lists which files should be loaded
- the site fetches those files on load
- valid presets appear in the voice browser and in the sound mode dropdown
- if `author` is present, it is shown in the browser card and dropdown label

## Add a New Preset

1. Copy [`presets/community/template.json`](../presets/community/template.json)
2. Rename it to a slug-like filename such as `mobula6-indoor.json`
3. Fill in:
   - `slug`
   - `name`
   - `author`
   - `flavor`
   - `description`
   - `tags`
   - `preset`
4. Add the new file path to [`presets/index.json`](../presets/index.json)
5. Open a pull request

Reference example:

- [`presets/community/deanyo-indoor-duct.json`](../presets/community/deanyo-indoor-duct.json)

## Preset Schema

Required practical fields:

- `name`
- `preset`

Strongly recommended fields:

- `slug`
- `author`
- `flavor`
- `description`
- `tags`

The `preset` object supports these keys:

- `basePitch`
- `pitchRange`
- `gyroPitch`
- `spreadPitch`
- `harmonic2`
- `harmonic3`
- `motorGain`
- `windGain`
- `resonanceGain`
- `transientGain`
- `subGain`
- `spaceGain`

If values are outside the allowed UI ranges, the app clamps them automatically.

## Good Contribution Notes

- Keep preset names descriptive rather than branded unless the branding is your own
- Describe what the preset is trying to achieve, not just that it is “better”
- Include author attribution if you want it shown on the site
- If the preset was tuned against a specific quad or recording setup, say so in the description
- Prefer tags that help browsing, such as `indoor`, `cinematic`, `brushed`, `whoop`, `racer`

## Example Workflow

1. Start from a built-in voice in the app
2. Copy it into `custom`
3. Tune it
4. Export the JSON
5. Copy the numeric values into the template file
6. Add your metadata and open a PR
