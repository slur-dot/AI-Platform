const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  inputText: {
    type: String,
    required: true
  },
  operationType: {
    type: String,
    enum: ['uppercase', 'lowercase', 'reverse', 'word_count'],
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'running', 'success', 'failed'],
    default: 'pending'
  },
  result: {
    type: String,
    default: null
  },
  executionLogs: [{
    timestamp: {
      type: Date,
      default: Date.now
    },
    message: String
  }],
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  }
}, { timestamps: true });

taskSchema.index({ userId: 1, status: 1 });
taskSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Task', taskSchema);
