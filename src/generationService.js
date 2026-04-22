const { buildGenerationPayload, extractImageUrls } = require('./imageApi');

function createGenerationService(options) {
  const serviceOptions = {
    apiKey: options.apiKey,
    apiBaseUrl: options.apiBaseUrl || 'https://token.fun.tv/v1/images/generations',
    fetchImpl: options.fetchImpl || fetch,
  };

  return {
    async generateImages(requestOptions) {
      return generateImagesWithOptions(serviceOptions, requestOptions);
    },
    async generateOneImage(requestOptions) {
      return generateImagesWithOptions(serviceOptions, {
        ...requestOptions,
        count: 1,
      });
    },
  };
}

async function generateImagesWithOptions(serviceOptions, requestOptions) {
  if (!serviceOptions.apiKey) {
    throw new Error('Missing IMAGE_API_KEY in .env');
  }

  const payload = buildGenerationPayload(requestOptions);

  const upstreamResponse = await serviceOptions.fetchImpl(serviceOptions.apiBaseUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${serviceOptions.apiKey}`,
    },
    body: JSON.stringify(payload),
  });

  const upstreamText = await upstreamResponse.text();
  const upstreamJson = upstreamText ? JSON.parse(upstreamText) : {};

  if (!upstreamResponse.ok) {
    throw new Error(
      upstreamJson?.error?.message || upstreamJson?.message || 'Image generation failed',
    );
  }

  const imageUrls = extractImageUrls(upstreamJson);

  if (!imageUrls.length) {
    throw new Error('Image generation did not return any image urls');
  }

  return {
    imageUrl: imageUrls[0],
    imageUrls,
    raw: upstreamJson,
  };
}

module.exports = {
  createGenerationService,
};
