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
    console.log(`Processing job ${job.id}:`, job.name, job.data);
    const { scheduleId } = job.data;
    // 1. Load schedule config from DB (fields, templateRecordId, etc.)
    // 2. Fetch the template record from Airtable API
    // 3. Sanitize record payload (remove read-only fields)
    // 4. Apply date-shift rules per schedule config
    // 5. Create new record in Airtable via API
    // (Detailed implementation to follow in Phase 4)
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
