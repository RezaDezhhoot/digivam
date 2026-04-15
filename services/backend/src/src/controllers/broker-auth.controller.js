import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { Broker } from '../models/broker.model.js';
import { env } from '../config/env.js';
import { Notification } from '../models/notification.model.js';
import { Wallet } from '../models/wallet.model.js';
import { createNotification } from '../services/notification.service.js';
import { loadSettingsItems, serializeAdminSettings } from '../services/site-settings.service.js';
import { ensureWallet } from '../services/wallet.service.js';
import { normalizePhone } from '../utils/phone.js';
import {
  hasActiveOtp,
  hitAttempt,
  secondsToResend,
  setOtp,
  tooManyAttempts,
  verifyOtp
} from '../utils/otp-store.js';
import { sendOtpSms } from '../services/sms.service.js';

const ATTEMPT_TTL = 2 * 60 * 60 * 1000;
const OTP_TTL = 90 * 1000;
const MAX_ATTEMPTS = 10;

const hashOtp = (otp) => crypto.createHash('sha256').update(String(otp)).digest('hex');
const resolveBrokerOtpTemplateId = () => env.smsBrokerOtpTemplateId || env.smsOtpTemplateId || '';

export const requestBrokerOtp = async (req, res, next) => {
  try {
    const phone = normalizePhone(req.body.phone);
    const rateKey = `verify-attempt:${phone}|${req.ip}`;

    if (tooManyAttempts(rateKey, MAX_ATTEMPTS)) {
      return res.status(429).json({
        message: 'زیادی تلاش کردید. لطفا پس از مدتی دوباره تلاش کنید.'
      });
    }

    if (env.mode === 'production') {
      hitAttempt(rateKey, ATTEMPT_TTL);
    }

    if (hasActiveOtp(phone)) {
      return res.status(409).json({
        message: 'کد تایید قبلا برای شما ارسال شده است',
        resendIn: secondsToResend(phone)
      });
    }

    const [broker] = await Broker.findOrCreate({
      where: { phone },
      defaults: { phone, auth: false, verifyLevel: 1 }
    });

    await ensureWallet({
      holderType: Wallet.HOLDER_TYPES.BROKER,
      holderId: broker.id
    });

    const otp = Math.floor(1000 + Math.random() * 9000).toString();
    setOtp(phone, otp, OTP_TTL);

    await broker.update({
      password: hashOtp(otp)
    });

    await sendOtpSms(phone, otp, { templateId: resolveBrokerOtpTemplateId() });

    return res.status(200).json({
      message: 'کد تایید ارسال شد',
      resendIn: secondsToResend(phone)
    });
  } catch (error) {
    return next(error);
  }
};

export const verifyBrokerOtp = async (req, res, next) => {
  try {
    const phone = normalizePhone(req.body.phone);
    const code = String(req.body.password || '');

    const broker = await Broker.findOne({ where: { phone } });
    if (!broker) {
      return res.status(401).json({
        message: 'شماره همراه یا کد تایید اشتباه می باشد'
      });
    }

    const isFirstLogin = !broker.auth;

    const matchesInMemory = verifyOtp(phone, code);
    const matchesHash = broker.password === hashOtp(code);

    if (!matchesInMemory || !matchesHash) {
      return res.status(401).json({
        message: 'شماره همراه یا کد تایید اشتباه می باشد'
      });
    }

    await broker.update({ auth: true });

    if (isFirstLogin) {
      const settings = serializeAdminSettings(await loadSettingsItems());
      const welcomeMessage = String(settings.welcomeMessageBroker || '').trim();

      if (welcomeMessage) {
        await createNotification({
          category: Notification.CATEGORIES.INFO,
          title: 'خوش آمدید',
          body: welcomeMessage,
          modelType: Notification.MODEL_TYPES.BROKER,
          modelId: broker.id,
          senderType: Notification.MODEL_TYPES.BROKER,
          senderId: broker.id
        }).catch(() => null);
      }
    }

    const token = jwt.sign(
      {
        sub: broker.id,
        role: 'broker',
        phone: broker.phone
      },
      env.jwtSecret,
      { expiresIn: '7d' }
    );

    return res.status(200).json({
      message: 'ورود موفق',
      token,
      broker: {
        id: broker.id,
        phone: broker.phone,
        auth: broker.auth,
        verifyLevel: broker.verifyLevel,
        isSuspended: Boolean(broker.isSuspended),
        suspendReason: broker.suspendReason || ''
      }
    });
  } catch (error) {
    return next(error);
  }
};
