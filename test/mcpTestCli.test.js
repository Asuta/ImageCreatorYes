const test = require('node:test');
const assert = require('node:assert/strict');

const {
  buildMcpTestRequest,
  parseMcpTestArgs,
  resolveOutputPath,
} = require('../src/mcpTestCli');

test('buildMcpTestRequest keeps a Chinese prompt and normalizes options', () => {
  const request = buildMcpTestRequest({
    prompt: '一只可爱的小狗，正面看镜头，干净背景',
    model: 'qwen-image-2.0',
    aspectRatio: '1:1',
    resolution: 'standard',
    cutout: true,
    cutoutModel: 'isnet-general-use',
  });

  assert.deepEqual(request, {
    prompt: '一只可爱的小狗，正面看镜头，干净背景',
    model: 'qwen-image-2.0',
    aspectRatio: '1:1',
    resolution: 'standard',
    cutout: true,
    cutoutModel: 'isnet-general-use',
  });
});

test('resolveOutputPath uses png extension by default', () => {
  const outputPath = resolveOutputPath('D:/Project/imageCreator', 'puppy');
  assert.match(outputPath, /generated[\\/]mcp-test-puppy\.png$/i);
});

test('parseMcpTestArgs only keeps the prompt-file chain', () => {
  const args = parseMcpTestArgs([
    '--prompt-file',
    '.\\prompts\\puppy-zh.txt',
    '--output',
    'puppy-zh',
    '--cutout',
  ]);

  assert.deepEqual(args, {
    cutout: true,
    positional: [],
    promptFile: '.\\prompts\\puppy-zh.txt',
    output: 'puppy-zh',
  });
});

test('parseMcpTestArgs accepts npm-style positional fallback for prompt file and output', () => {
  const args = parseMcpTestArgs(['.\\prompts\\puppy-zh.txt', 'puppy-zh']);

  assert.equal(args.promptFile, '.\\prompts\\puppy-zh.txt');
  assert.equal(args.output, 'puppy-zh');
});
