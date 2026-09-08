const { isAuthed } = require('./_auth');

exports.handler = async (event) => {
  const configured = !!(process.env.ADMIN_SECRET && process.env.ADMIN_PASSWORD);
  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
    body: JSON.stringify({ authed: isAuthed(event), configured }),
  };
};
