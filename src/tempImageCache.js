const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const DEFAULT_CACHE_DIR_NAME = 'imageCreator-mcp';
const DEFAULT_TTL_HOURS = 24;
const DEFAULT_CLEANUP_INTERVAL_MINUTES = 10;
const DEFAULT_MAX_MB = 1024;

function createTempImageCache(options = {}) {
  const cacheDir = options.cacheDir || getDefaultCacheDir();
  const ttlMs = normalizePositiveNumber(
    options.ttlMs,
    hoursToMs(normalizePositiveNumber(options.ttlHours, DEFAULT_TTL_HOURS)),
  );
  const cleanupIntervalMs = normalizePositiveNumber(
    options.cleanupIntervalMs,
    minutesToMs(
      normalizePositiveNumber(options.cleanupIntervalMinutes, DEFAULT_CLEANUP_INTERVAL_MINUTES),
    ),
  );
  const maxBytes = normalizePositiveNumber(
    options.maxBytes,
    mbToBytes(normalizePositiveNumber(options.maxMb, DEFAULT_MAX_MB)),
  );
  const now = options.now || (() => Date.now());
  let lastCleanupAt = 0;

  return {
    cacheDir,
    getWorkDir() {
      return path.join(cacheDir, 'work');
    },
    getOutputDir() {
      return path.join(cacheDir, 'cutouts');
    },
    async cleanup(options = {}) {
      lastCleanupAt = now();
      return cleanupTempImageCache({
        cacheDir,
        ttlMs,
        maxBytes,
        now,
        force: options.force,
      });
    },
    async cleanupIfDue() {
      if (now() - lastCleanupAt < cleanupIntervalMs) {
        return { skipped: true, deleted: [] };
      }

      return this.cleanup();
    },
  };
}

async function cleanupTempImageCache(options) {
  const cacheDir = options.cacheDir;
  const ttlMs = normalizePositiveNumber(options.ttlMs, hoursToMs(DEFAULT_TTL_HOURS));
  const maxBytes = normalizePositiveNumber(options.maxBytes, mbToBytes(DEFAULT_MAX_MB));
  const now = options.now || (() => Date.now());
  const deleted = [];

  if (!cacheDir || !fs.existsSync(cacheDir)) {
    return { skipped: false, deleted };
  }

  const entries = await collectCacheEntries(cacheDir);
  const expiredBefore = now() - ttlMs;
  const keptEntries = [];

  for (const entry of entries) {
    if (entry.mtimeMs <= expiredBefore) {
      await removeEntry(entry.path, deleted);
    } else {
      keptEntries.push(entry);
    }
  }

  let totalBytes = keptEntries.reduce((total, entry) => total + entry.size, 0);
  const oldestFirst = keptEntries.sort((first, second) => first.mtimeMs - second.mtimeMs);

  for (const entry of oldestFirst) {
    if (totalBytes <= maxBytes) {
      break;
    }

    await removeEntry(entry.path, deleted);
    totalBytes -= entry.size;
  }

  return { skipped: false, deleted };
}

async function collectCacheEntries(cacheDir) {
  const entries = await collectFileEntries(cacheDir);

  return entries;
}

async function collectFileEntries(dirPath) {
  const dirents = await fs.promises.readdir(dirPath, { withFileTypes: true });
  const entries = [];

  for (const dirent of dirents) {
    const entryPath = path.join(dirPath, dirent.name);

    if (dirent.isDirectory()) {
      entries.push(...(await collectFileEntries(entryPath)));
      continue;
    }

    if (dirent.isFile()) {
      const stat = await fs.promises.stat(entryPath);
      entries.push({
        path: entryPath,
        mtimeMs: stat.mtimeMs,
        size: stat.size,
      });
    }
  }

  return entries;
}

async function removeEntry(entryPath, deleted) {
  await fs.promises.rm(entryPath, { recursive: true, force: true });
  deleted.push(entryPath);
}

function getDefaultCacheDir() {
  return path.join(os.tmpdir(), DEFAULT_CACHE_DIR_NAME);
}

function normalizePositiveNumber(value, fallback) {
  const parsed = Number(value);

  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }

  return parsed;
}

function hoursToMs(hours) {
  return hours * 60 * 60 * 1000;
}

function minutesToMs(minutes) {
  return minutes * 60 * 1000;
}

function mbToBytes(mb) {
  return mb * 1024 * 1024;
}

module.exports = {
  DEFAULT_CLEANUP_INTERVAL_MINUTES,
  DEFAULT_MAX_MB,
  DEFAULT_TTL_HOURS,
  cleanupTempImageCache,
  createTempImageCache,
  getDefaultCacheDir,
};
