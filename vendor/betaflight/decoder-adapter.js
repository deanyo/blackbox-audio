import "./semver-lite.js";
import { ArrayDataStream } from "./datastream.js";
import { FlightLogParser } from "./flightlog_parser.js";

function findOffsets(bytes, needle) {
  const offsets = [];
  const stream = new ArrayDataStream(bytes);

  while (true) {
    const offset = stream.nextOffsetOf(needle);
    if (offset === -1) {
      break;
    }
    offsets.push(offset);
    stream.pos = offset + needle.length;
  }

  return offsets;
}

function getFrameIndexMap(frameDef) {
  const nameToIndex = frameDef?.nameToIndex ?? {};
  const motors = Array.from({ length: 8 }, (_, index) => nameToIndex[`motor[${index}]`]).filter(
    (value) => value !== undefined,
  );
  const rpms = Array.from({ length: 8 }, (_, index) =>
    nameToIndex[`eRPM[${index}]`] ??
    nameToIndex[`rpm[${index}]`] ??
    nameToIndex[`motorRPM[${index}]`],
  ).filter((value) => value !== undefined);
  const gyro = [0, 1, 2]
    .map((axis) => nameToIndex[`gyroADC[${axis}]`] ?? nameToIndex[`gyroData[${axis}]`])
    .filter((value) => value !== undefined);
  const stickAxes = [0, 1, 2]
    .map((axis) => nameToIndex[`rcCommand[${axis}]`] ?? nameToIndex[`setpoint[${axis}]`])
    .filter((value) => value !== undefined);

  return {
    motors,
    rpms,
    throttle: nameToIndex["rcCommand[3]"] ?? nameToIndex["setpoint[3]"],
    gyro,
    stickAxes,
  };
}

function parseSingleLog(bytes, startOffset, endOffset) {
  const parser = new FlightLogParser(bytes);
  parser.parseHeader(startOffset, endOffset);

  const fieldMap = getFrameIndexMap(parser.frameDefs.I);
  if (fieldMap.motors.length < 2) {
    throw new Error("log did not expose enough motor fields");
  }

  const rawFrames = [];
  parser.onFrameReady = (frameValid, frame, frameType) => {
    if (!frameValid || (frameType !== "I" && frameType !== "P")) {
      return;
    }

    const motors = fieldMap.motors.map((index) => frame[index]);
    if (motors.some((value) => !Number.isFinite(value))) {
      return;
    }

    const gyro = fieldMap.gyro.map((index) => frame[index]).filter((value) => Number.isFinite(value));
    const rpms = fieldMap.rpms.map((index) => frame[index]).filter((value) => Number.isFinite(value));
    const stickAxes = fieldMap.stickAxes
      .map((index) => frame[index])
      .filter((value) => Number.isFinite(value));

    rawFrames.push({
      time: frame[FlightLogParser.prototype.FLIGHT_LOG_FIELD_INDEX_TIME] / 1_000_000,
      motors,
      rpms,
      throttle:
        fieldMap.throttle === undefined || !Number.isFinite(frame[fieldMap.throttle])
          ? null
          : frame[fieldMap.throttle],
      gyro,
      stickAxes,
    });
  };

  parser.parseLogData(false, undefined, endOffset);

  return {
    rawFrames,
    detection: {
      hasThrottle: fieldMap.throttle !== undefined,
      hasGyro: fieldMap.gyro.length >= 3,
      hasStickAxes: fieldMap.stickAxes.length === 3,
      hasRpm: fieldMap.rpms.length >= Math.min(2, fieldMap.motors.length),
    },
  };
}

export function parseBlackboxBinaryLog(arrayBuffer, sourceName) {
  const bytes = new Uint8Array(arrayBuffer);
  const marker = FlightLogParser.prototype.FLIGHT_LOG_START_MARKER;
  const offsets = findOffsets(bytes, marker);

  if (!offsets.length) {
    throw new Error("could not find a betaflight blackbox log inside that file.");
  }

  const candidates = [];
  for (let index = 0; index < offsets.length; index += 1) {
    const startOffset = offsets[index];
    const endOffset = offsets[index + 1] ?? bytes.length;

    try {
      const candidate = parseSingleLog(bytes, startOffset, endOffset);
      if (candidate.rawFrames.length >= 4) {
        candidates.push({ ...candidate, index });
      }
    } catch (_error) {
      // Try the next embedded log section.
    }
  }

  if (!candidates.length) {
    throw new Error("the raw log was found, but no usable flight frames could be decoded.");
  }

  let defaultIndex = 0;
  let bestLength = -1;

  const flights = candidates
    .sort((left, right) => left.index - right.index)
    .map((candidate, candidateIndex) => {
      if (candidate.rawFrames.length > bestLength) {
        bestLength = candidate.rawFrames.length;
        defaultIndex = candidateIndex;
      }

      const duration =
        candidate.rawFrames.length > 1
          ? candidate.rawFrames[candidate.rawFrames.length - 1].time - candidate.rawFrames[0].time
          : 0;

      return {
        sourceName:
          offsets.length > 1
            ? `${sourceName} · log ${candidate.index + 1}/${offsets.length}`
            : sourceName,
        label:
          offsets.length > 1
            ? `log ${candidate.index + 1} · ${duration.toFixed(1)}s · ${candidate.rawFrames.length.toLocaleString()} samples`
            : `main log · ${duration.toFixed(1)}s · ${candidate.rawFrames.length.toLocaleString()} samples`,
        rawFrames: candidate.rawFrames,
        detection: candidate.detection,
      };
    });

  return {
    sourceName,
    flights,
    defaultIndex,
  };
}
