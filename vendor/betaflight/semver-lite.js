function parseVersion(version) {
  return `${version ?? ""}`
    .split(".")
    .map((part) => {
      const match = `${part}`.match(/\d+/);
      return match ? Number(match[0]) : 0;
    });
}

function compareVersions(left, right) {
  const a = parseVersion(left);
  const b = parseVersion(right);
  const length = Math.max(a.length, b.length);

  for (let index = 0; index < length; index += 1) {
    const aPart = a[index] ?? 0;
    const bPart = b[index] ?? 0;

    if (aPart > bPart) {
      return 1;
    }
    if (aPart < bPart) {
      return -1;
    }
  }

  return 0;
}

globalThis.semver = globalThis.semver || {
  gte(left, right) {
    return compareVersions(left, right) >= 0;
  },
  lte(left, right) {
    return compareVersions(left, right) <= 0;
  },
  lt(left, right) {
    return compareVersions(left, right) < 0;
  },
};
