import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { createRequire } from 'node:module';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

const require = createRequire(import.meta.url);
const { buildMcpTestRequest, parseMcpTestArgs, resolveOutputPath } = require('../src/mcpTestCli');

const args = parseMcpTestArgs(process.argv.slice(2));

if (args.help || !args.promptFile) {
  printUsage();
  process.exit(args.help ? 0 : 1);
}

const prompt = await resolvePrompt(args);
const request = buildMcpTestRequest({
  prompt,
  model: args.model,
  aspectRatio: args.aspectRatio,
  resolution: args.resolution,
  cutout: args.cutout,
  cutoutModel: args.cutoutModel,
});

const transport = new StdioClientTransport({
  command: 'node',
  args: [path.resolve('mcp/server.mjs')],
});
const client = new Client({ name: 'image-creator-cli-test', version: '1.0.0' });

try {
  await client.connect(transport);
  const result = await client.callTool({
    name: 'generate_image',
    arguments: request,
  });

  if (result.isError) {
    throw new Error(result.content?.find((item) => item.type === 'text')?.text || 'MCP call failed');
  }

  const text = result.content.find((item) => item.type === 'text');
  const imageUrl = result.imageUrl || text?.text;

  if (!imageUrl) {
    throw new Error('MCP did not return an image url');
  }

  const outputPath = path.resolve(resolveOutputPath(process.cwd(), args.output || 'output'));
  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  if (isLocalAbsolutePath(imageUrl)) {
    await fs.copyFile(imageUrl, outputPath);
  } else {
    const response = await fetch(resolveDownloadUrl(imageUrl));
    if (!response.ok) {
      throw new Error(`Failed to download image: HTTP ${response.status}`);
    }
    await fs.writeFile(outputPath, Buffer.from(await response.arrayBuffer()));
  }

  console.log(`Saved image to: ${outputPath}`);
  console.log(`Image URL: ${imageUrl}`);
} finally {
  await client.close().catch(() => {});
}

function parseArgs(argv) {
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

    if (current === '--prompt') {
      parsed.prompt = next;
      index += 1;
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

  if (!parsed.prompt && !parsed.promptFile && parsed.positional[0]) {
    parsed.promptFile = parsed.positional[0];
  }

  if (!parsed.output && parsed.positional[1]) {
    parsed.output = parsed.positional[1];
  }

  return parsed;
}

async function resolvePrompt(args) {
  return (await fs.readFile(path.resolve(args.promptFile), 'utf8')).trim();
}

function printUsage() {
  console.log(`Usage:
  npm run mcp:test -- --prompt-file .\\prompts\\puppy-zh.txt --output puppy-zh

Options:
  --prompt-file <path>         UTF-8 text file. Required official input path.
  --output <name>              Output name suffix. Final file goes to generated/mcp-test-<name>.png
  --model <name>               qwen-image-2.0 or qwen-image-2.0-pro
  --aspect-ratio <ratio>       1:1, 16:9, 9:16
  --resolution <tier>          standard or high
  --cutout                     Enable background removal
  --cutout-model <name>        Optional cutout model when --cutout is enabled
`);
}

function resolveDownloadUrl(imageUrl) {
  if (/^https?:\/\//i.test(imageUrl)) {
    return imageUrl;
  }

  return `http://127.0.0.1:3000${imageUrl}`;
}

function isLocalAbsolutePath(imageUrl) {
  return /^[A-Za-z]:[\\/]/.test(imageUrl) || /^\\\\/.test(imageUrl);
}
