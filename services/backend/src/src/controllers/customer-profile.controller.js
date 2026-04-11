import bcrypt from 'bcryptjs';
import { Customer } from '../models/customer.model.js';
import { ensureCustomerWithWallet, serializeCustomerProfile, upsertCustomerAvatar } from '../services/customer-profile.service.js';

export const getCustomerProfile = async (req, res, next) => {
  try {
    const customer = await ensureCustomerWithWallet(req.auth.sub);

    if (!customer) {
      return res.status(404).json({ message: 'مشتری یافت نشد' });
    }

    return res.status(200).json({ profile: serializeCustomerProfile(customer) });
  } catch (error) {
    return next(error);
  }
};

export const updateCustomerProfile = async (req, res, next) => {
  try {
    const customer = await Customer.findByPk(req.auth.sub);
    if (!customer) {
      return res.status(404).json({ message: 'مشتری یافت نشد' });
    }

    const isFirstCompletion = !customer.profile;
    const plainPassword = String(req.body.password || '').trim();

    if (isFirstCompletion && !plainPassword) {
      return res.status(422).json({ message: 'برای تکمیل ثبت نام، رمز عبور الزامی است' });
    }

    const payload = {
      name: String(req.body.name || '').trim(),
      email: req.body.email ? String(req.body.email).trim().toLowerCase() : null,
      nationalCode: String(req.body.nationalCode || '').trim(),
      birthdate: req.body.birthdate || null,
      profile: true,
      verifiedAt: customer.verifiedAt || new Date()
    };

    if (plainPassword) {
      payload.password = await bcrypt.hash(plainPassword, 10);
    }

    await customer.update(payload);

    const freshCustomer = await ensureCustomerWithWallet(customer.id);

    return res.status(200).json({
      message: isFirstCompletion ? 'ثبت نام شما تکمیل شد' : 'پروفایل با موفقیت بروزرسانی شد',
      profile: serializeCustomerProfile(freshCustomer)
    });
  } catch (error) {
    return next(error);
  }
};

export const updateCustomerAvatar = async (req, res, next) => {
  try {
    const customer = await Customer.findByPk(req.auth.sub);
    if (!customer) {
      return res.status(404).json({ message: 'مشتری یافت نشد' });
    }

    if (!customer.profile) {
      return res.status(403).json({ message: 'ابتدا ثبت نام خود را تکمیل کنید' });
    }

    if (!req.file) {
      return res.status(422).json({ message: 'فایل آواتار ارسال نشده است' });
    }

    await upsertCustomerAvatar({ customerId: customer.id, file: req.file });

    const freshCustomer = await ensureCustomerWithWallet(customer.id);

    return res.status(200).json({
      message: 'آواتار با موفقیت ذخیره شد',
      profile: serializeCustomerProfile(freshCustomer)
    });
  } catch (error) {
    return next(error);
  }
};