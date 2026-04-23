const { normalizeMcpImageRequest } = require('./mcpImageOptions');

async function executeGenerateImageTool(input, options = {}) {
  const normalizeRequest = options.normalizeRequest || normalizeMcpImageRequest;
  const generationService = options.generationService;
  const cutoutService = options.cutoutService;

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
    finalImageUrl = cutoutResult.localPath || cutoutResult.imageUrl;
    finalBinarySource = cutoutResult.localPath || cutoutResult.imageUrl;
    cutoutModel = cutoutResult.model || normalized.cutout.model;
    cutoutApplied = true;
  }

  return {
    imageUrl: finalImageUrl,
    finalBinarySource,
    cutoutApplied,
    cutoutModel,
    content: [
      {
        type: 'text',
        text: buildSummary({
          imageUrl: finalImageUrl,
        }),
      },
    ],
  };
}

function buildSummary(details) {
  return details.imageUrl;
}

module.exports = {
  executeGenerateImageTool,
  buildSummary,
};
