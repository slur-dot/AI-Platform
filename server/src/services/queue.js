const redis = require('redis');
const config = require('../config');
const logger = require('../utils/logger');

const TASK_QUEUE = process.env.QUEUE_NAME || 'task_queue';
let client;

const createClient = async () => {
  client = redis.createClient({
    url: config.REDIS_URL
  });

  client.on('error', (err) => logger.error('Redis Client Error', err));
  client.on('connect', () => logger.info('Connected to Redis queue'));

  await client.connect();
};

const enqueue = async (taskId) => {
  if (!client || !client.isOpen) {
    throw new Error('Redis client is not connected');
  }
  await client.lPush(TASK_QUEUE, String(taskId));
  logger.info(`Task ${taskId} enqueued to ${TASK_QUEUE}`);
};

const getClient = () => {
  if (!client) throw new Error('Redis client has not been initialized');
  return client;
};

const disconnect = async () => {
  if (client && client.isOpen) {
    await client.quit();
    logger.info('Disconnected from Redis');
  }
};

module.exports = {
  createClient,
  enqueue,
  getClient,
  disconnect,
  TASK_QUEUE
};
