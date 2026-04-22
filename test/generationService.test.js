const test = require('node:test');
const assert = require('node:assert/strict');

const { createGenerationService } = require('../src/generationService');

test('generates exactly one image and returns the first url', async () => {
  let receivedBody = null;
  const service = createGenerationService({
    apiKey: 'test-key',
    apiBaseUrl: 'https://example.com/images',
    fetchImpl: async (url, options) => {
      assert.equal(url, 'https://example.com/images');
      assert.equal(options.method, 'POST');
      assert.equal(options.headers.Authorization, 'Bearer test-key');
      receivedBody = JSON.parse(options.body);
      return {
        ok: true,
        text: async () =>
          JSON.stringify({
            data: [
              { url: 'https://example.com/a.png' },
              { url: 'https://example.com/b.png' },
            ],
          }),
      };
    },
  });

  const result = await service.generateOneImage({
    model: 'qwen-image-2.0',
    prompt: '测试',
    count: 4,
    size: '1024*1024',
  });

  assert.equal(receivedBody.parameters.n, 1);
  assert.deepEqual(result, {
    imageUrl: 'https://example.com/a.png',
    imageUrls: ['https://example.com/a.png', 'https://example.com/b.png'],
    raw: {
      data: [
        { url: 'https://example.com/a.png' },
        { url: 'https://example.com/b.png' },
      ],
    },
  });
});

test('throws when the upstream response contains no image url', async () => {
  const service = createGenerationService({
    apiKey: 'test-key',
    apiBaseUrl: 'https://example.com/images',
    fetchImpl: async () => ({
      ok: true,
      text: async () => JSON.stringify({ data: [] }),
    }),
  });

  await assert.rejects(
    () =>
      service.generateOneImage({
        prompt: '测试',
      }),
    /did not return any image urls/i,
  );
});

test('generateImages preserves the requested count for the web app flow', async () => {
  let receivedBody = null;
  const service = createGenerationService({
    apiKey: 'test-key',
    apiBaseUrl: 'https://example.com/images',
    fetchImpl: async (_url, options) => {
      receivedBody = JSON.parse(options.body);
      return {
        ok: true,
        text: async () =>
          JSON.stringify({
            data: [{ url: 'https://example.com/a.png' }],
          }),
      };
    },
  });

  await service.generateImages({
    prompt: '测试',
    count: 3,
  });

  assert.equal(receivedBody.parameters.n, 3);
});
