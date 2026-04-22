const { normalizeSize } = require('./imageApi');
const { normalizeCutoutModel } = require('./cutoutModels');

const SIZE_BY_ASPECT_RATIO = {
  '1:1': '1024*1024',
  '16:9': '1280*720',
  '9:16': '720*1280',
};

async function normalizeMcpImageRequest(input, options = {}) {
  const prompt = String(input.prompt || '').trim();

  if (!prompt) {
    throw new Error('prompt is required');
  }

  const size = resolveRequestedSize(input);
  const referenceImages = await normalizeReferenceImages(input.referenceImages, options);
  const cutoutEnabled = Boolean(input.cutout);

  return {
    prompt,
    generation: {
      model: input.model,
      prompt,
      negativePrompt: String(input.negativePrompt || ''),
      promptExtend: input.promptExtend !== false,
      watermark: Boolean(input.watermark),
      size,
      referenceImages,
    },
    cutout: {
      enabled: cutoutEnabled,
      model: cutoutEnabled ? normalizeCutoutModel(input.cutoutModel) : null,
    },
  };
}

function resolveRequestedSize(input) {
  if (input.size) {
    return normalizeSize(input.size);
  }

  const aspectRatio = String(input.aspectRatio || '1:1').trim();
  const resolution = String(input.resolution || 'standard').trim().toLowerCase();

  if (!['standard', 'high'].includes(resolution)) {
    throw new Error('resolution must be one of: standard, high');
  }

  const mappedSize = SIZE_BY_ASPECT_RATIO[aspectRatio];

  if (!mappedSize) {
    throw new Error('Unsupported aspect ratio/resolution combination');
  }

  return mappedSize;
}

async function normalizeReferenceImages(referenceImages, options) {
  if (!Array.isArray(referenceImages) || referenceImages.length === 0) {
    return [];
  }

  if (referenceImages.length > 3) {
    throw new Error('You can upload at most 3 reference images');
  }

  const fetchImpl = options.fetchImpl || fetch;
  const getHeader =
    options.getHeader ||
    ((response, name) => {
      if (response.headers?.get) {
        return response.headers.get(name);
      }

      return response.headers?.[name] || null;
    });

  return Promise.all(
    referenceImages.map(async (image) => {
      const value = String(image || '').trim();

      if (!value) {
        throw new Error('Invalid reference image');
      }

      if (value.startsWith('data:image/')) {
        return value;
      }

      const parsed = new URL(value);

      if (!['http:', 'https:'].includes(parsed.protocol)) {
        throw new Error('Invalid reference image');
      }

      const response = await fetchImpl(parsed.toString());

      if (!response.ok) {
        throw new Error(`Failed to download reference image: HTTP ${response.status}`);
      }

      const contentType = getHeader(response, 'content-type') || 'image/png';
      const bytes = Buffer.from(await response.arrayBuffer());
      return `data:${contentType};base64,${bytes.toString('base64')}`;
    }),
  );
}

module.exports = {
  normalizeMcpImageRequest,
  resolveRequestedSize,
  normalizeReferenceImages,
};
