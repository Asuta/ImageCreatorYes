const fs = require('node:fs');
const path = require('node:path');
const { spawn } = require('node:child_process');
const crypto = require('node:crypto');

function validateCutoutConfig(config) {
  if (!config.removerPath) {
    throw new Error('Missing BRAINDEAD_BG_REMOVER_PATH in .env');
  }

  if (!fs.existsSync(config.removerPath)) {
    throw new Error(`BRAINDEAD_BG_REMOVER_PATH does not exist: ${config.removerPath}`);
  }
}

function buildCutoutPaths({ workDir, outputDir, sourceName, id }) {
  const extension = path.extname(sourceName || '').toLowerCase() || '.png';
  const safeExtension = ['.png', '.jpg', '.jpeg', '.webp'].includes(extension)
    ? extension
    : '.png';
  const inputPath = path.normalize(path.join(workDir, `${id}${safeExtension}`));
  const expectedToolOutputPath = path.normalize(path.join(workDir, `${id}_nobg.png`));
  const finalOutputPath = path.normalize(path.join(outputDir, `${id}.png`));

  return {
    inputPath,
    expectedToolOutputPath,
    finalOutputPath,
    publicUrl: `/generated/cutouts/${id}.png`,
  };
}

function createCutoutService(options) {
  const serviceOptions = {
    workDir: options.workDir,
    outputDir: options.outputDir,
    removerPath: options.removerPath,
    runProcess: options.runProcess || runProcess,
    downloadImage: options.downloadImage || downloadImage,
    idFactory: options.idFactory || (() => crypto.randomUUID()),
  };

  return {
    async createCutout(imageUrl) {
      validateImageUrl(imageUrl);
      validateCutoutConfig(serviceOptions);

      await fs.promises.mkdir(serviceOptions.workDir, { recursive: true });
      await fs.promises.mkdir(serviceOptions.outputDir, { recursive: true });

      const id = serviceOptions.idFactory();
      const sourceName = new URL(imageUrl).pathname.split('/').pop() || 'source.png';
      const paths = buildCutoutPaths({
        workDir: serviceOptions.workDir,
        outputDir: serviceOptions.outputDir,
        sourceName,
        id,
      });

      const bytes = await serviceOptions.downloadImage(imageUrl);
      await fs.promises.writeFile(paths.inputPath, bytes);

      try {
        await serviceOptions.runProcess(serviceOptions.removerPath, [paths.inputPath]);

        if (!fs.existsSync(paths.expectedToolOutputPath)) {
          throw new Error(
            `Background remover finished but did not create ${paths.expectedToolOutputPath}. ` +
              'The stock BrainDeadBackgroundRemover EXE may not support headless CLI processing; use a CLI wrapper that accepts an input path and writes <input>_nobg.png.',
          );
        }

        await fs.promises.rename(paths.expectedToolOutputPath, paths.finalOutputPath);
      } finally {
        await fs.promises.rm(paths.inputPath, { force: true });
      }

      return {
        imageUrl: paths.publicUrl,
      };
    },
  };
}

function validateImageUrl(imageUrl) {
  if (!imageUrl) {
    throw new Error('imageUrl is required');
  }

  const parsed = new URL(imageUrl);

  if (!['http:', 'https:'].includes(parsed.protocol)) {
    throw new Error('imageUrl must be an http or https URL');
  }
}

async function downloadImage(imageUrl) {
  const response = await fetch(imageUrl);

  if (!response.ok) {
    throw new Error(`Failed to download image: HTTP ${response.status}`);
  }

  return Buffer.from(await response.arrayBuffer());
}

function runProcess(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      windowsHide: true,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (chunk) => {
      stdout += chunk.toString();
    });
    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });
    child.on('error', reject);
    child.on('close', (code) => {
      if (code === 0) {
        resolve({ stdout, stderr });
        return;
      }

      reject(new Error(`Background remover exited with code ${code}: ${stderr || stdout}`));
    });
  });
}

module.exports = {
  buildCutoutPaths,
  createCutoutService,
  validateCutoutConfig,
};
