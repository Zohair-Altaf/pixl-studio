const { getStore } = require('@netlify/blobs');

exports.handler = async (event) => {
  const id = event.queryStringParameters && event.queryStringParameters.id;
  if (!id) {
    return { statusCode: 400, body: 'id query param required' };
  }

  const store = getStore('pixl-media');
  const result = await store.getWithMetadata(id, { type: 'arrayBuffer' });
  if (!result) {
    return { statusCode: 404, body: 'Not found' };
  }

  const contentType = (result.metadata && result.metadata.contentType) || 'application/octet-stream';
  return {
    statusCode: 200,
    headers: {
      'Content-Type': contentType,
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
    body: Buffer.from(result.data).toString('base64'),
    isBase64Encoded: true,
  };
};
