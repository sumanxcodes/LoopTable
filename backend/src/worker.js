/**
 * Worker process for LoopTable: pulls scheduled jobs and executes them.
 * Phase 3 scaffold: connects to Redis, defines a BullMQ queue, and logs job data.
 */
require('dotenv').config();
const { Worker, Queue } = require('bullmq');
const Redis = require('ioredis');
const fetch = require('node-fetch');
const { decrypt } = require('./utils/crypto');

const connection = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
const queueName = 'looptable-schedules';

// Initialize the queue (for producers)
const scheduleQueue = new Queue(queueName, { connection });

// Worker to process scheduled jobs
const scheduleWorker = new Worker(
  queueName,
  async job => {
    console.log(`Processing job ${job.id}: ${job.name}`, job.data);
    const { scheduleId } = job.data;
    // 1. Load schedule config from DB
    const { rows } = await pool.query(
      'SELECT base_id, table_id, template_record_id, field_config FROM schedules WHERE id = $1',
      [scheduleId],
    );
    if (!rows.length) {
      throw new Error(`Schedule ${scheduleId} not found`);
    }
    const { base_id, table_id, template_record_id, field_config } = rows[0];

    // 2. Get fresh access token via stored refresh token
    const credRes = await pool.query(
      `SELECT encrypted_refresh_token, iv, auth_tag
       FROM credentials c
       JOIN schedules s ON s.user_id = c.user_id
       WHERE s.id = $1`,
      [scheduleId],
    );
    if (!credRes.rows.length) {
      throw new Error(`Credentials not found for schedule ${scheduleId}`);
    }
    const { encrypted_refresh_token, iv, auth_tag } = credRes.rows[0];
    const refreshToken = decrypt({ content: encrypted_refresh_token, iv, authTag: auth_tag });
    const tokenResp2 = await fetch('https://airtable.com/oauth2/v1/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
        client_id: process.env.AIRTABLE_CLIENT_ID,
        client_secret: process.env.AIRTABLE_CLIENT_SECRET,
      }),
    });
    const tokenData2 = await tokenResp2.json();
    if (!tokenData2.access_token) {
      throw new Error('Failed to refresh Airtable access token');
    }
    const accessToken = tokenData2.access_token;

    // Fetch table metadata to know field types
    const metaResp = await fetch(
      `https://api.airtable.com/v0/meta/bases/${base_id}/tables/${table_id}/fields`,
      { headers: { Authorization: `Bearer ${process.env.AIRTABLE_ACCESS_TOKEN}` } },
    );
    const metaData = await metaResp.json();
    const fieldMeta = metaData.fields.map(f => ({ name: f.name, type: f.type }));

    // 3. Fetch the template record
    const recResp = await fetch(
      `https://api.airtable.com/v0/${base_id}/${table_id}/${template_record_id}`,
      { headers: { Authorization: `Bearer ${process.env.AIRTABLE_ACCESS_TOKEN}` } },
    );
    const recData = await recResp.json();

    // 4. Sanitize record payload
    const { sanitizeRecord } = require('./utils/sanitize');
    const sanitized = sanitizeRecord(recData.fields, fieldMeta);
    // 5. Apply date-shift rules
    const { applyDateShifts } = require('./utils/dateMath');
    const shifted = applyDateShifts(sanitized, field_config);
    // 6. Create new record via Airtable API
    await fetch(
      `https://api.airtable.com/v0/${base_id}/${table_id}`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ fields: shifted }),
      },
    );
  },
  { connection }
);

scheduleWorker.on('completed', job => {
  console.log(`Job ${job.id} has completed.`);
});

scheduleWorker.on('failed', (job, err) => {
  console.error(`Job ${job.id} failed:`, err);
});

console.log('🔄 LoopTable worker is running, listening for jobs...');
