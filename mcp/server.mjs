import path from 'node:path';
import process from 'node:process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import * as z from 'zod/v4';

const require = createRequire(import.meta.url);
const { loadEnvFile } = require('../src/env');
const { createGenerationService } = require('../src/generationService');
const { createCutoutService } = require('../src/cutoutService');
const { getCutoutModelOptions } = require('../src/cutoutModels');
const { executeGenerateImageTool } = require('../src/mcpImageTool');
const { createTempImageCache } = require('../src/tempImageCache');

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

loadEnvFile(path.join(rootDir, '.env'));

const imageCache = createTempImageCache({
  cacheDir: process.env.MCP_IMAGE_CACHE_DIR,
  ttlHours: process.env.MCP_IMAGE_CACHE_TTL_HOURS,
  cleanupIntervalMinutes: process.env.MCP_IMAGE_CACHE_CLEANUP_INTERVAL_MINUTES,
  maxMb: process.env.MCP_IMAGE_CACHE_MAX_MB,
});

await imageCache.cleanup({ force: true });

const server = new McpServer(
  {
    name: 'image-creator-mcp',
    version: '1.0.0',
  },
  {
    instructions:
      'Use generate_image to create exactly one image. Pass at most three reference images. Enable cutout only when a transparent-background PNG is required.',
  },
);

server.tool(
  'generate_image',
  {
    prompt: z.string().min(1).describe('The text prompt used to generate the image.'),
    referenceImages: z
      .array(z.string())
      .max(3)
      .optional()
      .describe('Optional data URLs or HTTP(S) URLs for up to three reference images.'),
    cutout: z
      .boolean()
      .optional()
      .describe('When true, return a transparent-background PNG after local cutout.'),
    cutoutModel: z
      .enum(getCutoutModelOptions().map((option) => option.id))
      .optional()
      .describe('Optional cutout model. Only used when cutout is enabled.'),
    model: z
      .enum(['qwen-image-2.0', 'qwen-image-2.0-pro'])
      .optional()
      .describe('Optional upstream generation model.'),
    negativePrompt: z.string().optional().describe('Optional negative prompt.'),
    promptExtend: z.boolean().optional().describe('Whether to enable prompt expansion.'),
    watermark: z.boolean().optional().describe('Whether to enable watermarking.'),
    size: z.string().optional().describe('Explicit image size like 1024*1024.'),
    aspectRatio: z
      .enum(['1:1', '16:9', '9:16'])
      .optional()
      .describe('Aspect ratio used when size is not provided.'),
    resolution: z
      .enum(['standard', 'high'])
      .optional()
      .describe('Resolution tier used when size is not provided.'),
  },
  async (args) => {
    try {
      const generationService = createGenerationService({
        apiKey: process.env.IMAGE_API_KEY,
        apiBaseUrl: process.env.IMAGE_API_BASE_URL,
      });
      const cutoutService = createCutoutService({
        removerPath: process.env.BRAINDEAD_BG_REMOVER_PATH,
        defaultModel: process.env.BRAINDEAD_BG_MODEL,
        workDir: imageCache.getWorkDir(),
        outputDir: imageCache.getOutputDir(),
      });

      const result = await executeGenerateImageTool(args, {
        generationService,
        cutoutService,
      });
      await imageCache.cleanupIfDue();
      return result;
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: error.message || 'generate_image failed',
          },
        ],
        isError: true,
      };
    }
  },
);

const transport = new StdioServerTransport();
await server.connect(transport);

process.on('SIGINT', async () => {
  await server.close();
  process.exit(0);
});
