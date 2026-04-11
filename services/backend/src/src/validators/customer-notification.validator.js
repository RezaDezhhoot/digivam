import { param } from 'express-validator';

export const customerNotificationIdValidator = [
  param('id').isInt({ gt: 0 }).withMessage('شناسه نوتیفیکیشن نامعتبر است')
];