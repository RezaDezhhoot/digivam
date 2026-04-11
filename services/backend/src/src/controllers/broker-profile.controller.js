import path from 'node:path';
import { Broker } from '../models/broker.model.js';
import { env } from '../config/env.js';
import { File } from '../models/file.model.js';
import { Wallet } from '../models/wallet.model.js';
import { ensureWallet, serializeWallet } from '../services/wallet.service.js';
import { zibalService } from '../services/zibal.service.js';
import { toEnglishDigits } from '../utils/digits.js';
import { clearAttempts, hitAttempt, tooManyAttempts } from '../utils/rate-limit-store.js';

const brokerInclude = [
  { model: File, as: 'avatar', required: false },
  { model: File, as: 'idCart', required: false },
  { model: File, as: 'birthCertificate', required: false },
  { model: Wallet, as: 'wallet', required: false }
];

const ZIBAL_MAX_ATTEMPTS = 5;
const ZIBAL_TTL_MS = 60 * 60 * 1000;

const isProductionMode = () => env.mode === 'production' || String(process.env.NODE_ENV || '').toLowerCase() === 'production';

const toIsoDate = (value) => {
  if (!value) {
    return '';
  }

  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return String(value).slice(0, 10);
  }

  return date.toISOString().slice(0, 10);
};

const toJalaliDate = (value) => {
  const isoDate = toIsoDate(value);
  if (!isoDate) {
    return '';
  }

  const date = new Date(`${isoDate}T00:00:00Z`);
  const formatter = new Intl.DateTimeFormat('en-u-ca-persian', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });

  const parts = formatter.formatToParts(date);
  const year = parts.find((part) => part.type === 'year')?.value || '';
  const month = parts.find((part) => part.type === 'month')?.value || '';
  const day = parts.find((part) => part.type === 'day')?.value || '';

  return [year, month, day].filter(Boolean).join('/');
};

const fileUrl = (file) => {
  if (!file) {
    return null;
  }

  const rawPath = String(file.path || '').replace(/\\/g, '/');

  if (/^https?:\/\//i.test(rawPath)) {
    return rawPath;
  }

  const uploadsRoot = path.resolve(process.cwd(), 'src', 'uploads').replace(/\\/g, '/');
  const relativePath = rawPath.startsWith(uploadsRoot)
    ? rawPath.slice(uploadsRoot.length).replace(/^\/+/, '')
    : rawPath.replace(/^\/+/, '');

  return `${env.backendBaseUrl}/uploads/${relativePath}`;
};

const serializeProfile = (broker) => ({
  id: broker.id,
  name: broker.name,
  phone: broker.phone,
  nationalCode: broker.nationalCode,
  birthdate: broker.birthdate,
  sheba: broker.sheba,
  postalCode: broker.postalCode,
  address: broker.address,
  verifyLevel: broker.verifyLevel,
  avatar: fileUrl(broker.avatar),
  idCart: fileUrl(broker.idCart),
  birthCertificate: fileUrl(broker.birthCertificate),
  wallet: serializeWallet(broker.wallet),
  walletBalance: String(broker.wallet?.balance || 0)
});

const upsertFile = async ({ brokerId, subject, file, type }) => {
  const uploadsRoot = path.resolve(process.cwd(), 'src', 'uploads');
  const relativePath = path.relative(uploadsRoot, file.path).replace(/\\/g, '/');

  const found = await File.findOne({
    where: {
      fileableType: type,
      fileableId: brokerId,
      subject
    }
  });

  const payload = {
    fileableType: type,
    fileableId: brokerId,
    subject,
    path: relativePath,
    mimeType: file.mimetype,
    size: file.size,
    disk: 'local',
    status: 'processed'
  };

  if (found) {
    await found.update(payload);
    return;
  }

  await File.create(payload);
};

export const getBrokerProfile = async (req, res, next) => {
  try {
    await ensureWallet({
      holderType: Wallet.HOLDER_TYPES.BROKER,
      holderId: req.auth.sub
    });

    const broker = await Broker.findByPk(req.auth.sub, {
      include: brokerInclude
    });

    if (!broker) {
      return res.status(404).json({ message: 'کارگزار یافت نشد' });
    }

    return res.status(200).json({ profile: serializeProfile(broker) });
  } catch (error) {
    return next(error);
  }
};

export const updateBrokerProfileLevel1 = async (req, res, next) => {
  try {
    const broker = await Broker.findByPk(req.auth.sub);
    if (!broker) {
      return res.status(404).json({ message: 'کارگزار یافت نشد' });
    }

    const nationalCode = toEnglishDigits(req.body.nationalCode).trim();
    const birthdate = toIsoDate(req.body.birthdate);
    const currentBirthdate = toIsoDate(broker.birthdate);
    const rateKey = `broker-profile-level1:${broker.id}`;

    if (tooManyAttempts(rateKey, ZIBAL_MAX_ATTEMPTS)) {
      return res.status(429).json({ message: 'زیادی تلاش کردید. لطفا پس از مدتی دوباره تلاش کنید.' });
    }

    if (isProductionMode()) {
      const shouldVerify = currentBirthdate !== birthdate || String(broker.nationalCode || '') !== nationalCode;

      if (shouldVerify) {
        hitAttempt(rateKey, ZIBAL_TTL_MS);

        const matched = await zibalService.matchingBirthdateAndNationalCode(nationalCode, toJalaliDate(birthdate));
        if (!matched) {
          return res.status(422).json({ message: 'کد ملی با تاریخ تولد مطابقت ندارد، لطفا مجدد تلاش کنید' });
        }
      }
    }

    await broker.update({
      name: String(req.body.name || '').trim(),
      nationalCode,
      birthdate,
      verifyLevel: broker.verifyLevel < 2 ? 2 : broker.verifyLevel
    });

    clearAttempts(rateKey);

    return res.status(200).json({ message: 'اطلاعات مرحله اول ثبت شد' });
  } catch (error) {
    return next(error);
  }
};

export const updateBrokerProfileLevel2 = async (req, res, next) => {
  try {
    const broker = await Broker.findByPk(req.auth.sub);
    if (!broker) {
      return res.status(404).json({ message: 'کارگزار یافت نشد' });
    }

    if (Number(broker.verifyLevel) < 2) {
      return res.status(403).json({ message: 'ابتدا مرحله اول احراز هویت را تکمیل کنید' });
    }

    const hasIdCart = await File.findOne({
      where: {
        fileableType: 'broker',
        fileableId: broker.id,
        subject: Broker.ID_CART_IMAGE_SUBJECT
      }
    });

    const hasBirthCertificate = await File.findOne({
      where: {
        fileableType: 'broker',
        fileableId: broker.id,
        subject: Broker.BIRTH_CERTIFICATE_IMAGE_SUBJECT
      }
    });

    if (!req.files?.idCartImage?.[0] && !hasIdCart) {
      return res.status(422).json({ message: 'تصویر کارت ملی الزامی است' });
    }

    if (!req.files?.birthCertificateImage?.[0] && !hasBirthCertificate) {
      return res.status(422).json({ message: 'تصویر شناسنامه الزامی است' });
    }

    const sheba = toEnglishDigits(String(req.body.sheba || '').trim()).toUpperCase();
    const postalCode = toEnglishDigits(String(req.body.postalCode || '').trim());
    const birthdate = toIsoDate(broker.birthdate);
    const rateKey = `broker-profile-level2:${broker.id}`;

    if (tooManyAttempts(rateKey, ZIBAL_MAX_ATTEMPTS)) {
      return res.status(429).json({ message: 'زیادی تلاش کردید. لطفا پس از مدتی دوباره تلاش کنید.' });
    }

    if (isProductionMode() && String(broker.sheba || '').trim().toUpperCase() !== sheba) {
      hitAttempt(rateKey, ZIBAL_TTL_MS);

      const matched = await zibalService.matchingCountryCodeAndShebaNumberAndBirthdate(
        String(broker.nationalCode || '').trim(),
        sheba,
        toJalaliDate(birthdate)
      );

      if (!matched) {
        return res.status(422).json({ message: 'کد ملی با شماره شبا مطابقت ندارد، لطفا مجدد تلاش کنید' });
      }
    }

    await broker.update({
      sheba,
      postalCode,
      address: String(req.body.address || '').trim(),
      verifyLevel: broker.verifyLevel < 3 ? 3 : broker.verifyLevel
    });

    if (req.files?.idCartImage?.[0]) {
      await upsertFile({
        brokerId: broker.id,
        subject: Broker.ID_CART_IMAGE_SUBJECT,
        file: req.files.idCartImage[0],
        type: 'broker'
      });
    }

    if (req.files?.birthCertificateImage?.[0]) {
      await upsertFile({
        brokerId: broker.id,
        subject: Broker.BIRTH_CERTIFICATE_IMAGE_SUBJECT,
        file: req.files.birthCertificateImage[0],
        type: 'broker'
      });
    }

    clearAttempts(rateKey);

    return res.status(200).json({ message: 'اطلاعات مرحله دوم ثبت شد' });
  } catch (error) {
    return next(error);
  }
};

export const updateBrokerAvatar = async (req, res, next) => {
  try {
    const broker = await Broker.findByPk(req.auth.sub);
    if (!broker) {
      return res.status(404).json({ message: 'کارگزار یافت نشد' });
    }

    if (Number(broker.verifyLevel) < 3) {
      return res.status(403).json({ message: 'ابتدا مراحل احراز هویت را تکمیل کنید' });
    }

    if (!req.file) {
      return res.status(422).json({ message: 'فایل آواتار ارسال نشده است' });
    }

    await upsertFile({
      brokerId: broker.id,
      subject: Broker.AVATAR_SUBJECT,
      file: req.file,
      type: 'broker'
    });

    return res.status(200).json({ message: 'آواتار با موفقیت ذخیره شد' });
  } catch (error) {
    return next(error);
  }
};
