import { parseBlackboxBinaryLog } from "./vendor/betaflight/decoder-adapter.js";

const SAMPLE_RATE = 24000;
const MAX_ANALYSIS_RATE = 600;
const FADE_TIME_SECONDS = 0.02;
const LIVE_PREVIEW_DURATION = 2.5;
const LIVE_PREVIEW_DEBOUNCE_MS = 150;

const BUILT_IN_MODES = [
  {
    key: "realistic",
    label: "realistic tinywhoop",
    flavor: "baseline",
    tags: ["balanced", "buzzy", "natural"],
    description:
      "realistic tinywhoop favors buzzy harmonics, lift-dependent wind, and subtle frame chatter.",
    preset: {
      basePitch: 115,
      pitchRange: 290,
      gyroPitch: 90,
      spreadPitch: 120,
      harmonic2: 0.42,
      harmonic3: 0.18,
      motorGain: 0.46,
      windGain: 0.16,
      resonanceGain: 0.11,
      transientGain: 0.018,
      subGain: 0,
      spaceGain: 0,
    },
  },
  {
    key: "cinematic",
    label: "cinematic chase",
    flavor: "smooth and heavy",
    tags: ["sub body", "smooth", "dramatic"],
    description:
      "cinematic chase leans heavier, smoother, and more dramatic, with extra sub body and reduced hiss.",
    preset: {
      basePitch: 90,
      pitchRange: 235,
      gyroPitch: 55,
      spreadPitch: 85,
      harmonic2: 0.5,
      harmonic3: 0.24,
      motorGain: 0.42,
      windGain: 0.12,
      resonanceGain: 0.16,
      transientGain: 0.014,
      subGain: 0.1,
      spaceGain: 0,
    },
  },
  {
    key: "arcade",
    label: "arcade sim",
    flavor: "bright and punchy",
    tags: ["snappy", "clean bite", "sim-style"],
    description:
      "arcade sim is brighter and punchier, with cleaner motor bite and sharper spool response.",
    preset: {
      basePitch: 104,
      pitchRange: 342,
      gyroPitch: 82,
      spreadPitch: 102,
      harmonic2: 0.62,
      harmonic3: 0.17,
      motorGain: 0.45,
      windGain: 0.06,
      resonanceGain: 0.08,
      transientGain: 0.026,
      subGain: 0.02,
      spaceGain: 0.02,
    },
  },
  {
    key: "micro",
    label: "micro sim",
    flavor: "tight and twitchy",
    tags: ["high pitch", "duct buzz", "twitchy"],
    description:
      "micro sim pushes a tighter, higher-pitched whoop voice with extra duct buzz and twitchy detail.",
    preset: {
      basePitch: 146,
      pitchRange: 362,
      gyroPitch: 116,
      spreadPitch: 146,
      harmonic2: 0.56,
      harmonic3: 0.31,
      motorGain: 0.41,
      windGain: 0.05,
      resonanceGain: 0.1,
      transientGain: 0.022,
      subGain: 0,
      spaceGain: 0,
    },
  },
  {
    key: "brushed",
    label: "brushed toy",
    flavor: "old-school buzz",
    tags: ["toy-grade", "raspy", "lightweight"],
    description:
      "brushed toy leans raspy and wiry, with more upper buzz and less low-end body.",
    preset: {
      basePitch: 162,
      pitchRange: 286,
      gyroPitch: 74,
      spreadPitch: 138,
      harmonic2: 0.68,
      harmonic3: 0.33,
      motorGain: 0.38,
      windGain: 0.04,
      resonanceGain: 0.13,
      transientGain: 0.03,
      subGain: 0,
      spaceGain: 0,
    },
  },
  {
    key: "racer",
    label: "clean racer",
    flavor: "crisp and direct",
    tags: ["clean", "focused", "fast"],
    description:
      "clean racer pulls resonance back and emphasizes direct motor tone for a more stripped, crisp voice.",
    preset: {
      basePitch: 98,
      pitchRange: 368,
      gyroPitch: 94,
      spreadPitch: 76,
      harmonic2: 0.44,
      harmonic3: 0.12,
      motorGain: 0.43,
      windGain: 0.05,
      resonanceGain: 0.05,
      transientGain: 0.021,
      subGain: 0.03,
      spaceGain: 0,
    },
  },
  {
    key: "duct",
    label: "heavy duct",
    flavor: "resonant and thick",
    tags: ["thick", "resonant", "cinematic"],
    description:
      "heavy duct exaggerates enclosure resonance and low-end weight for a chunkier whoop character.",
    preset: {
      basePitch: 88,
      pitchRange: 248,
      gyroPitch: 62,
      spreadPitch: 126,
      harmonic2: 0.55,
      harmonic3: 0.22,
      motorGain: 0.47,
      windGain: 0.07,
      resonanceGain: 0.2,
      transientGain: 0.018,
      subGain: 0.12,
      spaceGain: 0.01,
    },
  },
  {
    key: "space",
    label: "space ship",
    flavor: "stylized sci-fi",
    tags: ["sci-fi", "modulated", "stylized"],
    description:
      "space ship exaggerates modulation and resonance for a stylized sci-fi pass while still following the flight log.",
    preset: {
      basePitch: 125,
      pitchRange: 320,
      gyroPitch: 120,
      spreadPitch: 165,
      harmonic2: 0.58,
      harmonic3: 0.28,
      motorGain: 0.4,
      windGain: 0.09,
      resonanceGain: 0.09,
      transientGain: 0.016,
      subGain: 0.03,
      spaceGain: 0.18,
    },
  },
];

const MODE_META = Object.fromEntries([
  ...BUILT_IN_MODES.map((mode) => [mode.key, mode]),
  [
    "custom",
    {
      key: "custom",
      label: "custom",
      flavor: "user-tuned",
      tags: ["editable", "import/export"],
      description:
        "custom lets you tune pitch, harmonics, gain, and modulation live, then import or export presets.",
    },
  ],
]);
const MODE_PRESETS = Object.fromEntries(BUILT_IN_MODES.map((mode) => [mode.key, mode.preset]));
const MODE_DESCRIPTIONS = Object.fromEntries(
  Object.values(MODE_META).map((mode) => [mode.key, mode.description]),
);

const CUSTOM_PRESET_STORAGE_KEY = "blackbox-audio-custom-preset";
const CUSTOM_PRESET_FIELDS = [
  { key: "basePitch", label: "base pitch", min: 40, max: 220, step: 1 },
  { key: "pitchRange", label: "pitch range", min: 80, max: 520, step: 1 },
  { key: "gyroPitch", label: "gyro pitch", min: 0, max: 180, step: 1 },
  { key: "spreadPitch", label: "motor spread", min: 0, max: 220, step: 1 },
  { key: "harmonic2", label: "2nd harmonic", min: 0, max: 1, step: 0.01 },
  { key: "harmonic3", label: "3rd harmonic", min: 0, max: 0.6, step: 0.01 },
  { key: "motorGain", label: "motor gain", min: 0.1, max: 0.8, step: 0.01 },
  { key: "windGain", label: "wind gain", min: 0, max: 0.3, step: 0.01 },
  { key: "resonanceGain", label: "resonance gain", min: 0, max: 0.3, step: 0.01 },
  { key: "transientGain", label: "transient gain", min: 0, max: 0.06, step: 0.001 },
  { key: "subGain", label: "sub body", min: 0, max: 0.2, step: 0.01 },
  { key: "spaceGain", label: "space modulation", min: 0, max: 0.3, step: 0.01 },
];

const PAN_POSITIONS = [-0.65, 0.65, 0.38, -0.38, 0.22, -0.22, 0.12, -0.12];

const elements = {
  csvFile: document.getElementById("csvFile"),
  videoFile: document.getElementById("videoFile"),
  embeddedLogField: document.getElementById("embeddedLogField"),
  embeddedLogSelect: document.getElementById("embeddedLogSelect"),
  stickOverlayToggle: document.getElementById("stickOverlayToggle"),
  loadDemo: document.getElementById("loadDemo"),
  clearLog: document.getElementById("clearLog"),
  soundMode: document.getElementById("soundMode"),
  presetBrowser: document.getElementById("presetBrowser"),
  customPresetPanel: document.getElementById("customPresetPanel"),
  customPresetFields: document.getElementById("customPresetFields"),
  livePreviewToggle: document.getElementById("livePreviewToggle"),
  previewPresetButton: document.getElementById("previewPresetButton"),
  exportPresetButton: document.getElementById("exportPresetButton"),
  importPresetButton: document.getElementById("importPresetButton"),
  resetPresetButton: document.getElementById("resetPresetButton"),
  importPresetFile: document.getElementById("importPresetFile"),
  clipStart: document.getElementById("clipStart"),
  clipDuration: document.getElementById("clipDuration"),
  videoStart: document.getElementById("videoStart"),
  windToggle: document.getElementById("windToggle"),
  resonanceToggle: document.getElementById("resonanceToggle"),
  renderButton: document.getElementById("renderButton"),
  playButton: document.getElementById("playButton"),
  pauseButton: document.getElementById("pauseButton"),
  stopButton: document.getElementById("stopButton"),
  audioPlayer: document.getElementById("audioPlayer"),
  videoPreview: document.getElementById("videoPreview"),
  stickOverlayCanvas: document.getElementById("stickOverlayCanvas"),
  downloadLink: document.getElementById("downloadLink"),
  statusStrip: document.getElementById("statusStrip"),
  inputSummary: document.getElementById("inputSummary"),
  fieldSummary: document.getElementById("fieldSummary"),
  renderSummary: document.getElementById("renderSummary"),
  modeDescription: document.getElementById("modeDescription"),
  syncNudges: Array.from(document.querySelectorAll(".sync-nudge")),
};

const state = {
  log: null,
  rawBundle: null,
  customPreset: loadStoredCustomPreset(),
  render: null,
  audioUrl: null,
  videoUrl: null,
  syncRaf: null,
  livePreviewTimer: null,
  previewAudioContext: null,
  previewSource: null,
};

initializePresetBrowser();
initializeCustomPresetUi();
updateModeUi();

elements.soundMode.addEventListener("change", () => {
  updateModeUi();
});

elements.clipStart.addEventListener("input", () => {
  refreshStickOverlay();
});

elements.videoStart.addEventListener("input", () => {
  refreshStickOverlay();
});

elements.embeddedLogSelect.addEventListener("change", () => {
  applyEmbeddedLogSelection(Number(elements.embeddedLogSelect.value));
});

elements.stickOverlayToggle.addEventListener("change", () => {
  refreshStickOverlay();
});

elements.exportPresetButton.addEventListener("click", () => {
  exportCustomPreset();
});

elements.previewPresetButton.addEventListener("click", () => {
  previewCustomPresetAudio(true);
});

elements.importPresetButton.addEventListener("click", () => {
  elements.importPresetFile.click();
});

elements.resetPresetButton.addEventListener("click", () => {
  setCustomPreset(clonePreset(MODE_PRESETS.realistic));
  elements.soundMode.value = "custom";
  updateModeUi();
  setStatus("custom preset reset to realistic base.");
  scheduleLivePreview();
});

elements.importPresetFile.addEventListener("change", async (event) => {
  const [file] = event.target.files;
  if (!file) {
    return;
  }

  try {
    const imported = JSON.parse(await file.text());
    const importedPreset = sanitizePreset(imported.preset ?? imported);
    setCustomPreset(importedPreset);
    elements.soundMode.value = "custom";
    updateModeUi();
    setStatus(`imported preset from ${file.name}.`);
    scheduleLivePreview();
  } catch (_error) {
    setStatus("could not import preset json.");
  } finally {
    elements.importPresetFile.value = "";
  }
});

elements.presetBrowser.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-mode]");
  if (!button) {
    return;
  }

  const mode = button.dataset.mode;
  const action = button.dataset.action;
  if (!MODE_PRESETS[mode]) {
    return;
  }

  if (action === "select") {
    elements.soundMode.value = mode;
    updateModeUi();
    setStatus(`${getModeLabel(mode)} selected.`);
    return;
  }

  if (action === "copy") {
    setCustomPreset(clonePreset(MODE_PRESETS[mode]));
    elements.soundMode.value = "custom";
    updateModeUi();
    setStatus(`copied ${getModeLabel(mode)} into custom.`);
    scheduleLivePreview();
  }
});

for (const button of elements.syncNudges) {
  button.addEventListener("click", () => {
    nudgeVideoStart(Number(button.dataset.nudge));
  });
}

elements.csvFile.addEventListener("change", async (event) => {
  const [file] = event.target.files;
  if (!file) {
    return;
  }

  try {
    setStatus(`parsing ${file.name}...`);
    if (isRawBlackboxFile(file)) {
      const bundle = parseBlackboxBinaryLog(await file.arrayBuffer(), file.name);
      setRawBundle(bundle);
      applyEmbeddedLogSelection(bundle.defaultIndex);
      setStatus(
        bundle.flights.length > 1
          ? `loaded ${file.name}. found ${bundle.flights.length} embedded logs.`
          : `loaded ${file.name}. ready to render audio.`,
      );
    } else {
      clearRawBundle();
      loadLog(parseBlackboxCsv(await file.text(), file.name));
      setStatus(`loaded ${file.name}. ready to render audio.`);
    }
  } catch (error) {
    clearRawBundle();
    setStatus(error.message);
  }
});

elements.videoFile.addEventListener("change", async (event) => {
  const [file] = event.target.files;
  if (!file) {
    clearVideo();
    return;
  }

  clearVideo();
  state.videoUrl = URL.createObjectURL(file);
  elements.videoPreview.src = state.videoUrl;
  setStatus(`loaded video ${file.name}. use "video sync start" to align the rendered clip.`);
});

elements.loadDemo.addEventListener("click", () => {
  try {
    setStatus("loading demo flight...");
    clearRawBundle();
    loadLog(parseBlackboxCsv(buildDemoCsv(), "demo-flight.csv"));
    setStatus("demo flight loaded. render a clip to audition the synth.");
  } catch (error) {
    setStatus(error.message);
  }
});

elements.clearLog.addEventListener("click", () => {
  clearRender();
  state.log = null;
  clearRawBundle();
  elements.csvFile.value = "";
  elements.inputSummary.textContent = "no log loaded";
  elements.fieldSummary.textContent = "awaiting log";
  elements.renderSummary.textContent = "not rendered";
  elements.clipStart.value = "0";
  elements.clipDuration.value = "12";
  refreshStickOverlay();
  setStatus("cleared log data.");
});

elements.renderButton.addEventListener("click", async () => {
  if (!state.log) {
    setStatus("load a blackbox log or the demo flight first.");
    return;
  }

  const clipStart = clampNumber(
    Number(elements.clipStart.value),
    0,
    Math.max(0, state.log.duration - 0.5),
  );
  const clipDuration = clampNumber(
    Number(elements.clipDuration.value),
    0.5,
    Math.max(0.5, state.log.duration - clipStart),
  );

  elements.clipStart.value = clipStart.toFixed(1);
  elements.clipDuration.value = clipDuration.toFixed(1);
  setStatus("rendering synthesized audio...");

  await new Promise((resolve) => window.setTimeout(resolve, 30));

  try {
    const render = synthesizeClip(state.log, {
      start: clipStart,
      duration: clipDuration,
      mode: elements.soundMode.value,
      wind: elements.windToggle.checked,
      resonance: elements.resonanceToggle.checked,
    });

    attachRender(render);
    setStatus(
      `rendered ${clipDuration.toFixed(1)}s in ${elements.soundMode.selectedOptions[0].textContent}.`,
    );
  } catch (error) {
    setStatus(error.message);
  }
});

elements.playButton.addEventListener("click", async () => {
  if (!state.render) {
    setStatus("render a wav first.");
    return;
  }

  stopPreviewAudio();

  if (elements.videoPreview.src) {
    const videoStart = clampNumber(Number(elements.videoStart.value), 0, Number.MAX_SAFE_INTEGER);
    elements.videoPreview.currentTime = videoStart;
  }

  elements.audioPlayer.currentTime = 0;

  try {
    await elements.audioPlayer.play();
    if (elements.videoPreview.src) {
      await elements.videoPreview.play();
      startSyncLoop();
    }
  } catch (error) {
    setStatus("browser playback was blocked. use the audio/video controls directly.");
  }
});

elements.pauseButton.addEventListener("click", () => {
  stopSyncLoop();
  elements.audioPlayer.pause();
  elements.videoPreview.pause();
});

elements.stopButton.addEventListener("click", () => {
  stopPlayback();
});

elements.audioPlayer.addEventListener("ended", () => {
  stopPlayback();
});

elements.videoPreview.addEventListener("pause", () => {
  if (!elements.audioPlayer.paused) {
    elements.audioPlayer.pause();
  }
  stopSyncLoop();
});

elements.videoPreview.addEventListener("play", () => {
  startSyncLoop();
});

elements.videoPreview.addEventListener("loadedmetadata", () => {
  refreshStickOverlay();
});

elements.videoPreview.addEventListener("seeked", () => {
  refreshStickOverlay();
});

elements.videoPreview.addEventListener("timeupdate", () => {
  refreshStickOverlay();
});

function loadLog(log) {
  clearRender();
  state.log = log;
  elements.inputSummary.textContent = `${log.sourceName} · ${formatSeconds(log.duration)} · ${log.frames.length.toLocaleString()} samples`;
  elements.fieldSummary.textContent = [
    `${log.motorCount} motors`,
    log.fieldSummary.rpm,
    log.fieldSummary.throttle,
    log.fieldSummary.gyro,
    log.fieldSummary.sticks,
  ].join(" · ");
  elements.renderSummary.textContent = "not rendered";
  elements.clipStart.value = "0";
  elements.clipDuration.value = Math.min(15, log.duration).toFixed(1);
  refreshStickOverlay();
}

function initializePresetBrowser() {
  elements.presetBrowser.innerHTML = BUILT_IN_MODES.map(
    (mode) => `
      <article class="preset-card" data-mode-card="${mode.key}">
        <div class="preset-card-head">
          <div class="preset-card-title">${escapeHtml(mode.label)}</div>
          <div class="preset-card-flavor">${escapeHtml(mode.flavor)}</div>
        </div>
        <div class="preset-card-copy">${escapeHtml(mode.description)}</div>
        <div class="preset-tags">
          ${mode.tags.map((tag) => `<span class="preset-tag">${escapeHtml(tag)}</span>`).join("")}
        </div>
        <div class="preset-card-actions">
          <button type="button" class="secondary-btn" data-action="select" data-mode="${mode.key}">use voice</button>
          <button type="button" class="ghost-btn" data-action="copy" data-mode="${mode.key}">copy to custom</button>
        </div>
      </article>
    `,
  ).join("");
}

function initializeCustomPresetUi() {
  elements.customPresetFields.innerHTML = CUSTOM_PRESET_FIELDS.map(
    (field) => `
      <label class="preset-field">
        <span class="preset-label">
          <span>${field.label}</span>
          <strong class="preset-value" data-preset-value="${field.key}"></strong>
        </span>
        <input
          class="preset-slider"
          data-preset-key="${field.key}"
          type="range"
          min="${field.min}"
          max="${field.max}"
          step="${field.step}"
        >
      </label>
    `,
  ).join("");

  for (const slider of document.querySelectorAll(".preset-slider")) {
    slider.addEventListener("input", () => {
      const nextPreset = {
        ...state.customPreset,
        [slider.dataset.presetKey]: Number(slider.value),
      };
      setCustomPreset(nextPreset);
      scheduleLivePreview();
    });
  }

  syncCustomPresetUi();
}

function updateModeUi() {
  if (elements.soundMode.value !== "custom") {
    cancelLivePreview();
  }
  elements.modeDescription.textContent = MODE_DESCRIPTIONS[elements.soundMode.value];
  elements.customPresetPanel.classList.toggle("hidden", elements.soundMode.value !== "custom");
  syncPresetBrowser();
  syncCustomPresetUi();
}

function syncPresetBrowser() {
  for (const card of elements.presetBrowser.querySelectorAll("[data-mode-card]")) {
    card.classList.toggle("is-active", card.dataset.modeCard === elements.soundMode.value);
  }
}

function syncCustomPresetUi() {
  for (const field of CUSTOM_PRESET_FIELDS) {
    const slider = document.querySelector(`[data-preset-key="${field.key}"]`);
    const value = document.querySelector(`[data-preset-value="${field.key}"]`);
    if (!slider || !value) {
      continue;
    }

    slider.value = String(state.customPreset[field.key]);
    value.textContent = formatPresetValue(state.customPreset[field.key], field.step);
  }
}

function setCustomPreset(nextPreset) {
  state.customPreset = sanitizePreset(nextPreset);
  syncCustomPresetUi();
  storeCustomPreset(state.customPreset);
}

function setRawBundle(bundle) {
  state.rawBundle = bundle;
  elements.embeddedLogSelect.innerHTML = bundle.flights
    .map(
      (flight, index) =>
        `<option value="${index}">${escapeHtml(flight.label)}</option>`,
    )
    .join("");

  if (bundle.flights.length > 1) {
    elements.embeddedLogField.classList.remove("hidden");
  } else {
    elements.embeddedLogField.classList.add("hidden");
  }
}

function clearRawBundle() {
  state.rawBundle = null;
  elements.embeddedLogSelect.innerHTML = "";
  elements.embeddedLogField.classList.add("hidden");
}

function applyEmbeddedLogSelection(index) {
  if (!state.rawBundle) {
    return;
  }

  const safeIndex = clampNumber(index, 0, state.rawBundle.flights.length - 1);
  elements.embeddedLogSelect.value = String(safeIndex);
  loadLog(normalizeParsedLog(state.rawBundle.flights[safeIndex]));

  if (state.rawBundle.flights.length > 1) {
    setStatus(`selected ${state.rawBundle.flights[safeIndex].label}.`);
  }
}

function clearVideo() {
  if (state.videoUrl) {
    URL.revokeObjectURL(state.videoUrl);
    state.videoUrl = null;
  }
  elements.videoPreview.pause();
  elements.videoPreview.removeAttribute("src");
  elements.videoPreview.load();
  refreshStickOverlay();
}

function clearRender() {
  cancelLivePreview();
  stopPreviewAudio();
  stopPlayback();
  if (state.audioUrl) {
    URL.revokeObjectURL(state.audioUrl);
    state.audioUrl = null;
  }
  elements.audioPlayer.removeAttribute("src");
  elements.audioPlayer.load();
  elements.downloadLink.classList.add("hidden");
  elements.downloadLink.removeAttribute("href");
  elements.renderSummary.textContent = "not rendered";
  state.render = null;
}

function attachRender(render) {
  clearRender();
  state.render = render;
  state.audioUrl = URL.createObjectURL(render.blob);
  elements.audioPlayer.src = state.audioUrl;
  elements.downloadLink.href = state.audioUrl;
  elements.downloadLink.classList.remove("hidden");
  elements.renderSummary.textContent = [
    `${formatSeconds(render.duration)}`,
    `${render.modeLabel}`,
    `${render.sampleRate / 1000} khz`,
  ].join(" · ");
}

function stopPlayback() {
  stopSyncLoop();
  stopPreviewAudio();
  elements.audioPlayer.pause();
  elements.audioPlayer.currentTime = 0;
  elements.videoPreview.pause();
  if (elements.videoPreview.src) {
    elements.videoPreview.currentTime = clampNumber(Number(elements.videoStart.value), 0, 1e9);
  }
  refreshStickOverlay();
}

function cancelLivePreview() {
  if (!state.livePreviewTimer) {
    return;
  }

  window.clearTimeout(state.livePreviewTimer);
  state.livePreviewTimer = null;
}

function scheduleLivePreview() {
  cancelLivePreview();

  if (
    !elements.livePreviewToggle.checked ||
    elements.soundMode.value !== "custom" ||
    !state.log
  ) {
    return;
  }

  state.livePreviewTimer = window.setTimeout(() => {
    state.livePreviewTimer = null;
    previewCustomPresetAudio(false);
  }, LIVE_PREVIEW_DEBOUNCE_MS);
}

async function previewCustomPresetAudio(isManual) {
  cancelLivePreview();

  if (!state.log) {
    setStatus("load a log first to preview the custom preset.");
    return;
  }

  if (elements.soundMode.value !== "custom") {
    elements.soundMode.value = "custom";
    updateModeUi();
  }

  const clipStart = clampNumber(
    Number(elements.clipStart.value),
    0,
    Math.max(0, state.log.duration - 0.1),
  );
  const clipDuration = clampNumber(
    Number(elements.clipDuration.value),
    0.5,
    Math.max(0.5, state.log.duration - clipStart),
  );
  const previewDuration = Math.min(LIVE_PREVIEW_DURATION, clipDuration);
  const preview = renderSynthData(state.log, {
    start: clipStart,
    duration: previewDuration,
    mode: "custom",
    wind: elements.windToggle.checked,
    resonance: elements.resonanceToggle.checked,
  });

  const played = await playPreviewBuffer(preview.channels, preview.sampleRate);
  if (!played) {
    setStatus("live preview needs web audio support in this browser.");
    return;
  }

  setStatus(
    isManual
      ? `previewing custom preset · ${previewDuration.toFixed(1)}s slice.`
      : `live preview updated · ${previewDuration.toFixed(1)}s slice.`,
  );
}

function getPreviewAudioContext() {
  if (state.previewAudioContext) {
    return state.previewAudioContext;
  }

  const AudioContextCtor = globalThis.AudioContext || globalThis.webkitAudioContext;
  if (!AudioContextCtor) {
    return null;
  }

  state.previewAudioContext = new AudioContextCtor();
  return state.previewAudioContext;
}

function stopPreviewAudio() {
  if (!state.previewSource) {
    return;
  }

  try {
    state.previewSource.stop();
  } catch (_error) {
    // Ignore stop errors when the source already ended.
  }

  state.previewSource.disconnect();
  state.previewSource = null;
}

async function playPreviewBuffer(channels, sampleRate) {
  const audioContext = getPreviewAudioContext();
  if (!audioContext) {
    return false;
  }

  if (audioContext.state === "suspended") {
    await audioContext.resume();
  }

  stopPreviewAudio();

  const frameCount = channels[0].length;
  const audioBuffer = audioContext.createBuffer(channels.length, frameCount, sampleRate);
  for (let channelIndex = 0; channelIndex < channels.length; channelIndex += 1) {
    audioBuffer.copyToChannel(channels[channelIndex], channelIndex);
  }

  const source = audioContext.createBufferSource();
  const gainNode = audioContext.createGain();
  gainNode.gain.value = 0.9;
  source.buffer = audioBuffer;
  source.connect(gainNode);
  gainNode.connect(audioContext.destination);
  source.onended = () => {
    if (state.previewSource === source) {
      state.previewSource = null;
    }
    source.disconnect();
    gainNode.disconnect();
  };
  state.previewSource = source;
  source.start();
  return true;
}

function startSyncLoop() {
  stopSyncLoop();

  const sync = () => {
    if (elements.videoPreview.paused) {
      state.syncRaf = null;
      refreshStickOverlay();
      return;
    }

    const targetAudioTime = getAudioTimeForCurrentVideo();
    const drift = targetAudioTime - elements.audioPlayer.currentTime;

    if (!elements.audioPlayer.paused && targetAudioTime >= 0 && Math.abs(drift) > 0.08) {
      elements.audioPlayer.currentTime = clampNumber(
        targetAudioTime,
        0,
        Math.max(0, elements.audioPlayer.duration || targetAudioTime),
      );
    }

    refreshStickOverlay();

    if (!elements.audioPlayer.paused &&
      targetAudioTime >= (elements.audioPlayer.duration || Number.MAX_SAFE_INTEGER)) {
      stopPlayback();
      return;
    }

    state.syncRaf = window.requestAnimationFrame(sync);
  };

  state.syncRaf = window.requestAnimationFrame(sync);
}

function stopSyncLoop() {
  if (state.syncRaf) {
    window.cancelAnimationFrame(state.syncRaf);
    state.syncRaf = null;
  }
}

function nudgeVideoStart(delta) {
  const nextValue = clampNumber(Number(elements.videoStart.value) + delta, 0, 1e9);
  elements.videoStart.value = nextValue.toFixed(Math.abs(delta) < 1 ? 1 : 0);
  refreshStickOverlay();

  if (elements.videoPreview.src) {
    elements.videoPreview.currentTime = nextValue;
  }
}

function getAudioTimeForCurrentVideo() {
  return elements.videoPreview.currentTime - clampNumber(Number(elements.videoStart.value), 0, 1e9);
}

function getPreviewLogTime() {
  return clampNumber(Number(elements.clipStart.value), 0, 1e9) + getAudioTimeForCurrentVideo();
}

function refreshStickOverlay() {
  const canvas = elements.stickOverlayCanvas;
  if (!canvas) {
    return;
  }

  if (
    !elements.stickOverlayToggle.checked ||
    !elements.videoPreview.src ||
    !state.log ||
    !state.log.sticksAvailable
  ) {
    clearStickOverlay();
    return;
  }

  const rect = elements.videoPreview.getBoundingClientRect();
  if (!rect.width || !rect.height) {
    clearStickOverlay();
    return;
  }

  const dpr = window.devicePixelRatio || 1;
  const width = Math.round(rect.width);
  const height = Math.round(rect.height);

  if (canvas.width !== Math.round(width * dpr) || canvas.height !== Math.round(height * dpr)) {
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
  }

  const ctx = canvas.getContext("2d");
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, width, height);

  const logTime = getPreviewLogTime();
  if (logTime < 0 || logTime > state.log.duration) {
    return;
  }

  const sticks = sampleStickState(state.log.frames, logTime);
  if (!sticks) {
    return;
  }

  drawStickOverlay(ctx, width, height, sticks);
}

function clearStickOverlay() {
  const canvas = elements.stickOverlayCanvas;
  if (!canvas) {
    return;
  }

  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, canvas.width, canvas.height);
}

function sampleStickState(frames, time) {
  if (!frames.length) {
    return null;
  }

  const frameIndex = findFrameIndex(frames, time);
  const current = frames[frameIndex];
  const next = frames[Math.min(frameIndex + 1, frames.length - 1)];
  const span = Math.max(0.000001, next.time - current.time);
  const amount = clampNumber((time - current.time) / span, 0, 1);

  if (!current.sticks && !next.sticks) {
    return null;
  }

  const start = current.sticks || next.sticks;
  const end = next.sticks || current.sticks;

  return {
    roll: lerp(start.roll, end.roll, amount),
    pitch: lerp(start.pitch, end.pitch, amount),
    yaw: lerp(start.yaw, end.yaw, amount),
    throttle: lerp(start.throttle, end.throttle, amount),
  };
}

function drawStickOverlay(ctx, width, height, sticks) {
  const pad = Math.max(14, width * 0.025);
  const panelSize = Math.max(92, Math.min(width, height) * 0.22);
  const radius = panelSize * 0.5;
  const leftX = pad + radius;
  const rightX = pad + panelSize + pad * 0.7 + radius;
  const centerY = height - pad - radius;

  ctx.save();
  ctx.fillStyle = "rgba(19, 17, 26, 0.42)";
  ctx.strokeStyle = "rgba(142, 243, 239, 0.24)";
  ctx.lineWidth = 1.2;
  drawStickBox(ctx, leftX, centerY, panelSize);
  drawStickBox(ctx, rightX, centerY, panelSize);

  ctx.fillStyle = "rgba(242, 240, 251, 0.8)";
  ctx.font = `${Math.round(panelSize * 0.12)}px JetBrains Mono, monospace`;
  ctx.textAlign = "center";
  ctx.fillText("yaw / thr", leftX, centerY + radius + panelSize * 0.14);
  ctx.fillText("roll / pitch", rightX, centerY + radius + panelSize * 0.14);

  drawStickDot(ctx, leftX, centerY, radius * 0.82, sticks.yaw, -sticks.throttle * 2 + 1);
  drawStickDot(ctx, rightX, centerY, radius * 0.82, sticks.roll, -sticks.pitch);
  ctx.restore();
}

function drawStickBox(ctx, centerX, centerY, size) {
  const half = size / 2;
  ctx.beginPath();
  ctx.roundRect(centerX - half, centerY - half, size, size, 12);
  ctx.fill();
  ctx.stroke();

  ctx.beginPath();
  ctx.strokeStyle = "rgba(242, 240, 251, 0.18)";
  ctx.moveTo(centerX - half, centerY);
  ctx.lineTo(centerX + half, centerY);
  ctx.moveTo(centerX, centerY - half);
  ctx.lineTo(centerX, centerY + half);
  ctx.stroke();
}

function drawStickDot(ctx, centerX, centerY, radius, xNorm, yNorm) {
  const clampedX = clampNumber(xNorm, -1, 1);
  const clampedY = clampNumber(yNorm, -1, 1);
  const dotX = centerX + clampedX * radius;
  const dotY = centerY + clampedY * radius;

  ctx.beginPath();
  ctx.fillStyle = "rgba(128, 199, 255, 0.14)";
  ctx.arc(dotX, dotY, radius * 0.22, 0, Math.PI * 2);
  ctx.fill();

  ctx.beginPath();
  ctx.fillStyle = "#8ef3ef";
  ctx.arc(dotX, dotY, radius * 0.12, 0, Math.PI * 2);
  ctx.fill();

  ctx.beginPath();
  ctx.strokeStyle = "rgba(142, 243, 239, 0.45)";
  ctx.lineWidth = 1;
  ctx.arc(dotX, dotY, radius * 0.22, 0, Math.PI * 2);
  ctx.stroke();
}

function setStatus(message) {
  elements.statusStrip.textContent = message;
}

function getPresetForMode(mode) {
  return mode === "custom" ? state.customPreset : MODE_PRESETS[mode];
}

function getModeLabel(mode) {
  return MODE_META[mode]?.label ?? mode;
}

function clonePreset(preset) {
  return JSON.parse(JSON.stringify(preset));
}

function sanitizePreset(candidate) {
  const nextPreset = {};

  for (const field of CUSTOM_PRESET_FIELDS) {
    nextPreset[field.key] = clampNumber(Number(candidate?.[field.key]), field.min, field.max);
  }

  return nextPreset;
}

function loadStoredCustomPreset() {
  const fallback = clonePreset(MODE_PRESETS.realistic);
  try {
    if (!globalThis.localStorage) {
      return fallback;
    }

    const stored = globalThis.localStorage.getItem(CUSTOM_PRESET_STORAGE_KEY);
    return stored ? sanitizePreset(JSON.parse(stored)) : fallback;
  } catch (_error) {
    return fallback;
  }
}

function storeCustomPreset(preset) {
  try {
    globalThis.localStorage?.setItem(CUSTOM_PRESET_STORAGE_KEY, JSON.stringify(preset));
  } catch (_error) {
    // Ignore storage failures.
  }
}

function formatPresetValue(value, step) {
  if (step >= 1) {
    return `${Math.round(value)}`;
  }
  if (step >= 0.01) {
    return value.toFixed(2);
  }
  return value.toFixed(3);
}

function exportCustomPreset() {
  const payload = {
    name: "blackbox-audio-custom-preset",
    version: 1,
    preset: state.customPreset,
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = "blackbox-audio-preset.json";
  anchor.click();
  URL.revokeObjectURL(url);
}

function escapeHtml(value) {
  return `${value}`
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function parseBlackboxCsv(text, sourceName) {
  const rows = parseCsv(text);
  if (rows.length < 3) {
    throw new Error("CSV looks empty or too short to synthesize.");
  }

  const headers = rows[0].map((header) => header.trim());
  const mapping = detectColumns(headers);

  if (mapping.timeIndex === -1) {
    throw new Error("Could not find a usable time column in the CSV.");
  }

  if (mapping.motorIndices.length < 2) {
    throw new Error("Need at least two motor output columns to synthesize audio.");
  }

  const timeScale = guessTimeScale(headers[mapping.timeIndex]);
  const rawFrames = [];

  for (let rowIndex = 1; rowIndex < rows.length; rowIndex += 1) {
    const row = rows[rowIndex];
    const timeRaw = Number(row[mapping.timeIndex]);
    if (!Number.isFinite(timeRaw)) {
      continue;
    }

    const time = timeRaw * timeScale;
    const motors = mapping.motorIndices.map((index) => Number(row[index]));
    if (motors.some((value) => !Number.isFinite(value))) {
      continue;
    }

    const throttleRaw =
      mapping.throttleIndex === -1 ? null : Number(row[mapping.throttleIndex]);
    const throttle = Number.isFinite(throttleRaw) ? throttleRaw : null;

    const gyro = mapping.gyroIndices.map((index) => Number(row[index]));
    const usableGyro = gyro.every((value) => Number.isFinite(value)) ? gyro : [];
    const rpms = mapping.rpmIndices.map((index) => Number(row[index]));
    const usableRpms = rpms.every((value) => Number.isFinite(value)) ? rpms : [];
    const stickAxes = mapping.stickIndices.map((index) => Number(row[index]));
    const usableStickAxes = stickAxes.every((value) => Number.isFinite(value)) ? stickAxes : [];

    rawFrames.push({
      time,
      motors,
      rpms: usableRpms,
      throttle,
      gyro: usableGyro,
      stickAxes: usableStickAxes,
    });
  }

  return normalizeParsedLog({
    sourceName,
    rawFrames,
    detection: {
      hasThrottle: mapping.throttleIndex !== -1,
      hasGyro: mapping.gyroIndices.length >= 3,
      hasStickAxes: mapping.stickIndices.length === 3,
      hasRpm: mapping.rpmIndices.length >= Math.min(2, mapping.motorIndices.length),
    },
  });
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = "";
  let inQuotes = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];

    if (inQuotes) {
      if (char === '"') {
        if (text[index + 1] === '"') {
          cell += '"';
          index += 1;
        } else {
          inQuotes = false;
        }
      } else {
        cell += char;
      }
      continue;
    }

    if (char === '"') {
      inQuotes = true;
      continue;
    }

    if (char === ",") {
      row.push(cell);
      cell = "";
      continue;
    }

    if (char === "\n") {
      row.push(cell);
      if (row.some((value) => value.trim().length)) {
        rows.push(row);
      }
      row = [];
      cell = "";
      continue;
    }

    if (char !== "\r") {
      cell += char;
    }
  }

  if (cell.length || row.length) {
    row.push(cell);
    if (row.some((value) => value.trim().length)) {
      rows.push(row);
    }
  }

  return rows;
}

function detectColumns(headers) {
  const normalized = headers.map((header) => header.trim().toLowerCase());
  const timeIndex = normalized.findIndex((header) => /(^|\s)time(\s|\(|$)/.test(header));
  const throttleIndex = normalized.findIndex(
    (header) =>
      header.includes("rccommand[3]") ||
      header.includes("setpoint[3]") ||
      header === "throttle" ||
      header.includes("throttle"),
  );

  const motorIndices = normalized
    .map((header, index) => {
      const match = header.match(/motor[\s_]*\[?(\d+)\]?/i);
      return match ? { index, motorNumber: Number(match[1]) } : null;
    })
    .filter(Boolean)
    .sort((left, right) => left.motorNumber - right.motorNumber)
    .map((entry) => entry.index);

  const gyroIndices = normalized
    .map((header, index) => {
      const match = header.match(/(?:gyroadc|gyrodata|gyro)[\s_]*\[?(\d+)\]?/i);
      return match ? { index, axis: Number(match[1]) } : null;
    })
    .filter(Boolean)
    .sort((left, right) => left.axis - right.axis)
    .slice(0, 3)
    .map((entry) => entry.index);
  const rpmIndices = normalized
    .map((header, index) => {
      const match = header.match(/(?:^|[^a-z])(e?rpm|motorrpm)[\s_]*\[?(\d+)\]?/i);
      return match ? { index, motorNumber: Number(match[2]) } : null;
    })
    .filter(Boolean)
    .sort((left, right) => left.motorNumber - right.motorNumber)
    .map((entry) => entry.index);
  const stickIndices = [0, 1, 2]
    .map((axis) =>
      normalized.findIndex(
        (header) =>
          header.includes(`rccommand[${axis}]`) || header.includes(`setpoint[${axis}]`),
      ),
    )
    .filter((index) => index !== -1);

  return {
    timeIndex,
    throttleIndex,
    motorIndices,
    rpmIndices,
    gyroIndices,
    stickIndices,
  };
}

function normalizeParsedLog(parsed) {
  const { rawFrames, sourceName, detection } = parsed;
  if (rawFrames.length < 4) {
    throw new Error("parsed the log, but there were not enough usable flight samples.");
  }

  rawFrames.sort((left, right) => left.time - right.time);
  const reducedFrames = reduceFrameRate(removeDuplicateTimes(rawFrames));
  let motorMin = Number.POSITIVE_INFINITY;
  let motorMax = Number.NEGATIVE_INFINITY;
  let rpmMin = Number.POSITIVE_INFINITY;
  let rpmMax = Number.NEGATIVE_INFINITY;
  let throttleMin = Number.POSITIVE_INFINITY;
  let throttleMax = Number.NEGATIVE_INFINITY;
  const stickMins = [Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY];
  const stickMaxs = [Number.NEGATIVE_INFINITY, Number.NEGATIVE_INFINITY, Number.NEGATIVE_INFINITY];

  for (const frame of reducedFrames) {
    for (const motor of frame.motors) {
      motorMin = Math.min(motorMin, motor);
      motorMax = Math.max(motorMax, motor);
    }

    for (const rpm of frame.rpms ?? []) {
      rpmMin = Math.min(rpmMin, rpm);
      rpmMax = Math.max(rpmMax, rpm);
    }

    if (frame.throttle !== null && Number.isFinite(frame.throttle)) {
      throttleMin = Math.min(throttleMin, frame.throttle);
      throttleMax = Math.max(throttleMax, frame.throttle);
    }

    if (frame.stickAxes?.length === 3) {
      for (let axis = 0; axis < 3; axis += 1) {
        stickMins[axis] = Math.min(stickMins[axis], frame.stickAxes[axis]);
        stickMaxs[axis] = Math.max(stickMaxs[axis], frame.stickAxes[axis]);
      }
    }
  }

  const safeMotorMin = Number.isFinite(motorMin) ? motorMin : 1000;
  const safeMotorRange = Math.max(1, motorMax - safeMotorMin);
  const hasRpm = detection.hasRpm && Number.isFinite(rpmMax);
  const safeRpmMin = hasRpm ? rpmMin : 0;
  const safeRpmRange = hasRpm ? Math.max(1, rpmMax - safeRpmMin) : 1;
  const hasThrottle = detection.hasThrottle && Number.isFinite(throttleMax);
  const safeThrottleMin = hasThrottle ? throttleMin : 1000;
  const safeThrottleRange = hasThrottle ? Math.max(1, throttleMax - safeThrottleMin) : 1;
  const hasStickAxes =
    detection.hasStickAxes && stickMaxs.every((value) => Number.isFinite(value));

  const frames = reducedFrames.map((frame) => {
    const motorNorms = frame.motors.map((motor) =>
      clampNumber((motor - safeMotorMin) / safeMotorRange, 0, 1),
    );
    const rpmNorms = (frame.rpms ?? []).map((rpm) =>
      clampNumber((rpm - safeRpmMin) / safeRpmRange, 0, 1),
    );
    const avgMotor =
      motorNorms.reduce((sum, value) => sum + value, 0) / Math.max(1, motorNorms.length);
    const throttleNorm =
      frame.throttle === null
        ? avgMotor
        : clampNumber((frame.throttle - safeThrottleMin) / safeThrottleRange, 0, 1);
    const gyroNorm =
      frame.gyro.length >= 3
        ? clampNumber(
            Math.sqrt(
              frame.gyro[0] * frame.gyro[0] +
                frame.gyro[1] * frame.gyro[1] +
                frame.gyro[2] * frame.gyro[2],
            ) / 900,
            0,
            1,
          )
        : 0;
    const sticks =
      frame.stickAxes?.length === 3
        ? {
            roll: normalizeStickAxis(frame.stickAxes[0], stickMins[0], stickMaxs[0]),
            pitch: normalizeStickAxis(frame.stickAxes[1], stickMins[1], stickMaxs[1]),
            yaw: normalizeStickAxis(frame.stickAxes[2], stickMins[2], stickMaxs[2]),
            throttle: throttleNorm,
          }
        : null;

    return {
      time: frame.time - reducedFrames[0].time,
      motors: motorNorms,
      rpms: rpmNorms,
      avgMotor,
      throttle: throttleNorm,
      gyro: gyroNorm,
      sticks,
    };
  });

  return {
    sourceName,
    frames,
    duration: Math.max(0.1, frames[frames.length - 1].time),
    motorCount: frames[0].motors.length,
    sticksAvailable: frames.some((frame) => frame.sticks),
    fieldSummary: {
      rpm: hasRpm ? "rpm detected" : "rpm missing",
      throttle: hasThrottle ? "throttle detected" : "throttle derived from motor average",
      gyro: detection.hasGyro ? "gyro detected" : "gyro missing",
      sticks: hasStickAxes ? "stick data detected" : "stick data missing",
    },
  };
}

function isRawBlackboxFile(file) {
  return /\.(bbl|bfl)$/i.test(file.name);
}

function guessTimeScale(header) {
  const normalized = header.toLowerCase();
  if (normalized.includes("us")) {
    return 1 / 1_000_000;
  }
  if (normalized.includes("ms")) {
    return 1 / 1_000;
  }
  return 1;
}

function removeDuplicateTimes(frames) {
  const result = [];
  let lastTime = Number.NEGATIVE_INFINITY;

  for (const frame of frames) {
    if (frame.time > lastTime) {
      result.push(frame);
      lastTime = frame.time;
    }
  }

  return result;
}

function reduceFrameRate(frames) {
  if (frames.length < 3) {
    return frames;
  }

  const duration = frames[frames.length - 1].time - frames[0].time;
  if (duration <= 0) {
    return frames;
  }

  const rate = frames.length / duration;
  if (rate <= MAX_ANALYSIS_RATE) {
    return frames;
  }

  const step = Math.max(1, Math.ceil(rate / MAX_ANALYSIS_RATE));
  return frames.filter((_, index) => index % step === 0 || index === frames.length - 1);
}

function renderSynthData(log, options) {
  const preset = getPresetForMode(options.mode);
  if (!preset) {
    throw new Error("Unknown sound mode.");
  }

  const clipStart = clampNumber(options.start, 0, Math.max(0, log.duration - 0.1));
  const clipDuration = clampNumber(options.duration, 0.1, Math.max(0.1, log.duration - clipStart));
  const totalSamples = Math.max(1, Math.floor(clipDuration * SAMPLE_RATE));
  const left = new Float32Array(totalSamples);
  const right = new Float32Array(totalSamples);
  const motorCount = log.motorCount;
  const phases = new Float32Array(motorCount);
  const pans = createPanArray(motorCount);
  const startTime = clipStart;
  const endTime = clipStart + clipDuration;
  let frameIndex = findFrameIndex(log.frames, clipStart);
  let previousAvg = 0;
  let windSlow = 0;
  let windFast = 0;
  let resonancePhase = 0;
  let fmPhase = 0;
  let subPhase = 0;

  for (let sampleIndex = 0; sampleIndex < totalSamples; sampleIndex += 1) {
    const time = startTime + sampleIndex / SAMPLE_RATE;

    while (
      frameIndex < log.frames.length - 2 &&
      log.frames[frameIndex + 1].time < time &&
      log.frames[frameIndex + 1].time < endTime
    ) {
      frameIndex += 1;
    }

    const current = log.frames[frameIndex];
    const next = log.frames[Math.min(frameIndex + 1, log.frames.length - 1)];
    const timeSpan = Math.max(0.000001, next.time - current.time);
    const mixAmount = clampNumber((time - current.time) / timeSpan, 0, 1);

    let avgMotor = 0;
    let variance = 0;
    const motors = new Array(motorCount);
    const pitchDrivers = new Array(motorCount);

    for (let motorIndex = 0; motorIndex < motorCount; motorIndex += 1) {
      const value = lerp(current.motors[motorIndex], next.motors[motorIndex], mixAmount);
      motors[motorIndex] = value;
      const rpmDriver =
        current.rpms?.[motorIndex] !== undefined && next.rpms?.[motorIndex] !== undefined
          ? lerp(current.rpms[motorIndex], next.rpms[motorIndex], mixAmount)
          : value;
      pitchDrivers[motorIndex] = rpmDriver;
      avgMotor += value;
    }

    avgMotor /= motorCount;

    for (let motorIndex = 0; motorIndex < motorCount; motorIndex += 1) {
      const centered = motors[motorIndex] - avgMotor;
      variance += centered * centered;
    }

    const spread = clampNumber(Math.sqrt(variance / motorCount) * 2.4, 0, 1);
    const throttle = lerp(current.throttle, next.throttle, mixAmount);
    const gyro = lerp(current.gyro, next.gyro, mixAmount);
    const dynamic = clampNumber(Math.abs(avgMotor - previousAvg) * 18, 0, 1);
    previousAvg = avgMotor;

    const white = Math.random() * 2 - 1;
    windSlow = windSlow * 0.992 + white * 0.008;
    windFast = windFast * 0.72 + white * 0.28;

    let leftMotorMix = 0;
    let rightMotorMix = 0;

    for (let motorIndex = 0; motorIndex < motorCount; motorIndex += 1) {
      const motor = motors[motorIndex];
      const pitchDriver = pitchDrivers[motorIndex];
      const frequency =
        preset.basePitch +
        pitchDriver * preset.pitchRange +
        gyro * preset.gyroPitch +
        spread * preset.spreadPitch;

      phases[motorIndex] += (Math.PI * 2 * frequency) / SAMPLE_RATE;
      if (phases[motorIndex] > Math.PI * 2) {
        phases[motorIndex] -= Math.PI * 2;
      }

      const phase = phases[motorIndex];
      const amplitude = 0.03 + Math.pow(motor, 1.35) * 0.28;
      let tone =
        Math.sin(phase) +
        preset.harmonic2 * Math.sin(phase * 2 + dynamic * 1.7) +
        preset.harmonic3 * Math.sin(phase * 3 + spread * 1.3);

      if (preset.spaceGain > 0) {
        tone += preset.spaceGain * Math.sin(phase * 0.5 + Math.sin(fmPhase) * 2.6);
      }

      const voice = tone * amplitude;
      const pan = pans[motorIndex];
      leftMotorMix += voice * (1 - pan) * 0.5;
      rightMotorMix += voice * (1 + pan) * 0.5;
    }

    resonancePhase +=
      (Math.PI * 2 * (165 + spread * 220 + dynamic * 70 + gyro * 55)) / SAMPLE_RATE;
    fmPhase += (Math.PI * 2 * (18 + gyro * 70 + spread * 35)) / SAMPLE_RATE;
    subPhase += (Math.PI * 2 * (55 + avgMotor * 45)) / SAMPLE_RATE;

    const windAmount = options.wind
      ? Math.pow(clampNumber(throttle * 0.7 + gyro * 0.4, 0, 1), 1.6) * preset.windGain
      : 0;
    const resonanceAmount = options.resonance
      ? (spread * 0.9 + dynamic * 0.55 + gyro * 0.35) * preset.resonanceGain
      : 0;
    const windTexture = windFast - windSlow;
    const transient = windTexture * dynamic * preset.transientGain;
    const sub = Math.sin(subPhase) * avgMotor * preset.subGain;
    const resonance = Math.sin(resonancePhase) * resonanceAmount;
    const wind = windTexture * windAmount * 0.72 + windSlow * windAmount * 0.16;

    let leftSample = leftMotorMix * preset.motorGain + wind + transient + resonance + sub;
    let rightSample =
      rightMotorMix * preset.motorGain + wind - transient * 0.3 + resonance + sub;

    const fade = computeFade(sampleIndex, totalSamples, FADE_TIME_SECONDS * SAMPLE_RATE);
    left[sampleIndex] = softClip(leftSample * 1.32) * fade;
    right[sampleIndex] = softClip(rightSample * 1.32) * fade;
  }

  return {
    channels: [left, right],
    duration: clipDuration,
    sampleRate: SAMPLE_RATE,
    modeLabel: getModeLabel(options.mode),
  };
}

function synthesizeClip(log, options) {
  const render = renderSynthData(log, options);
  return {
    ...render,
    blob: encodeWavBlob(render.channels, render.sampleRate),
  };
}

function findFrameIndex(frames, time) {
  let low = 0;
  let high = frames.length - 1;

  while (low < high) {
    const mid = Math.floor((low + high) / 2);
    if (frames[mid].time < time) {
      low = mid + 1;
    } else {
      high = mid;
    }
  }

  return Math.max(0, low - 1);
}

function encodeWavBlob(channels, sampleRate) {
  const channelCount = channels.length;
  const frameCount = channels[0].length;
  const bytesPerSample = 2;
  const blockAlign = channelCount * bytesPerSample;
  const byteRate = sampleRate * blockAlign;
  const dataSize = frameCount * blockAlign;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);

  writeAscii(view, 0, "RIFF");
  view.setUint32(4, 36 + dataSize, true);
  writeAscii(view, 8, "WAVE");
  writeAscii(view, 12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, channelCount, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, 16, true);
  writeAscii(view, 36, "data");
  view.setUint32(40, dataSize, true);

  let offset = 44;
  for (let frame = 0; frame < frameCount; frame += 1) {
    for (let channel = 0; channel < channelCount; channel += 1) {
      const sample = clampNumber(channels[channel][frame], -1, 1);
      view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true);
      offset += 2;
    }
  }

  return new Blob([buffer], { type: "audio/wav" });
}

function writeAscii(view, offset, value) {
  for (let index = 0; index < value.length; index += 1) {
    view.setUint8(offset + index, value.charCodeAt(index));
  }
}

function createPanArray(count) {
  if (count <= PAN_POSITIONS.length) {
    return PAN_POSITIONS.slice(0, count);
  }

  return Array.from({ length: count }, (_, index) =>
    lerp(-0.7, 0.7, index / Math.max(1, count - 1)),
  );
}

function buildDemoCsv() {
  const lines = [
    "time (us),motor[0],motor[1],motor[2],motor[3],eRPM[0],eRPM[1],eRPM[2],eRPM[3],rcCommand[0],rcCommand[1],rcCommand[2],rcCommand[3],gyroADC[0],gyroADC[1],gyroADC[2]",
  ];
  const duration = 20;
  const rate = 500;
  const totalFrames = duration * rate;

  for (let index = 0; index < totalFrames; index += 1) {
    const time = index / rate;
    const throttleBase =
      0.24 +
      0.14 * Math.sin(time * 0.65) +
      0.12 * smoothPulse(time, 3.4, 1.2) +
      0.08 * smoothPulse(time, 9.6, 1.4) +
      0.1 * smoothPulse(time, 14.8, 1.1);

    const roll = 0.08 * Math.sin(time * 2.7) + 0.04 * Math.sin(time * 5.2);
    const pitch = 0.09 * Math.sin(time * 1.8 + 1.1);
    const yaw = 0.06 * Math.sin(time * 3.3 + 2.6);
    const throttle = clampNumber(throttleBase, 0.08, 0.92);

    const motors = [
      throttle + roll - pitch + yaw,
      throttle - roll - pitch - yaw,
      throttle - roll + pitch + yaw,
      throttle + roll + pitch - yaw,
    ].map((value, motorIndex) =>
      clampNumber(value + 0.02 * Math.sin(time * (8 + motorIndex * 1.3)), 0.05, 0.98),
    );
    const rpms = motors.map((motor, motorIndex) =>
      Math.round(14000 + motor * 26000 + Math.sin(time * (11 + motorIndex * 0.7)) * 900),
    );

    const gyroX = Math.sin(time * 2.7) * 180 + Math.sin(time * 13.2) * 28;
    const gyroY = Math.sin(time * 1.8 + 1.1) * 220 + Math.sin(time * 10.8) * 22;
    const gyroZ = Math.sin(time * 3.3 + 2.6) * 140 + Math.sin(time * 15.7) * 18;

    lines.push(
      [
        Math.round(time * 1_000_000),
        ...motors.map((motor) => Math.round(1000 + motor * 900)),
        ...rpms,
        Math.round(roll * 500),
        Math.round(pitch * 500),
        Math.round(yaw * 500),
        Math.round(1000 + throttle * 1000),
        Math.round(gyroX),
        Math.round(gyroY),
        Math.round(gyroZ),
      ].join(","),
    );
  }

  return lines.join("\n");
}

function smoothPulse(time, center, width) {
  const distance = Math.abs(time - center);
  if (distance >= width) {
    return 0;
  }
  const normalized = 1 - distance / width;
  return normalized * normalized * (3 - 2 * normalized);
}

function normalizeStickAxis(value, observedMin, observedMax) {
  const rangeMin = Number.isFinite(observedMin) ? observedMin : -500;
  const rangeMax = Number.isFinite(observedMax) ? observedMax : 500;

  if (rangeMin >= 900 && rangeMax <= 2100) {
    return clampNumber((value - 1500) / 500, -1, 1);
  }

  const maxAbs = Math.max(Math.abs(rangeMin), Math.abs(rangeMax), 1);
  return clampNumber(value / maxAbs, -1, 1);
}

function clampNumber(value, min, max) {
  if (!Number.isFinite(value)) {
    return min;
  }
  return Math.min(max, Math.max(min, value));
}

function lerp(start, end, amount) {
  return start + (end - start) * amount;
}

function softClip(value) {
  return Math.tanh(value);
}

function computeFade(index, totalSamples, fadeSamples) {
  if (fadeSamples <= 1) {
    return 1;
  }

  if (index < fadeSamples) {
    return index / fadeSamples;
  }

  if (index > totalSamples - fadeSamples) {
    return (totalSamples - index) / fadeSamples;
  }

  return 1;
}

function formatSeconds(seconds) {
  return `${seconds.toFixed(1)}s`;
}
