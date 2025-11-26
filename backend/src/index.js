require('dotenv').config();
const express = require('express');
const { encrypt, decrypt } = require('./utils/crypto');

const app = express();
const port = process.env.PORT || 3000;

/**
 * Initiate the OAuth flow by redirecting to Airtable's authorize endpoint.
 */
app.get('/auth/airtable', (req, res) => {
  const clientId = process.env.AIRTABLE_CLIENT_ID;
  const redirectUri = process.env.OAUTH_REDIRECT_URI;
  const scope = 'data.records:read data.records:write schema.bases:read';
  if (!clientId || !redirectUri) {
    return res
      .status(500)
      .send('Missing AIRTABLE_CLIENT_ID or OAUTH_REDIRECT_URI in environment');
  }
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope,
  });
  res.redirect(`https://airtable.com/oauth2/v1/authorize?${params.toString()}`);
});

/**
 * OAuth callback endpoint (stub).
 */
app.get('/auth/airtable/callback', (req, res) => {
  const { code } = req.query;
  if (!code) {
    return res.status(400).send('Missing code parameter');
  }
  // TODO: Exchange code for tokens and encrypt refresh_token before storing
  res.send(`Received OAuth code: ${code}`);
});

app.listen(port, () => {
  console.log(`🚀 LoopTable backend listening on port ${port}`);
});
