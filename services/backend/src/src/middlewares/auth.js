import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { Broker } from '../models/broker.model.js';
import { Customer } from '../models/customer.model.js';

const accountModels = {
  broker: Broker,
  customer: Customer
};

const suspendedMessageByRole = {
  broker: 'حساب کارگزاری شما توسط ادمین معلق شده است',
  customer: 'حساب مشتری شما توسط ادمین معلق شده است'
};

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

export const requireAuth = (role, options = {}) => async (req, res, next) => {
  const token = getToken(req.headers.authorization);

  if (!token) {
    return res.status(401).json({ message: 'دسترسی غیرمجاز' });
  }

  try {
    const payload = jwt.verify(token, env.jwtSecret);

    if (role && payload.role !== role) {
      return res.status(403).json({ message: 'شما اجازه دسترسی به این بخش را ندارید' });
    }

    const accountModel = accountModels[payload.role];
    if (accountModel && !options.allowSuspended) {
      const account = await accountModel.findByPk(payload.sub, {
        attributes: ['id', 'isSuspended', 'suspendReason']
      });

      if (!account) {
        return res.status(401).json({ message: 'حساب کاربری یافت نشد' });
      }

      if (account.isSuspended) {
        return res.status(423).json({
          code: 'ACCOUNT_SUSPENDED',
          panel: payload.role,
          suspended: true,
          reason: account.suspendReason || '',
          message: suspendedMessageByRole[payload.role] || 'حساب کاربری شما معلق شده است'
        });
      }
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
