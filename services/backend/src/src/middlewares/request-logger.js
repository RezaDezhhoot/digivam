import { apiLogger } from '../config/logger.js';

export const requestLogger = (req, res, next) => {
  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;
    const level = res.statusCode >= 500 ? 'error' : res.statusCode >= 400 ? 'warn' : 'info';

    apiLogger.log(level, `${req.method} ${req.originalUrl} ${res.statusCode} ${duration}ms`, {
      sub_category: 'request',
      method: req.method,
      url: req.originalUrl,
      status: res.statusCode,
      duration_ms: duration,
      ip: req.ip
    });
  });

  next();
};
