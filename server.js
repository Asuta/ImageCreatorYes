const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { URL } = require('node:url');

const { buildGenerationPayload, extractImageUrls } = require('./src/imageApi');

const host = '127.0.0.1';
const port = process.env.PORT || 3000;
const publicDir = path.join(__dirname, 'public');

loadEnvFile(path.join(__dirname, '.env'));

const mimeTypes = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
};

const server = http.createServer(async (req, res) => {
  try {
    const requestUrl = new URL(req.url, `http://${req.headers.host}`);

    if (req.method === 'POST' && requestUrl.pathname === '/api/generate') {
      await handleGenerate(req, res);
      return;
    }

    if (req.method === 'GET') {
      await serveStaticFile(requestUrl.pathname, res);
      return;
    }

    sendJson(res, 405, { error: 'Method not allowed' });
  } catch (error) {
    sendJson(res, 500, { error: error.message || 'Internal server error' });
  }
});

server.listen(port, host, () => {
  console.log(`Server running at http://${host}:${port}`);
});

async function handleGenerate(req, res) {
  if (!process.env.IMAGE_API_KEY) {
    sendJson(res, 500, {
      error: 'Missing IMAGE_API_KEY in .env',
    });
    return;
  }

  const rawBody = await readRequestBody(req);
  const requestBody = rawBody ? JSON.parse(rawBody) : {};
  const payload = buildGenerationPayload(requestBody);

  const upstreamResponse = await fetch(
    process.env.IMAGE_API_BASE_URL || 'https://token.fun.tv/v1/images/generations',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.IMAGE_API_KEY}`,
      },
      body: JSON.stringify(payload),
    },
  );

  const upstreamText = await upstreamResponse.text();
  const upstreamJson = upstreamText ? JSON.parse(upstreamText) : {};

  if (!upstreamResponse.ok) {
    sendJson(res, upstreamResponse.status, {
      error: upstreamJson?.error?.message || upstreamJson?.message || 'Image generation failed',
      details: upstreamJson,
    });
    return;
  }

  sendJson(res, 200, {
    images: extractImageUrls(upstreamJson),
    raw: upstreamJson,
  });
}

async function serveStaticFile(requestPath, res) {
  const safePath = requestPath === '/' ? '/index.html' : requestPath;
  const filePath = path.normalize(path.join(publicDir, safePath));

  if (!filePath.startsWith(publicDir)) {
    sendJson(res, 403, { error: 'Forbidden' });
    return;
  }

  try {
    const data = await fs.promises.readFile(filePath);
    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, { 'Content-Type': mimeTypes[ext] || 'application/octet-stream' });
    res.end(data);
  } catch {
    sendJson(res, 404, { error: 'Not found' });
  }
}

function sendJson(res, statusCode, data) {
  res.writeHead(statusCode, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(data));
}

function readRequestBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';

    req.on('data', (chunk) => {
      body += chunk.toString();
    });
    req.on('end', () => resolve(body));
    req.on('error', reject);
  });
}

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return;
  }

  const envText = fs.readFileSync(filePath, 'utf8');

  for (const line of envText.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }

    const separatorIndex = trimmed.indexOf('=');
    if (separatorIndex === -1) {
      continue;
    }

    const key = trimmed.slice(0, separatorIndex).trim();
    const value = trimmed.slice(separatorIndex + 1).trim();

    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}
