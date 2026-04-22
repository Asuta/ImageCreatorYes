const DEFAULT_CUTOUT_MODEL = 'isnet-general-use';

const VERIFIED_DIRECTML_MODELS = Object.freeze([
  {
    id: 'u2net_human_seg',
    label: 'u2net_human_seg',
    description: '人像优先，适合人物主体',
    recommended: false,
  },
  {
    id: 'u2net',
    label: 'u2net',
    description: '通用抠图，主体识别比较稳',
    recommended: false,
  },
  {
    id: 'u2netp',
    label: 'u2netp',
    description: '轻量版，通常更快',
    recommended: false,
  },
  {
    id: 'isnet-general-use',
    label: 'isnet-general-use',
    description: '通用场景，边缘通常更柔和，当前默认推荐',
    recommended: true,
  },
  {
    id: 'silueta',
    label: 'silueta',
    description: '轻量轮廓风格，可试细边缘',
    recommended: false,
  },
  {
    id: 'u2net_cloth_seg',
    label: 'u2net_cloth_seg',
    description: '服饰分割模型，适合试衣物边界',
    recommended: false,
  },
  {
    id: 'birefnet-general-lite',
    label: 'birefnet-general-lite',
    description: 'BiRefNet 轻量版，可试更细抠图',
    recommended: false,
  },
]);

const SUPPORTED_MODEL_IDS = new Set(VERIFIED_DIRECTML_MODELS.map((model) => model.id));

function getCutoutModelOptions() {
  return VERIFIED_DIRECTML_MODELS.map((model) => ({ ...model }));
}

function normalizeCutoutModel(model) {
  const normalized = String(model || '').trim();

  if (!normalized) {
    return DEFAULT_CUTOUT_MODEL;
  }

  if (!SUPPORTED_MODEL_IDS.has(normalized)) {
    throw new Error(`Unsupported cutout model: ${normalized}`);
  }

  return normalized;
}

module.exports = {
  DEFAULT_CUTOUT_MODEL,
  getCutoutModelOptions,
  normalizeCutoutModel,
};
