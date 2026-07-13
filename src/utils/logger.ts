const isProd = process.env.NODE_ENV === "production";

const timestamp = () => new Date().toISOString();

type LogArgs = unknown[];

const logger = {
  info: (...args: LogArgs): void => {
    console.log(`[${timestamp()}] [INFO]`, ...args);
  },

  warn: (...args: LogArgs): void => {
    console.warn(`[${timestamp()}] [WARN]`, ...args);
  },

  error: (...args: LogArgs): void => {
    console.error(`[${timestamp()}] [ERROR]`, ...args);
  },

  // debug only prints in non-production to keep Render logs clean
  debug: (...args: LogArgs): void => {
    if (!isProd) {
      console.log(`[${timestamp()}] [DEBUG]`, ...args);
    }
  },
};

export default logger;