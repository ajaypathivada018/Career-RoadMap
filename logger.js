const LEVELS = { error: 0, warn: 1, info: 2, debug: 3 };
const envLevel = (process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug')).toLowerCase();
const CURRENT_LEVEL = LEVELS[envLevel] !== undefined ? LEVELS[envLevel] : LEVELS.info;

function error(...args) {
  console.error(...args);
}

function warn(...args) {
  if (CURRENT_LEVEL >= LEVELS.warn) console.warn(...args);
}

function info(...args) {
  if (CURRENT_LEVEL >= LEVELS.info) console.info(...args);
}

function debug(...args) {
  if (CURRENT_LEVEL >= LEVELS.debug) console.debug(...args);
}

export default {
  error,
  warn,
  info,
  debug,
};
