type LogArgs = unknown[];

const logger = {
  info: (...args: LogArgs): void => {
    console.log("[INFO]", ...args);
  },

  warn: (...args: LogArgs): void => {
    console.warn("[WARN]", ...args);
  },

  error: (...args: LogArgs): void => {
    console.error("[ERROR]", ...args);
  },
};

export default logger;