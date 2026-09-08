const { getPixlStore } = require('./_store');
const { isAuthed } = require('./_auth');
const crypto = require('crypto');

// Netlify Functions cap request/response payloads around 6MB; base64 adds ~33%
// overhead, so keep the raw image comfortably under that in both directions.
const MAX_BYTES = 4 * 1024 * 1024; // 4MB

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method not allowed' };
  }
  if (!isAuthed(event)) {
    return {
      statusCode: 401,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Not authenticated.' }),
    };
  }

  let body;
  try {
    body = JSON.parse(event.body || '{}');
  } catch (e) {
    return { statusCode: 400, body: 'Bad request' };
  }

  const dataUrl = body.dataUrl;
  const match = typeof dataUrl === 'string' && dataUrl.match(/^data:([^;]+);base64,(.*)$/);
  if (!match) {
    return { statusCode: 400, body: JSON.stringify({ error: 'A base64 data URL is required.' }) };
  }

  const contentType = match[1];
  if (!contentType.startsWith('image/')) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Only image uploads are allowed.' }) };
  }
  const buffer = Buffer.from(match[2], 'base64');
  if (buffer.length > MAX_BYTES) {
    return { statusCode: 413, body: JSON.stringify({ error: 'Image is too large (max 4MB).' }) };
  }

  const id = crypto.randomUUID();
  const store = getPixlStore('pixl-media');
  await store.set(id, buffer, { metadata: { contentType } });

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id, url: `/api/media?id=${id}` }),
  };
};
