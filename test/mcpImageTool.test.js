const test = require('node:test');
const assert = require('node:assert/strict');

const { executeGenerateImageTool } = require('../src/mcpImageTool');

test('generates one image and returns MCP-ready content without cutout', async () => {
  const result = await executeGenerateImageTool(
    {
      prompt: '测试',
    },
    {
      normalizeRequest: async () => ({
        prompt: '测试',
        generation: { prompt: '测试', size: '1024*1024' },
        cutout: { enabled: false, model: null },
      }),
      generationService: {
        generateOneImage: async () => ({
          imageUrl: 'https://example.com/a.png',
          raw: {},
        }),
      },
      downloadBinary: async () => ({
        bytes: Buffer.from('image-bytes'),
        mimeType: 'image/png',
      }),
    },
  );

  assert.equal(result.imageUrl, 'https://example.com/a.png');
  assert.equal(result.mimeType, 'image/png');
  assert.equal(result.content[0].type, 'image');
  assert.equal(result.content[1].type, 'text');
});

test('runs cutout and returns the cutout result when enabled', async () => {
  const result = await executeGenerateImageTool(
    {
      prompt: '测试',
      cutout: true,
    },
    {
      normalizeRequest: async () => ({
        prompt: '测试',
        generation: { prompt: '测试', size: '1024*1024' },
        cutout: { enabled: true, model: 'isnet-general-use' },
      }),
      generationService: {
        generateOneImage: async () => ({
          imageUrl: 'https://example.com/a.png',
          raw: {},
        }),
      },
      cutoutService: {
        createCutout: async () => ({
          imageUrl: '/generated/cutouts/a.png',
          localPath: 'D:/Project/imageCreator/generated/cutouts/a.png',
          model: 'isnet-general-use',
        }),
      },
      downloadBinary: async (urlOrPath) => {
        assert.equal(urlOrPath, 'D:/Project/imageCreator/generated/cutouts/a.png');
        return {
          bytes: Buffer.from('cutout-bytes'),
          mimeType: 'image/png',
        };
      },
    },
  );

  assert.equal(result.imageUrl, '/generated/cutouts/a.png');
  assert.equal(result.cutoutApplied, true);
  assert.equal(result.cutoutModel, 'isnet-general-use');
});
