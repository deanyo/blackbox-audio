export function hexToFloat(string) {
  const arr = new Uint32Array(1);
  arr[0] = parseInt(string, 16);
  return new Float32Array(arr.buffer)[0];
}

export function uint32ToFloat(value) {
  const arr = new Uint32Array(1);
  arr[0] = value;
  return new Float32Array(arr.buffer)[0];
}

export function asciiArrayToString(arr) {
  return String.fromCharCode.apply(null, arr);
}

export function asciiStringToByteArray(string) {
  const bytes = [];

  for (let index = 0; index < string.length; index += 1) {
    bytes.push(string.charCodeAt(index));
  }

  return bytes;
}

export function signExtend24Bit(value) {
  return value & 0x800000 ? value | 0xff000000 : value;
}

export function signExtend16Bit(value) {
  return value & 0x8000 ? value | 0xffff0000 : value;
}

export function signExtend14Bit(value) {
  return value & 0x2000 ? value | 0xffffc000 : value;
}

export function signExtend8Bit(value) {
  return value & 0x80 ? value | 0xffffff00 : value;
}

export function signExtend7Bit(value) {
  return value & 0x40 ? value | 0xffffff80 : value;
}

export function signExtend6Bit(value) {
  return value & 0x20 ? value | 0xffffffc0 : value;
}

export function signExtend5Bit(value) {
  return value & 0x10 ? value | 0xffffffe0 : value;
}

export function signExtend4Bit(value) {
  return value & 0x08 ? value | 0xfffffff0 : value;
}

export function signExtend2Bit(value) {
  return value & 0x02 ? value | 0xfffffffc : value;
}

export function stringHasComma(string) {
  return string.match(/.*,.*/) != null;
}

export function parseCommaSeparatedString(string, length) {
  const parts = string.split(",");
  const targetLength = length || parts.length;

  if (targetLength < 2) {
    const value = parts.indexOf(".") ? parseFloat(parts) : parseInt(parts, 10);
    return Number.isNaN(value) ? string : value;
  }

  const result = new Array(targetLength);
  for (let index = 0; index < targetLength; index += 1) {
    if (index < parts.length) {
      const value = parts[index].indexOf(".")
        ? parseFloat(parts[index])
        : parseInt(parts[index], 10);
      result[index] = Number.isNaN(value) ? parts[index] : value;
    } else {
      result[index] = null;
    }
  }

  return result;
}
