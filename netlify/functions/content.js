const { getStore } = require('@netlify/blobs');
const { isAuthed } = require('./_auth');
const defaultContent = require('../../data/content.json');

const KEY = 'content.json';

exports.handler = async (event) => {
  const store = getStore('pixl-content');

  if (event.httpMethod === 'GET') {
    const data = await store.get(KEY, { type: 'json' });
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
      body: JSON.stringify(data || defaultContent),
    };
  }

  if (event.httpMethod === 'PUT' || event.httpMethod === 'POST') {
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
    if (!body || typeof body !== 'object' || !body.site) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Invalid content payload.' }) };
    }
    await store.setJSON(KEY, body);
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ok: true }),
    };
  }

  return { statusCode: 405, body: 'Method not allowed' };
};
