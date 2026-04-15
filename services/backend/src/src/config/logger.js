import path from 'node:path';
import fs from 'node:fs';
import winston from 'winston';

const logsDir = path.resolve(process.cwd(), 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

const jsonLineFormat = winston.format.printf(({ level, message, timestamp, category, sub_category, stack, ...rest }) => {
  const entry = {
    '@timestamp': timestamp,
    level,
    category: category || 'general',
    sub_category: sub_category || null,
    message: typeof message === 'string' ? message : JSON.stringify(message),
    stack_trace: stack || null
  };

  const extra = Object.keys(rest).length ? rest : undefined;
  if (extra) {
    entry.meta = extra;
  }

  return JSON.stringify(entry);
});

const baseFormats = [
  winston.format.timestamp({ format: 'YYYY-MM-DDTHH:mm:ss.SSSZ' }),
  winston.format.errors({ stack: true })
];

const createFileTransport = (filename, level) =>
  new winston.transports.File({
    filename: path.join(logsDir, filename),
    level,
    maxsize: 10 * 1024 * 1024,
    maxFiles: 30,
    format: winston.format.combine(...baseFormats, jsonLineFormat)
  });

export const logger = winston.createLogger({
  level: 'debug',
  format: winston.format.combine(...baseFormats, jsonLineFormat),
  transports: [
    createFileTransport('app.log', 'info'),
    createFileTransport('error.log', 'error'),
    createFileTransport('query.log', 'debug'),
    new winston.transports.Console({
      level: 'info',
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.timestamp({ format: 'HH:mm:ss' }),
        winston.format.printf(({ level, message, timestamp, category }) =>
          `${timestamp} ${level} [${category || 'general'}] ${message}`
        )
      )
    })
  ]
});

export const startupLogger = logger.child({ category: 'startup' });
export const queryLogger = logger.child({ category: 'query', sub_category: 'sequelize' });
export const apiLogger = logger.child({ category: 'api' });
export const exceptionLogger = logger.child({ category: 'exception' });

export const sequelizeLogFn = (sql, timing) => {
  queryLogger.debug(sql, { sub_category: 'sequelize', ...(timing != null ? { duration_ms: timing } : {}) });
};
