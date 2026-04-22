const path = require('node:path');

function buildMcpTestRequest(options) {
  return {
    prompt: String(options.prompt || '').trim(),
    model: options.model || 'qwen-image-2.0',
    aspectRatio: options.aspectRatio || '1:1',
    resolution: options.resolution || 'standard',
    cutout: Boolean(options.cutout),
    ...(options.cutout ? { cutoutModel: options.cutoutModel || 'isnet-general-use' } : {}),
  };
}

function parseMcpTestArgs(argv) {
  const parsed = {
    cutout: false,
    positional: [],
  };

  for (let index = 0; index < argv.length; index += 1) {
    const current = argv[index];

    if (!current.startsWith('-')) {
      parsed.positional.push(current);
      continue;
    }

    if (current === '--help' || current === '-h') {
      parsed.help = true;
      continue;
    }

    if (current === '--cutout') {
      parsed.cutout = true;
      continue;
    }

    const next = argv[index + 1];
    if (next == null) {
      continue;
    }

    if (current === '--prompt-file') {
      parsed.promptFile = next;
      index += 1;
      continue;
    }
    if (current === '--output') {
      parsed.output = next;
      index += 1;
      continue;
    }
    if (current === '--model') {
      parsed.model = next;
      index += 1;
      continue;
    }
    if (current === '--aspect-ratio') {
      parsed.aspectRatio = next;
      index += 1;
      continue;
    }
    if (current === '--resolution') {
      parsed.resolution = next;
      index += 1;
      continue;
    }
    if (current === '--cutout-model') {
      parsed.cutoutModel = next;
      index += 1;
    }
  }

  if (!parsed.promptFile && parsed.positional[0]) {
    parsed.promptFile = parsed.positional[0];
  }

  if (!parsed.output && parsed.positional[1]) {
    parsed.output = parsed.positional[1];
  }

  return parsed;
}

function resolveOutputPath(rootDir, name = 'output') {
  const safeName = String(name || 'output')
    .trim()
    .replace(/[^a-z0-9_-]+/gi, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase() || 'output';

  return path.join(rootDir, 'generated', `mcp-test-${safeName}.png`);
}

module.exports = {
  buildMcpTestRequest,
  parseMcpTestArgs,
  resolveOutputPath,
};
