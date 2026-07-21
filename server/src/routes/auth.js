const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { authLimiter } = require('../middleware/rateLimiter');
const config = require('../config');
const logger = require('../utils/logger');

const router = express.Router();

const generateToken = (userId) => {
  const secret = config.JWT_SECRET || 'dev_fallback_secret_only_for_local_testing';
  return jwt.sign({ userId }, secret, { expiresIn: config.JWT_EXPIRES_IN });
};

router.post('/register', authLimiter, async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters long' });
    }

    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(409).json({ error: 'Email is already registered' });
    }

    const user = new User({ email, password });
    await user.save();

    const token = generateToken(user._id);
    const userInfo = { id: user._id, email: user.email, createdAt: user.createdAt };
    
    logger.info(`User registered: ${email}`);
    res.status(201).json({ token, user: userInfo });
  } catch (error) {
    logger.error(`Registration error: ${error.message}`);
    res.status(500).json({ error: 'Internal server error during registration' });
  }
});

router.post('/login', authLimiter, async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const token = generateToken(user._id);
    const userInfo = { id: user._id, email: user.email, createdAt: user.createdAt };
    
    logger.info(`User logged in: ${email}`);
    res.json({ token, user: userInfo });
  } catch (error) {
    logger.error(`Login error: ${error.message}`);
    res.status(500).json({ error: 'Internal server error during login' });
  }
});

module.exports = router;
