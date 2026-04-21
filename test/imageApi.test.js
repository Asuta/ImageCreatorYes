const test = require('node:test');
const assert = require('node:assert/strict');

const {
  buildGenerationPayload,
  extractImageUrls,
  normalizeSize,
} = require('../src/imageApi');

test('builds qwen image generation payload from form options', () => {
  const payload = buildGenerationPayload({
    model: 'qwen-image-2.0-pro',
    prompt: '一间有着精致窗户的花店',
    size: '1280x720',
    count: 3,
    promptExtend: true,
    watermark: false,
    negativePrompt: '低清晰度',
  });

  assert.equal(payload.model, 'qwen-image-2.0-pro');
  assert.equal(payload.input.messages[0].role, 'user');
  assert.equal(payload.input.messages[0].content[0].text, '一间有着精致窗户的花店');
  assert.deepEqual(payload.parameters, {
    prompt_extend: true,
    watermark: false,
    n: 3,
    negative_prompt: '低清晰度',
    size: '1280*720',
  });
});

test('extracts image urls from both response locations without duplicates', () => {
  const urls = extractImageUrls({
    data: [{ url: 'https://example.com/a.png' }, { url: 'https://example.com/b.png' }],
    metadata: {
      output: {
        choices: [
          {
            message: {
              content: [
                { image: 'https://example.com/b.png' },
                { image: 'https://example.com/c.png' },
              ],
            },
          },
        ],
      },
    },
  });

  assert.deepEqual(urls, [
    'https://example.com/a.png',
    'https://example.com/b.png',
    'https://example.com/c.png',
  ]);
});

test('normalizes common image size input', () => {
  assert.equal(normalizeSize('1280x720'), '1280*720');
  assert.equal(normalizeSize('1024*1024'), '1024*1024');
  assert.throws(() => normalizeSize('wide'), /Invalid image size/);
});
