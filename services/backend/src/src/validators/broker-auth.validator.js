import { body } from 'express-validator';

export const requestOtpValidator = [
  body('phone')
    .notEmpty()
    .withMessage('شماره همراه الزامی است')
    .matches(/^(9|09)[0-9]{9}$/)
    .withMessage('فرمت شماره همراه نامعتبر است')
];

export const verifyOtpValidator = [
  body('phone')
    .notEmpty()
    .withMessage('شماره همراه الزامی است')
    .matches(/^(9|09)[0-9]{9}$/)
    .withMessage('فرمت شماره همراه نامعتبر است'),
  body('password')
    .notEmpty()
    .withMessage('کد تایید الزامی است')
    .matches(/^[0-9]{4}$/)
    .withMessage('کد تایید باید 4 رقم باشد')
];
