export const errorHandler = (err, _req, res, _next) => {
  const body = {
    message: err.message || 'خطای داخلی سرور',
    code: err.code || 'SERVER_ERROR'
  };

  if (err.data && typeof err.data === 'object') {
    Object.assign(body, err.data);
  }

  res.status(err.status || 500).json(body);
};
