import { body } from 'express-validator';
import { Customer } from '../models/customer.model.js';
import { toEnglishDigits } from '../utils/digits.js';

const persianNameRegex = /^[\u0600-\u06FF\s]+$/u;

export const upsertCustomerProfileValidator = [
  body('name')
    .notEmpty()
    .withMessage('نام الزامی است')
    .matches(persianNameRegex)
    .withMessage('نام را به فارسی وارد کنید')
    .isLength({ max: 100 })
    .withMessage('نام نباید بیشتر از 100 کاراکتر باشد'),
  body('email')
    .optional({ values: 'falsy' })
    .isEmail()
    .withMessage('فرمت ایمیل نامعتبر است')
    .custom(async (value, { req }) => {
      const normalized = String(value || '').trim().toLowerCase();
      if (!normalized) {
        return true;
      }

      const existing = await Customer.findOne({ where: { email: normalized } });
      if (existing && Number(existing.id) !== Number(req.auth.sub)) {
        throw new Error('ایمیل قبلا ثبت شده است');
      }

      return true;
    }),
  body('nationalCode')
    .customSanitizer((value) => toEnglishDigits(value).trim())
    .notEmpty()
    .withMessage('کد ملی الزامی است')
    .matches(/^[0-9]{10}$/)
    .withMessage('کد ملی باید 10 رقم باشد')
    .custom(async (value, { req }) => {
      const existing = await Customer.findOne({ where: { nationalCode: value } });
      if (existing && Number(existing.id) !== Number(req.auth.sub)) {
        throw new Error('کد ملی قبلا ثبت شده است');
      }
      return true;
    }),
  body('birthdate')
    .optional({ values: 'falsy' })
    .isISO8601()
    .withMessage('تاریخ تولد نامعتبر است'),
  body('password')
    .optional({ values: 'falsy' })
    .isLength({ min: 6 })
    .withMessage('رمز عبور باید حداقل 6 کاراکتر باشد')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/)
    .withMessage('رمز عبور باید شامل حروف کوچک، بزرگ و عدد باشد')
];