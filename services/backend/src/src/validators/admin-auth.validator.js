import { body } from 'express-validator';

export const adminLoginValidator = [
  body('phone')
    .notEmpty()
    .withMessage('شماره همراه الزامی است')
    .isLength({ max: 12 })
    .withMessage('شماره همراه نامعتبر است'),
  body('password')
    .notEmpty()
    .withMessage('رمز عبور الزامی است')
    .isLength({ max: 100 })
    .withMessage('رمز عبور نامعتبر است')
];
