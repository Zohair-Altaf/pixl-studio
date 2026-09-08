const { getStore } = require('@netlify/blobs');

// Netlify normally wires up Blobs automatically for Functions, but some
// projects don't get the automatic context injected. Falling back to
// explicit siteID + token (from environment variables) makes this work
// either way.
function getPixlStore(name) {
  if (process.env.BLOBS_TOKEN && process.env.SITE_ID) {
    return getStore({ name, siteID: process.env.SITE_ID, token: process.env.BLOBS_TOKEN });
  }
  return getStore(name);
}

module.exports = { getPixlStore };
