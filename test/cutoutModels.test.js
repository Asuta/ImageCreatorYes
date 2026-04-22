const test = require('node:test');
const assert = require('node:assert/strict');

const {
  DEFAULT_CUTOUT_MODEL,
  getCutoutModelOptions,
  normalizeCutoutModel,
} = require('../src/cutoutModels');

test('exposes the verified DirectML cutout models in a stable order', () => {
  const options = getCutoutModelOptions();

  assert.deepEqual(
    options.map((option) => option.id),
    [
      'u2net_human_seg',
      'u2net',
      'u2netp',
      'isnet-general-use',
      'silueta',
      'u2net_cloth_seg',
      'birefnet-general-lite',
    ],
  );
  assert.equal(DEFAULT_CUTOUT_MODEL, 'isnet-general-use');
  assert.equal(options.find((option) => option.id === 'isnet-general-use')?.recommended, true);
});

test('normalizes an allowed cutout model', () => {
  assert.equal(normalizeCutoutModel('u2netp'), 'u2netp');
  assert.equal(normalizeCutoutModel(''), DEFAULT_CUTOUT_MODEL);
  assert.equal(normalizeCutoutModel(undefined), DEFAULT_CUTOUT_MODEL);
});

test('rejects unsupported cutout models', () => {
  assert.throws(
    () => normalizeCutoutModel('sam'),
    /Unsupported cutout model/,
  );
});
