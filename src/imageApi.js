const DEFAULT_MODEL = 'qwen-image-2.0';
const DEFAULT_SIZE = '1024*1024';

function normalizeSize(size) {
  const normalized = String(size || '')
    .trim()
    .replace(/x/gi, '*');

  if (!/^\d+\*\d+$/.test(normalized)) {
    throw new Error('Invalid image size');
  }

  return normalized;
}

function buildGenerationPayload(options) {
  const prompt = String(options.prompt || '').trim();

  if (!prompt) {
    throw new Error('Prompt is required');
  }

  const count = Number.parseInt(options.count, 10);
  const n = Number.isFinite(count) ? Math.min(Math.max(count, 1), 4) : 1;

  return {
    model: options.model || DEFAULT_MODEL,
    input: {
      messages: [
        {
          role: 'user',
          content: [
            {
              text: prompt,
            },
          ],
        },
      ],
    },
    parameters: {
      prompt_extend: Boolean(options.promptExtend),
      watermark: Boolean(options.watermark),
      n,
      negative_prompt: String(options.negativePrompt || ''),
      size: normalizeSize(options.size || DEFAULT_SIZE),
    },
  };
}

function extractImageUrls(responseBody) {
  const urls = [];
  const seen = new Set();

  const pushUrl = (url) => {
    if (!url || seen.has(url)) {
      return;
    }
    seen.add(url);
    urls.push(url);
  };

  for (const item of responseBody?.data || []) {
    pushUrl(item?.url);
  }

  const contents =
    responseBody?.metadata?.output?.choices?.flatMap(
      (choice) => choice?.message?.content || [],
    ) || [];

  for (const item of contents) {
    pushUrl(item?.image);
  }

  return urls;
}

module.exports = {
  buildGenerationPayload,
  extractImageUrls,
  normalizeSize,
};
