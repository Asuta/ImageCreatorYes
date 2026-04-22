const fs = require('node:fs');
const path = require('node:path');
const { normalizeMcpImageRequest } = require('./mcpImageOptions');

async function executeGenerateImageTool(input, options = {}) {
  const normalizeRequest = options.normalizeRequest || normalizeMcpImageRequest;
  const generationService = options.generationService;
  const cutoutService = options.cutoutService;
  const downloadBinary = options.downloadBinary || defaultDownloadBinary;

  if (!generationService?.generateOneImage) {
    throw new Error('generationService.generateOneImage is required');
  }

  const normalized = await normalizeRequest(input);
  const generationResult = await generationService.generateOneImage(normalized.generation);

  let finalImageUrl = generationResult.imageUrl;
  let finalBinarySource = generationResult.imageUrl;
  let cutoutModel = null;
  let cutoutApplied = false;

  if (normalized.cutout.enabled) {
    if (!cutoutService?.createCutout) {
      throw new Error('cutoutService.createCutout is required when cutout is enabled');
    }

    const cutoutResult = await cutoutService.createCutout(generationResult.imageUrl, {
      model: normalized.cutout.model,
    });
    finalImageUrl = cutoutResult.imageUrl;
    finalBinarySource = cutoutResult.localPath || cutoutResult.imageUrl;
    cutoutModel = cutoutResult.model || normalized.cutout.model;
    cutoutApplied = true;
  }

  const finalBinary = await downloadBinary(finalBinarySource);
  const imageBase64 = Buffer.from(finalBinary.bytes).toString('base64');

  return {
    imageUrl: finalImageUrl,
    mimeType: finalBinary.mimeType,
    cutoutApplied,
    cutoutModel,
    content: [
      {
        type: 'image',
        data: imageBase64,
        mimeType: finalBinary.mimeType,
      },
      {
        type: 'text',
        text: buildSummary({
          prompt: normalized.prompt,
          size: normalized.generation.size,
          imageUrl: finalImageUrl,
          cutoutApplied,
          cutoutModel,
        }),
      },
    ],
  };
}

function buildSummary(details) {
  return [
    `Prompt: ${details.prompt}`,
    `Size: ${details.size}`,
    `Cutout: ${details.cutoutApplied ? `enabled (${details.cutoutModel})` : 'disabled'}`,
    `Image URL: ${details.imageUrl}`,
  ].join('\n');
}

async function defaultDownloadBinary(urlOrPath) {
  if (/^https?:\/\//i.test(urlOrPath)) {
    const response = await fetch(urlOrPath);

    if (!response.ok) {
      throw new Error(`Failed to download image: HTTP ${response.status}`);
    }

    return {
      bytes: Buffer.from(await response.arrayBuffer()),
      mimeType: response.headers.get('content-type') || inferMimeType(urlOrPath),
    };
  }

  return {
    bytes: await fs.promises.readFile(urlOrPath),
    mimeType: inferMimeType(urlOrPath),
  };
}

function inferMimeType(filePath) {
  const extension = path.extname(filePath).toLowerCase();

  if (extension === '.png') {
    return 'image/png';
  }
  if (extension === '.jpg' || extension === '.jpeg') {
    return 'image/jpeg';
  }
  if (extension === '.webp') {
    return 'image/webp';
  }

  return 'application/octet-stream';
}

module.exports = {
  executeGenerateImageTool,
  buildSummary,
  defaultDownloadBinary,
};
