import { body, param } from 'express-validator';
import { DEAL_ACT_BY, DEAL_STATUSES, DEAL_STEPS } from '../constants/deal.js';

export const adminDealIdValidator = [param('id').isInt({ gt: 0 }).withMessage('شناسه معامله نامعتبر است')];

export const updateAdminDealValidator = [
	...adminDealIdValidator,
	body('status').optional({ nullable: true, values: 'falsy' }).isIn(Object.values(DEAL_STATUSES)).withMessage('وضعیت معامله نامعتبر است'),
	body('step').optional({ nullable: true, values: 'falsy' }).isIn(Object.values(DEAL_STEPS)).withMessage('مرحله معامله نامعتبر است'),
	body('actBy').optional({ nullable: true, values: 'falsy' }).isIn(Object.values(DEAL_ACT_BY)).withMessage('صف اقدام معامله نامعتبر است'),
	body('note').optional({ nullable: true }).isString().isLength({ max: 2000 }).withMessage('پیام ادمین نامعتبر است')
];