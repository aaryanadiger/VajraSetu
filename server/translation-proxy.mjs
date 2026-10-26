import { createServer } from 'node:http';

const apiKey = process.env.SARVAM_API_KEY;
const port = Number(process.env.PORT ?? 8787);
const allowedTargets = new Set(['hi-IN', 'mr-IN', 'kn-IN']);
const windows = new Map();
const maxRequestsPerMinute = 60;

function send(response, status, body) {
  response.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': process.env.ALLOWED_ORIGIN ?? '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  });
  response.end(JSON.stringify(body));
}

function isRateLimited(address) {
  const minute = Math.floor(Date.now() / 60_000);
  const current = windows.get(address);
  if (!current || current.minute !== minute) {
    windows.set(address, { minute, count: 1 });
    return false;
  }
  current.count += 1;
  return current.count > maxRequestsPerMinute;
}

const server = createServer((request, response) => {
  if (request.method === 'OPTIONS') return send(response, 204, {});
  if (request.method !== 'POST' || request.url !== '/translate') return send(response, 404, { error: 'Not found' });
  if (!apiKey) return send(response, 503, { error: 'Translation is not configured' });
  if (isRateLimited(request.socket.remoteAddress ?? 'unknown')) return send(response, 429, { error: 'Too many requests' });

  let body = '';
  request.on('data', chunk => {
    body += chunk;
    if (body.length > 12_000) request.destroy();
  });
  request.on('end', async () => {
    try {
      const payload = JSON.parse(body);
      if (typeof payload.input !== 'string' || !payload.input.trim() || payload.input.length > 2_000) {
        return send(response, 400, { error: 'Input must be 1–2000 characters' });
      }
      if (payload.source_language_code !== 'en-IN' || !allowedTargets.has(payload.target_language_code)) {
        return send(response, 400, { error: 'Unsupported language pair' });
      }

      const upstream = await fetch('https://api.sarvam.ai/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'api-subscription-key': apiKey },
        body: JSON.stringify({
          input: payload.input,
          source_language_code: 'en-IN',
          target_language_code: payload.target_language_code,
          model: 'sarvam-translate:v1',
        }),
      });
      const result = await upstream.json().catch(() => ({}));
      if (!upstream.ok) return send(response, upstream.status, { error: 'Translation provider failed' });
      return send(response, 200, { translated_text: result.translated_text });
    } catch {
      return send(response, 400, { error: 'Invalid JSON body' });
    }
  });
});

server.listen(port, () => {
  console.log(`Translation proxy listening on http://localhost:${port}/translate`);
});
