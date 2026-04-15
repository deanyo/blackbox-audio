const SAMPLE_RATE = 24000;
const MAX_ANALYSIS_RATE = 600;
const FADE_TIME_SECONDS = 0.02;
const MODE_DESCRIPTIONS = {
  realistic:
    "realistic tinywhoop favors buzzy harmonics, lift-dependent wind, and subtle frame chatter.",
  cinematic:
    "cinematic chase leans heavier, smoother, and more dramatic, with extra sub body and reduced hiss.",
  space:
    "space ship exaggerates modulation and resonance for a stylized sci-fi pass while still following the flight log.",
};

const MODE_PRESETS = {
  realistic: {
    basePitch: 115,
    pitchRange: 290,
    gyroPitch: 90,
    spreadPitch: 120,
    harmonic2: 0.42,
    harmonic3: 0.18,
    motorGain: 0.46,
    windGain: 0.22,
    resonanceGain: 0.11,
    transientGain: 0.055,
    subGain: 0,
    spaceGain: 0,
  },
  cinematic: {
    basePitch: 90,
    pitchRange: 235,
    gyroPitch: 55,
    spreadPitch: 85,
    harmonic2: 0.5,
    harmonic3: 0.24,
    motorGain: 0.42,
    windGain: 0.16,
    resonanceGain: 0.16,
    transientGain: 0.04,
    subGain: 0.1,
    spaceGain: 0,
  },
  space: {
    basePitch: 125,
    pitchRange: 320,
    gyroPitch: 120,
    spreadPitch: 165,
    harmonic2: 0.58,
    harmonic3: 0.28,
    motorGain: 0.4,
    windGain: 0.11,
    resonanceGain: 0.09,
    transientGain: 0.05,
    subGain: 0.03,
    spaceGain: 0.18,
  },
};

const PAN_POSITIONS = [-0.65, 0.65, 0.38, -0.38, 0.22, -0.22, 0.12, -0.12];

const elements = {
  csvFile: document.getElementById("csvFile"),
  videoFile: document.getElementById("videoFile"),
  loadDemo: document.getElementById("loadDemo"),
  clearLog: document.getElementById("clearLog"),
  soundMode: document.getElementById("soundMode"),
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
  downloadLink: document.getElementById("downloadLink"),
  statusStrip: document.getElementById("statusStrip"),
  inputSummary: document.getElementById("inputSummary"),
  fieldSummary: document.getElementById("fieldSummary"),
  renderSummary: document.getElementById("renderSummary"),
  modeDescription: document.getElementById("modeDescription"),
};

const state = {
  log: null,
  render: null,
  audioUrl: null,
  videoUrl: null,
  syncRaf: null,
};

elements.modeDescription.textContent = MODE_DESCRIPTIONS[elements.soundMode.value];

elements.soundMode.addEventListener("change", () => {
  elements.modeDescription.textContent = MODE_DESCRIPTIONS[elements.soundMode.value];
});

elements.csvFile.addEventListener("change", async (event) => {
  const [file] = event.target.files;
  if (!file) {
    return;
  }

  try {
    setStatus(`parsing ${file.name}...`);
    const text = await file.text();
    loadLog(parseBlackboxCsv(text, file.name));
    setStatus(`loaded ${file.name}. ready to render audio.`);
  } catch (error) {
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
    loadLog(parseBlackboxCsv(buildDemoCsv(), "demo-flight.csv"));
    setStatus("demo flight loaded. render a clip to audition the synth.");
  } catch (error) {
    setStatus(error.message);
  }
});

elements.clearLog.addEventListener("click", () => {
  clearRender();
  state.log = null;
  elements.csvFile.value = "";
  elements.inputSummary.textContent = "No log loaded";
  elements.fieldSummary.textContent = "awaiting csv";
  elements.renderSummary.textContent = "not rendered";
  elements.clipStart.value = "0";
  elements.clipDuration.value = "12";
  setStatus("cleared log data.");
});

elements.renderButton.addEventListener("click", async () => {
  if (!state.log) {
    setStatus("load a blackbox csv or the demo flight first.");
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

function loadLog(log) {
  clearRender();
  state.log = log;
  elements.inputSummary.textContent = `${log.sourceName} · ${formatSeconds(log.duration)} · ${log.frames.length.toLocaleString()} samples`;
  elements.fieldSummary.textContent = [
    `${log.motorCount} motors`,
    log.fieldSummary.throttle,
    log.fieldSummary.gyro,
  ].join(" · ");
  elements.renderSummary.textContent = "not rendered";
  elements.clipStart.value = "0";
  elements.clipDuration.value = Math.min(15, log.duration).toFixed(1);
}

function clearVideo() {
  if (state.videoUrl) {
    URL.revokeObjectURL(state.videoUrl);
    state.videoUrl = null;
  }
  elements.videoPreview.pause();
  elements.videoPreview.removeAttribute("src");
  elements.videoPreview.load();
}

function clearRender() {
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
  elements.audioPlayer.pause();
  elements.audioPlayer.currentTime = 0;
  elements.videoPreview.pause();
  if (elements.videoPreview.src) {
    elements.videoPreview.currentTime = clampNumber(Number(elements.videoStart.value), 0, 1e9);
  }
}

function startSyncLoop() {
  stopSyncLoop();

  const sync = () => {
    if (elements.audioPlayer.paused || elements.videoPreview.paused) {
      state.syncRaf = null;
      return;
    }

    const targetAudioTime =
      elements.videoPreview.currentTime - clampNumber(Number(elements.videoStart.value), 0, 1e9);
    const drift = targetAudioTime - elements.audioPlayer.currentTime;

    if (targetAudioTime >= 0 && Math.abs(drift) > 0.08) {
      elements.audioPlayer.currentTime = clampNumber(
        targetAudioTime,
        0,
        Math.max(0, elements.audioPlayer.duration || targetAudioTime),
      );
    }

    if (targetAudioTime >= (elements.audioPlayer.duration || Number.MAX_SAFE_INTEGER)) {
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

function setStatus(message) {
  elements.statusStrip.textContent = message;
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
  let motorMin = Number.POSITIVE_INFINITY;
  let motorMax = Number.NEGATIVE_INFINITY;
  let throttleMin = Number.POSITIVE_INFINITY;
  let throttleMax = Number.NEGATIVE_INFINITY;

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

    for (const motor of motors) {
      motorMin = Math.min(motorMin, motor);
      motorMax = Math.max(motorMax, motor);
    }

    if (throttle !== null) {
      throttleMin = Math.min(throttleMin, throttle);
      throttleMax = Math.max(throttleMax, throttle);
    }

    rawFrames.push({ time, motors, throttle, gyro: usableGyro });
  }

  if (rawFrames.length < 4) {
    throw new Error("CSV parsed, but there were not enough numeric flight samples.");
  }

  rawFrames.sort((left, right) => left.time - right.time);
  const reducedFrames = reduceFrameRate(removeDuplicateTimes(rawFrames));
  const safeMotorMin = Number.isFinite(motorMin) ? motorMin : 1000;
  const safeMotorRange = Math.max(1, motorMax - safeMotorMin);
  const hasThrottle = mapping.throttleIndex !== -1 && Number.isFinite(throttleMax);
  const safeThrottleMin = hasThrottle ? throttleMin : 1000;
  const safeThrottleRange = hasThrottle ? Math.max(1, throttleMax - safeThrottleMin) : 1;

  const frames = reducedFrames.map((frame) => {
    const motorNorms = frame.motors.map((motor) =>
      clampNumber((motor - safeMotorMin) / safeMotorRange, 0, 1),
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

    return {
      time: frame.time - reducedFrames[0].time,
      motors: motorNorms,
      avgMotor,
      throttle: throttleNorm,
      gyro: gyroNorm,
    };
  });

  const duration = Math.max(0.1, frames[frames.length - 1].time);

  return {
    sourceName,
    frames,
    duration,
    motorCount: frames[0].motors.length,
    fieldSummary: {
      throttle: hasThrottle ? "Throttle detected" : "Throttle derived from motor average",
      gyro: mapping.gyroIndices.length >= 3 ? "Gyro detected" : "Gyro missing",
    },
  };
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

  return {
    timeIndex,
    throttleIndex,
    motorIndices,
    gyroIndices,
  };
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

function synthesizeClip(log, options) {
  const preset = MODE_PRESETS[options.mode];
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
  let windState = 0;
  let hissState = 0;
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

    for (let motorIndex = 0; motorIndex < motorCount; motorIndex += 1) {
      const value = lerp(current.motors[motorIndex], next.motors[motorIndex], mixAmount);
      motors[motorIndex] = value;
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
    windState = windState * 0.964 + white * 0.036;
    hissState = hissState * 0.7 + white * 0.3;

    let leftMotorMix = 0;
    let rightMotorMix = 0;

    for (let motorIndex = 0; motorIndex < motorCount; motorIndex += 1) {
      const motor = motors[motorIndex];
      const frequency =
        preset.basePitch +
        motor * preset.pitchRange +
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
    const transient = hissState * dynamic * preset.transientGain;
    const sub = Math.sin(subPhase) * avgMotor * preset.subGain;
    const resonance = Math.sin(resonancePhase) * resonanceAmount;
    const wind = (white - windState) * windAmount + windState * windAmount * 0.35;

    let leftSample = leftMotorMix * preset.motorGain + wind + transient + resonance + sub;
    let rightSample =
      rightMotorMix * preset.motorGain + wind - transient * 0.3 + resonance + sub;

    const fade = computeFade(sampleIndex, totalSamples, FADE_TIME_SECONDS * SAMPLE_RATE);
    left[sampleIndex] = softClip(leftSample * 1.32) * fade;
    right[sampleIndex] = softClip(rightSample * 1.32) * fade;
  }

  const blob = encodeWavBlob([left, right], SAMPLE_RATE);
  return {
    blob,
    duration: clipDuration,
    sampleRate: SAMPLE_RATE,
    modeLabel: elements.soundMode.selectedOptions[0].textContent,
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
    "time (us),motor[0],motor[1],motor[2],motor[3],rcCommand[3],gyroADC[0],gyroADC[1],gyroADC[2]",
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

    const gyroX = Math.sin(time * 2.7) * 180 + Math.sin(time * 13.2) * 28;
    const gyroY = Math.sin(time * 1.8 + 1.1) * 220 + Math.sin(time * 10.8) * 22;
    const gyroZ = Math.sin(time * 3.3 + 2.6) * 140 + Math.sin(time * 15.7) * 18;

    lines.push(
      [
        Math.round(time * 1_000_000),
        ...motors.map((motor) => Math.round(1000 + motor * 900)),
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
