import { body } from 'express-validator';
import { Notification } from '../models/notification.model.js';

export const createAdminNotificationValidator = [
  body('modelType')
    .isIn([Notification.MODEL_TYPES.BROKER, Notification.MODEL_TYPES.CUSTOMER])
    .withMessage('نوع گیرنده نوتیفیکیشن نامعتبر است'),
  body('modelId').isInt({ gt: 0 }).withMessage('گیرنده نوتیفیکیشن نامعتبر است'),
  body('category').isIn(Object.values(Notification.CATEGORIES)).withMessage('دسته بندی نوتیفیکیشن نامعتبر است'),
  body('title').notEmpty().withMessage('عنوان نوتیفیکیشن الزامی است').isLength({ max: 255 }).withMessage('عنوان بیش از حد مجاز است'),
  body('body').notEmpty().withMessage('متن نوتیفیکیشن الزامی است').isLength({ max: 5000 }).withMessage('متن نوتیفیکیشن بیش از حد مجاز است')
];