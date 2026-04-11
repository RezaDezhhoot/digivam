import { body, param } from 'express-validator';

const allowedStatuses = ['pending', 'answered', 'closed'];

export const adminTicketIdValidator = [
  param('id').isInt({ gt: 0 }).withMessage('شناسه تیکت نامعتبر است')
];

export const adminReplyTicketValidator = [
  ...adminTicketIdValidator,
  body('body').notEmpty().withMessage('متن پاسخ الزامی است').isLength({ max: 10000 }).withMessage('متن پاسخ بیش از حد مجاز است'),
  body('status').isIn(allowedStatuses).withMessage('وضعیت تیکت نامعتبر است')
];