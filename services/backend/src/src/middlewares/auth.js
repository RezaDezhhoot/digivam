import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';

const getToken = (authorization) => {
  if (!authorization) {
    return null;
  }

  const [type, token] = String(authorization).split(' ');
  if (type !== 'Bearer' || !token) {
    return null;
  }

  return token;
};

export const requireAuth = (role) => (req, res, next) => {
  const token = getToken(req.headers.authorization);

  if (!token) {
    return res.status(401).json({ message: 'دسترسی غیرمجاز' });
  }

  try {
    const payload = jwt.verify(token, env.jwtSecret);

    if (role && payload.role !== role) {
      return res.status(403).json({ message: 'شما اجازه دسترسی به این بخش را ندارید' });
    }

    req.auth = payload;
    return next();
  } catch (_error) {
    return res.status(401).json({ message: 'توکن معتبر نیست یا منقضی شده است' });
  }
};

export const optionalAuth = (req, _res, next) => {
  const token = getToken(req.headers.authorization);

  if (!token) {
    req.auth = null;
    return next();
  }

  try {
    req.auth = jwt.verify(token, env.jwtSecret);
  } catch {
    req.auth = null;
  }

  return next();
};
