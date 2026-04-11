import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { User } from '../models/user.model.js';
import { env } from '../config/env.js';
import {
  clearAttempts,
  hitAttempt,
  tooManyAttempts
} from '../utils/rate-limit-store.js';

const ATTEMPT_TTL = 5 * 60 * 60 * 1000;
const MAX_ATTEMPTS = 10;

export const adminLogin = async (req, res, next) => {
  try {
    const rateKey = `admin-login:${req.ip}`;

    if (tooManyAttempts(rateKey, MAX_ATTEMPTS)) {
      return res.status(429).json({
        message: 'زیادی تلاش کردید. لطفا پس از مدتی دوباره تلاش کنید.'
      });
    }

    if (env.mode === 'production') {
      hitAttempt(rateKey, ATTEMPT_TTL);
    }

    const { phone, password } = req.body;

    const admin = await User.findOne({
      where: { phone, role: 'admin' }
    });

    if (!admin || !admin.password) {
      return res.status(401).json({
        message: 'شماره همراه یا رمز عبور اشتباه می باشد'
      });
    }

    const valid = await bcrypt.compare(password, admin.password);
    if (!valid) {
      return res.status(401).json({
        message: 'شماره همراه یا رمز عبور اشتباه می باشد'
      });
    }

    clearAttempts(rateKey);

    const token = jwt.sign(
      {
        sub: admin.id,
        role: 'admin',
        phone: admin.phone
      },
      env.jwtSecret,
      { expiresIn: '8h' }
    );

    return res.status(200).json({
      message: 'ورود موفق',
      token,
      admin: {
        id: admin.id,
        name: admin.name,
        phone: admin.phone,
        email: admin.email
      }
    });
  } catch (error) {
    return next(error);
  }
};
