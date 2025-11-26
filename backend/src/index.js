require('dotenv').config();
const express = require('express');
const { encrypt, decrypt } = require('./utils/crypto');

const app = express();
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
// Postgres client
const { Pool } = require('pg');
// Redis & queue for schedules
const Redis = require('ioredis');
const { Queue } = require('bullmq');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const scheduleQueue = new Queue('looptable-schedules', {
  connection: new Redis(process.env.REDIS_URL || 'redis://localhost:6379'),
});
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
app.get('/auth/airtable/callback', async (req, res) => {
  const { code } = req.query;
  if (!code) {
    return res.status(400).send('Missing code parameter');
  }
  const clientId = process.env.AIRTABLE_CLIENT_ID;
  const clientSecret = process.env.AIRTABLE_CLIENT_SECRET;
  const redirectUri = process.env.OAUTH_REDIRECT_URI;
  try {
    // Exchange authorization code for tokens
    const tokenResp = await fetch('https://airtable.com/oauth2/v1/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
      }),
    });
    const tokenData = await tokenResp.json();
    if (!tokenData.refresh_token || !tokenData.access_token) {
      throw new Error('Invalid token response');
    }
    // Fetch current user info
    const meResp = await fetch('https://api.airtable.com/v0/meta/me', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    const meData = await meResp.json();
    const airtableUserId = meData.user.id;
    const email = meData.user.email;
    // Upsert user record
    await pool.query(
      `INSERT INTO users (airtable_user_id, email)
       VALUES ($1, $2)
       ON CONFLICT (airtable_user_id) DO UPDATE SET email = EXCLUDED.email
       RETURNING id`,
      [airtableUserId, email],
    );
    // Encrypt and store refresh token
    const enc = encrypt(tokenData.refresh_token);
    await pool.query(
      `INSERT INTO credentials (user_id, encrypted_refresh_token, iv, auth_tag, last_refreshed)
       VALUES (
         (SELECT id FROM users WHERE airtable_user_id = $1),
         $2, $3, $4, NOW()
       )
       ON CONFLICT (user_id) DO UPDATE
         SET encrypted_refresh_token = EXCLUDED.encrypted_refresh_token,
             iv = EXCLUDED.iv,
             auth_tag = EXCLUDED.auth_tag,
             last_refreshed = EXCLUDED.last_refreshed`,
      [airtableUserId, enc.content, enc.iv, enc.authTag],
    );
    res.send('Authentication successful! You can close this window.');
  } catch (err) {
    console.error('OAuth callback error:', err);
    res.status(500).send('OAuth error');
  }
});

app.listen(port, () => {
  console.log(`🚀 LoopTable backend listening on port ${port}`);
});

/**
 * Create a new recurring schedule
 */
app.post('/api/schedule', async (req, res) => {
  const {
    userId,
    baseId,
    tableId,
    templateRecordId,
    cronExpression,
    timezone,
    fieldConfig = {},
  } = req.body;
  if (!userId || !baseId || !tableId || !templateRecordId || !cronExpression || !timezone) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  try {
    // Gating: free users may have max 1 active schedule
    const user = await pool.query(
      'SELECT subscription_status FROM users WHERE id = $1',
      [userId],
    );
    if (!user.rowCount) {
      return res.status(404).json({ error: 'User not found' });
    }
    const status = user.rows[0].subscription_status;
    if (status === 'free') {
      const activeCount = await pool.query(
        'SELECT COUNT(*) FROM schedules WHERE user_id = $1 AND is_active',
        [userId],
      );
      if (parseInt(activeCount.rows[0].count, 10) >= 1) {
        return res.status(403).json({ error: 'Free tier allows only 1 active schedule' });
      }
    }
    // Insert schedule
    const insertQ = await pool.query(
      `INSERT INTO schedules
        (user_id, base_id, table_id, template_record_id, cron_expression, timezone, field_config)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id`,
      [userId, baseId, tableId, templateRecordId, cronExpression, timezone, fieldConfig],
    );
    const scheduleId = insertQ.rows[0].id;
    // Enqueue first job
    await scheduleQueue.add(scheduleId, { scheduleId });
    res.status(201).json({ scheduleId });
  } catch (err) {
    console.error('Schedule creation error:', err);
    res.status(500).json({ error: 'Internal error' });
  }
});
