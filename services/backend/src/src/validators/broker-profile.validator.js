import { body } from 'express-validator';
import { Broker } from '../models/broker.model.js';

const persianNameRegex = /^[\u0600-\u06FF\s]+$/u;

export const profileLevel1Validator = [
  body('name')
    .notEmpty()
    .withMessage('نام الزامی است')
    .matches(persianNameRegex)
    .withMessage('نام را به فارسی وارد کنید'),
  body('nationalCode')
    .notEmpty()
    .withMessage('کد ملی الزامی است')
    .matches(/^[0-9]{10}$/)
    .withMessage('کد ملی باید 10 رقم باشد')
    .custom(async (value, { req }) => {
      const existing = await Broker.findOne({ where: { nationalCode: value } });
      if (existing && Number(existing.id) !== Number(req.auth.sub)) {
        throw new Error('کد ملی قبلا ثبت شده است');
      }
      return true;
    }),
  body('birthdate').notEmpty().withMessage('تاریخ تولد الزامی است').isISO8601().withMessage('تاریخ تولد نامعتبر است')
];

export const profileLevel2Validator = [
  body('sheba')
    .notEmpty()
    .withMessage('شماره شبا الزامی است')
    .matches(/^(IR[0-9]{24}|[0-9]{24})$/i)
    .withMessage('شماره شبا نامعتبر است. نمونه معتبر: IR062960000000100324200001'),
  body('postalCode')
    .matches(/^[0-9]{10}$/)
    .withMessage('کد پستی باید 10 رقم باشد'),
  body('address').notEmpty().withMessage('آدرس الزامی است').isLength({ max: 250 }).withMessage('آدرس نباید بیشتر از 250 کاراکتر باشد')
];
