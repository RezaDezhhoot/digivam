import { validationResult } from 'express-validator';

export const validateRequest = (req, _res, next) => {
  const result = validationResult(req);

  if (result.isEmpty()) {
    return next();
  }

  const first = result.array({ onlyFirstError: true })[0];
  const error = new Error(first.msg);
  error.status = 422;
  return next(error);
};
