import { param } from 'express-validator';

export const brokerNotificationIdValidator = [
  param('id').isInt({ gt: 0 }).withMessage('شناسه نوتیفیکیشن نامعتبر است')
];