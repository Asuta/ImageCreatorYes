const test = require('node:test');
const assert = require('node:assert/strict');

const { normalizeMcpImageRequest } = require('../src/mcpImageOptions');

test('maps aspect ratio and resolution to a supported size', async () => {
  const result = await normalizeMcpImageRequest({
    prompt: '测试',
    aspectRatio: '16:9',
    resolution: 'standard',
    cutout: true,
  });

  assert.equal(result.generation.size, '1280*720');
  assert.equal(result.cutout.enabled, true);
  assert.equal(result.cutout.model, 'isnet-general-use');
});

test('keeps explicit size over derived values', async () => {
  const result = await normalizeMcpImageRequest({
    prompt: '测试',
    size: '720x1280',
    aspectRatio: '1:1',
    resolution: 'high',
  });

  assert.equal(result.generation.size, '720*1280');
});

test('downloads http reference images and converts them to data urls', async () => {
  const result = await normalizeMcpImageRequest(
    {
      prompt: '测试',
      referenceImages: ['https://example.com/ref.png'],
    },
    {
      fetchImpl: async () => ({
        ok: true,
        headers: new Map([['content-type', 'image/png']]),
        arrayBuffer: async () => Buffer.from('png-bytes'),
      }),
      getHeader(response, name) {
        return response.headers.get ? response.headers.get(name) : response.headers.get(name);
      },
    },
  );

  assert.deepEqual(result.generation.referenceImages, [
    `data:image/png;base64,${Buffer.from('png-bytes').toString('base64')}`,
  ]);
});

test('rejects unsupported aspect ratio and resolution combinations', async () => {
  await assert.rejects(
    () =>
      normalizeMcpImageRequest({
        prompt: '测试',
        aspectRatio: '4:3',
        resolution: 'standard',
      }),
    /Unsupported aspect ratio\/resolution combination/,
  );
});
