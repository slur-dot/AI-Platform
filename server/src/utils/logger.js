const getTimestamp = () => new Date().toISOString();

const logger = {
  info: (message, ...meta) => {
    console.log(`[${getTimestamp()}] [INFO] ${message}`, ...meta);
  },
  error: (message, ...meta) => {
    console.error(`[${getTimestamp()}] [ERROR] ${message}`, ...meta);
  },
  warn: (message, ...meta) => {
    console.warn(`[${getTimestamp()}] [WARN] ${message}`, ...meta);
  },
  debug: (message, ...meta) => {
    if (process.env.NODE_ENV !== 'production') {
      console.log(`[${getTimestamp()}] [DEBUG] ${message}`, ...meta);
    }
  }
};

module.exports = logger;
