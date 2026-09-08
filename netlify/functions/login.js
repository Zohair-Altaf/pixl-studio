const { makeToken, setCookieHeader, TTL_MS } = require('./_auth');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method not allowed' };
  }

  const secret = process.env.ADMIN_SECRET;
  const password = process.env.ADMIN_PASSWORD;
  if (!secret || !password) {
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        error: 'Server not configured. Set ADMIN_PASSWORD and ADMIN_SECRET in your Netlify site\'s environment variables, then redeploy.',
      }),
    };
  }

  let body;
  try {
    body = JSON.parse(event.body || '{}');
  } catch (e) {
    return { statusCode: 400, body: 'Bad request' };
  }

  if (typeof body.password !== 'string' || body.password !== password) {
    return {
      statusCode: 401,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Incorrect password.' }),
    };
  }

  const token = makeToken(secret);
  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'application/json',
      'Set-Cookie': setCookieHeader(token, TTL_MS / 1000),
    },
    body: JSON.stringify({ ok: true }),
  };
};
