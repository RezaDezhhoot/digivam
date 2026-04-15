import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { Customer } from '../models/customer.model.js';
import { Notification } from '../models/notification.model.js';
import { Wallet } from '../models/wallet.model.js';
import { createNotification } from '../services/notification.service.js';
import { loadSettingsItems, serializeAdminSettings } from '../services/site-settings.service.js';
import { ensureWallet } from '../services/wallet.service.js';
import { sendOtpSms } from '../services/sms.service.js';
import { ensureCustomerWithWallet, serializeCustomerProfile } from '../services/customer-profile.service.js';
import { normalizePhone } from '../utils/phone.js';
import {
  hasActiveOtp,
  hitAttempt,
  secondsToResend,
  setOtp,
  tooManyAttempts,
  verifyOtp
} from '../utils/otp-store.js';

const ATTEMPT_TTL = 2 * 60 * 60 * 1000;
const OTP_TTL = 90 * 1000;
const MAX_ATTEMPTS = 10;

const hashOtp = (otp) => crypto.createHash('sha256').update(String(otp)).digest('hex');
const resolveCustomerOtpTemplateId = () => env.smsCustomerOtpTemplateId || env.smsOtpTemplateId || '';

const issueCustomerToken = (customer) =>
  jwt.sign(
    {
      sub: customer.id,
      role: 'customer',
      phone: customer.phone
    },
    env.jwtSecret,
    { expiresIn: '30d' }
  );

export const requestCustomerOtp = async (req, res, next) => {
  try {
    const phone = normalizePhone(req.body.phone);
    const rateKey = `customer-verify-attempt:${phone}|${req.ip}`;

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

    const [customer] = await Customer.findOrCreate({
      where: { phone },
      defaults: {
        phone,
        profile: false
      }
    });

    await ensureWallet({
      holderType: Wallet.HOLDER_TYPES.CUSTOMER,
      holderId: customer.id
    });

    const otp = Math.floor(1000 + Math.random() * 9000).toString();
    setOtp(phone, otp, OTP_TTL);

    await customer.update({
      otpPassword: hashOtp(otp)
    });

    await sendOtpSms(phone, otp, { templateId: resolveCustomerOtpTemplateId() });

    return res.status(200).json({
      message: 'کد تایید ارسال شد',
      resendIn: secondsToResend(phone)
    });
  } catch (error) {
    return next(error);
  }
};

export const verifyCustomerOtp = async (req, res, next) => {
  try {
    const phone = normalizePhone(req.body.phone);
    const code = String(req.body.password || '');

    const customer = await Customer.findOne({ where: { phone } });
    if (!customer) {
      return res.status(401).json({
        message: 'شماره همراه یا کد تایید اشتباه می باشد'
      });
    }

    const isFirstVerification = !customer.verifiedAt;

    const matchesInMemory = verifyOtp(phone, code);
    const matchesHash = customer.otpPassword === hashOtp(code);

    if (!matchesInMemory || !matchesHash) {
      return res.status(401).json({
        message: 'شماره همراه یا کد تایید اشتباه می باشد'
      });
    }

    await customer.update({
      verifiedAt: customer.verifiedAt || new Date(),
      otpPassword: null
    });

    const freshCustomer = await ensureCustomerWithWallet(customer.id);

    if (isFirstVerification) {
      const settings = serializeAdminSettings(await loadSettingsItems());
      const welcomeMessage = String(settings.welcomeMessageCustomer || '').trim();

      if (welcomeMessage) {
        await createNotification({
          category: Notification.CATEGORIES.INFO,
          title: 'خوش آمدید',
          body: welcomeMessage,
          modelType: Notification.MODEL_TYPES.CUSTOMER,
          modelId: freshCustomer.id,
          senderType: Notification.MODEL_TYPES.CUSTOMER,
          senderId: freshCustomer.id
        }).catch(() => null);
      }
    }

    return res.status(200).json({
      message: freshCustomer?.profile ? 'ورود موفق' : 'احراز هویت انجام شد، لطفا ثبت نام را تکمیل کنید',
      token: issueCustomerToken(customer),
      customer: serializeCustomerProfile(freshCustomer),
      nextStep: freshCustomer?.profile ? 'dashboard' : 'profile'
    });
  } catch (error) {
    return next(error);
  }
};