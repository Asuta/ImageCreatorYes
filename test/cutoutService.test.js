const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const {
  buildProcessInvocation,
  buildCutoutPaths,
  createCutoutService,
  validateCutoutConfig,
} = require('../src/cutoutService');
const { DEFAULT_CUTOUT_MODEL } = require('../src/cutoutModels');

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
      assert.equal(args.length, 2);
      const inputPath = args[0];
      assert.equal(args[1], DEFAULT_CUTOUT_MODEL);
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
    model: DEFAULT_CUTOUT_MODEL,
  });
  assert.equal(
    fs.readFileSync(path.join(outputDir, 'cutout-test.png'), 'utf8'),
    'fake png',
  );
});

test('passes through a user-selected cutout model after validation', async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'cutout-service-model-'));
  const workDir = path.join(root, 'work');
  const outputDir = path.join(root, 'generated', 'cutouts');
  const executable = process.execPath;
  let receivedArgs = [];

  const service = createCutoutService({
    removerPath: executable,
    workDir,
    outputDir,
    runProcess(command, args) {
      assert.equal(command, executable);
      receivedArgs = args;
      const parsed = path.parse(args[0]);
      fs.writeFileSync(path.join(parsed.dir, `${parsed.name}_nobg.png`), Buffer.from('fake png'));
      return Promise.resolve({ stdout: '', stderr: '' });
    },
    downloadImage() {
      return Promise.resolve(Buffer.from('fake image'));
    },
    idFactory() {
      return 'custom-model';
    },
  });

  await service.createCutout('https://example.com/source.png', {
    model: 'u2netp',
  });

  assert.deepEqual(receivedArgs, [path.join(workDir, 'custom-model.png'), 'u2netp']);
});

test('rejects unsupported user-selected cutout models', async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'cutout-service-invalid-model-'));
  const service = createCutoutService({
    removerPath: process.execPath,
    workDir: path.join(root, 'work'),
    outputDir: path.join(root, 'generated', 'cutouts'),
    downloadImage() {
      return Promise.resolve(Buffer.from('fake image'));
    },
    runProcess() {
      throw new Error('should not run');
    },
  });

  await assert.rejects(
    () =>
      service.createCutout('https://example.com/source.png', {
        model: 'sam',
      }),
    /Unsupported cutout model/,
  );
});

test('validateCutoutConfig accepts an existing cmd wrapper path', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'cutout-wrapper-'));
  const wrapperPath = path.join(root, 'braindead-cutout.cmd');
  fs.writeFileSync(wrapperPath, '@echo off');

  assert.doesNotThrow(() =>
    validateCutoutConfig({ removerPath: wrapperPath }),
  );
});

test('wraps cmd scripts with cmd.exe on windows', () => {
  const invocation = buildProcessInvocation('D:\\Project\\imageCreator\\tools\\braindead-cutout.cmd', [
    'D:\\temp\\input.png',
  ]);

  assert.equal(invocation.command.toLowerCase(), 'cmd.exe');
  assert.deepEqual(invocation.args, [
    '/c',
    'D:\\Project\\imageCreator\\tools\\braindead-cutout.cmd',
    'D:\\temp\\input.png',
  ]);
});
