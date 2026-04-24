const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const {
  cleanupTempImageCache,
  createTempImageCache,
} = require('../src/tempImageCache');

test('cleanup removes only expired files', async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'image-cache-expired-'));
  const oldFile = path.join(root, 'cutouts', 'old.png');
  const freshFile = path.join(root, 'cutouts', 'fresh.png');
  const now = Date.UTC(2026, 3, 24, 12, 0, 0);

  fs.mkdirSync(path.dirname(oldFile), { recursive: true });
  fs.writeFileSync(oldFile, 'old');
  fs.writeFileSync(freshFile, 'fresh');
  fs.utimesSync(oldFile, new Date(now - 25 * 60 * 60 * 1000), new Date(now - 25 * 60 * 60 * 1000));
  fs.utimesSync(freshFile, new Date(now - 60 * 60 * 1000), new Date(now - 60 * 60 * 1000));

  const result = await cleanupTempImageCache({
    cacheDir: root,
    ttlMs: 24 * 60 * 60 * 1000,
    maxBytes: 1024 * 1024,
    now: () => now,
  });

  assert.deepEqual(result.deleted, [oldFile]);
  assert.equal(fs.existsSync(oldFile), false);
  assert.equal(fs.existsSync(freshFile), true);
});

test('cleanup trims oldest files when cache exceeds max bytes', async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'image-cache-size-'));
  const firstFile = path.join(root, 'cutouts', 'first.png');
  const secondFile = path.join(root, 'cutouts', 'second.png');
  const now = Date.UTC(2026, 3, 24, 12, 0, 0);

  fs.mkdirSync(path.dirname(firstFile), { recursive: true });
  fs.writeFileSync(firstFile, '12345');
  fs.writeFileSync(secondFile, '67890');
  fs.utimesSync(firstFile, new Date(now - 2 * 60 * 1000), new Date(now - 2 * 60 * 1000));
  fs.utimesSync(secondFile, new Date(now - 60 * 1000), new Date(now - 60 * 1000));

  const result = await cleanupTempImageCache({
    cacheDir: root,
    ttlMs: 24 * 60 * 60 * 1000,
    maxBytes: 5,
    now: () => now,
  });

  assert.deepEqual(result.deleted, [firstFile]);
  assert.equal(fs.existsSync(firstFile), false);
  assert.equal(fs.existsSync(secondFile), true);
});

test('cache skips repeated cleanup until interval has elapsed', async () => {
  let currentTime = 1000;
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'image-cache-interval-'));
  const cache = createTempImageCache({
    cacheDir: root,
    ttlMs: 24 * 60 * 60 * 1000,
    cleanupIntervalMs: 10 * 60 * 1000,
    now: () => currentTime,
  });

  await cache.cleanup({ force: true });
  currentTime += 9 * 60 * 1000;
  assert.deepEqual(await cache.cleanupIfDue(), { skipped: true, deleted: [] });

  currentTime += 60 * 1000;
  assert.equal((await cache.cleanupIfDue()).skipped, false);
});
