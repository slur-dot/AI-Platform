const express = require('express');
const Task = require('../models/Task');
const { enqueue } = require('../services/queue');
const { apiLimiter } = require('../middleware/rateLimiter');
const authMiddleware = require('../middleware/auth');
const logger = require('../utils/logger');

const router = express.Router();

router.use(authMiddleware);
router.use(apiLimiter);

router.post('/', async (req, res) => {
  try {
    const { title, inputText, operationType } = req.body;

    if (!title || !inputText || !operationType) {
      return res.status(400).json({ error: 'Title, inputText, and operationType are required' });
    }

    const validOperations = ['uppercase', 'lowercase', 'reverse', 'word_count'];
    if (!validOperations.includes(operationType)) {
      return res.status(400).json({ error: `Invalid operationType. Must be one of: ${validOperations.join(', ')}` });
    }

    const task = new Task({
      title,
      inputText,
      operationType,
      status: 'pending',
      userId: req.user._id,
      executionLogs: [{ message: 'Task created and pending execution' }]
    });

    await task.save();
    logger.info(`Task created: ${task._id} by user ${req.user._id}`);

    res.status(201).json(task);
  } catch (error) {
    logger.error(`Error creating task: ${error.message}`);
    res.status(500).json({ error: 'Internal server error creating task' });
  }
});

router.get('/', async (req, res) => {
  try {
    const { status, page = 1, limit = 10 } = req.query;
    
    const query = { userId: req.user._id };
    if (status) {
      query.status = status;
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const parsedLimit = parseInt(limit);

    const tasks = await Task.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parsedLimit);

    const total = await Task.countDocuments(query);

    res.json({
      data: tasks,
      pagination: {
        total,
        page: parseInt(page),
        limit: parsedLimit,
        pages: Math.ceil(total / parsedLimit)
      }
    });
  } catch (error) {
    logger.error(`Error fetching tasks: ${error.message}`);
    res.status(500).json({ error: 'Internal server error fetching tasks' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const task = await Task.findOne({ _id: req.params.id, userId: req.user._id });
    
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    res.json(task);
  } catch (error) {
    logger.error(`Error fetching task ${req.params.id}: ${error.message}`);
    if (error.name === 'CastError') {
      return res.status(404).json({ error: 'Task not found (invalid ID format)' });
    }
    res.status(500).json({ error: 'Internal server error fetching task' });
  }
});

router.post('/:id/run', async (req, res) => {
  try {
    const task = await Task.findOne({ _id: req.params.id, userId: req.user._id });
    
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    if (task.status === 'running' || task.status === 'success') {
      return res.status(400).json({ error: `Cannot run task. Current status is '${task.status}'` });
    }

    task.status = 'pending';
    task.executionLogs.push({ message: 'Task queued for execution' });
    await task.save();

    await enqueue(task._id);
    
    logger.info(`Task ${task._id} enqueued for execution by user ${req.user._id}`);
    res.json({ message: 'Task enqueued successfully', task });
  } catch (error) {
    logger.error(`Error enqueuing task ${req.params.id}: ${error.message}`);
    res.status(500).json({ error: 'Internal server error enqueuing task' });
  }
});

module.exports = router;
