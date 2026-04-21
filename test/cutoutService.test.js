const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const {
  buildCutoutPaths,
  createCutoutService,
  validateCutoutConfig,
} = require('../src/cutoutService');

test('requires a configured background remover path', () => {
  assert.throws(
    () => validateCutoutConfig({ removerPath: '' }),
    /BRAINDEAD_BG_REMOVER_PATH/,
  );
});

test('builds predictable input and output paths', () => {
  const paths = buildCutoutPaths({
    workDir: 'D:/Project/imageCreator/tmp/cutout',
    outputDir: 'D:/Project/imageCreator/generated/cutouts',
    sourceName: 'flower shop.png',
    id: 'abc123',
  });

  assert.equal(paths.inputPath, path.normalize('D:/Project/imageCreator/tmp/cutout/abc123.png'));
  assert.equal(
    paths.expectedToolOutputPath,
    path.normalize('D:/Project/imageCreator/tmp/cutout/abc123_nobg.png'),
  );
  assert.equal(
    paths.finalOutputPath,
    path.normalize('D:/Project/imageCreator/generated/cutouts/abc123.png'),
  );
  assert.equal(paths.publicUrl, '/generated/cutouts/abc123.png');
});

test('runs a configured command and returns a public cutout url', async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'cutout-service-'));
  const workDir = path.join(root, 'work');
  const outputDir = path.join(root, 'generated', 'cutouts');
  const inputBytes = Buffer.from('fake image');
  const executable = process.execPath;

  const service = createCutoutService({
    removerPath: executable,
    workDir,
    outputDir,
    runProcess(command, args) {
      assert.equal(command, executable);
      assert.equal(args.length, 1);
      const inputPath = args[0];
      const parsed = path.parse(inputPath);
      const outputPath = path.join(parsed.dir, `${parsed.name}_nobg.png`);
      fs.writeFileSync(outputPath, Buffer.from('fake png'));
      return Promise.resolve({ stdout: '', stderr: '' });
    },
    downloadImage() {
      return Promise.resolve(inputBytes);
    },
    idFactory() {
      return 'cutout-test';
    },
  });

  const result = await service.createCutout('https://example.com/source.png');

  assert.deepEqual(result, {
    imageUrl: '/generated/cutouts/cutout-test.png',
  });
  assert.equal(
    fs.readFileSync(path.join(outputDir, 'cutout-test.png'), 'utf8'),
    'fake png',
  );
});
