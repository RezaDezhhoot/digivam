import { body, param } from 'express-validator';

export const brokerIdValidator = [
  param('id').isInt({ gt: 0 }).withMessage('شناسه کارگزار نامعتبر است')
];

export const updateBrokerLevelValidator = [
  ...brokerIdValidator,
  body('verifyLevel').isInt({ min: 1, max: 3 }).withMessage('سطح احراز هویت نامعتبر است')
];

export const customerIdValidator = [
  param('id').isInt({ gt: 0 }).withMessage('شناسه مشتری نامعتبر است')
];

export const adminIdValidator = [
  param('id').isInt({ gt: 0 }).withMessage('شناسه ادمین نامعتبر است')
];

export const createAdminValidator = [
  body('name').notEmpty().withMessage('نام ادمین الزامی است'),
  body('phone').notEmpty().withMessage('شماره همراه الزامی است'),
  body('password').isLength({ min: 6 }).withMessage('رمز عبور باید حداقل 6 کاراکتر باشد')
];

export const updateAdminValidator = [
  ...adminIdValidator,
  body('name').notEmpty().withMessage('نام ادمین الزامی است'),
  body('phone').notEmpty().withMessage('شماره همراه الزامی است'),
  body('password').optional().isLength({ min: 6 }).withMessage('رمز عبور باید حداقل 6 کاراکتر باشد')
];
