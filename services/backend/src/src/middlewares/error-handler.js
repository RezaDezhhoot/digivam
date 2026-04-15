import { exceptionLogger } from '../config/logger.js';

export const errorHandler = (err, _req, res, _next) => {
  const status = err.status || 500;

  if (status >= 500) {
    exceptionLogger.error(err.message || 'خطای داخلی سرور', {
      sub_category: 'unhandled',
      stack: err.stack || null,
      code: err.code || 'SERVER_ERROR'
    });
  }

  const body = {
    message: err.message || 'خطای داخلی سرور',
    code: err.code || 'SERVER_ERROR'
  };

  if (err.data && typeof err.data === 'object') {
    Object.assign(body, err.data);
  }

  res.status(status).json(body);
};
