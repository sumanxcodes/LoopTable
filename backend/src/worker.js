/**
 * Worker process for LoopTable: pulls scheduled jobs and executes them.
 * Phase 3 scaffold: connects to Redis, defines a BullMQ queue, and logs job data.
 */
require('dotenv').config();
const { Worker, Queue } = require('bullmq');
const Redis = require('ioredis');

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

    // 2. Fetch table metadata to know field types
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

    // 5. TODO: Apply date-shift rules (field_config)
    // 6. TODO: Create new record via Airtable API using sanitized + shifted data
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
