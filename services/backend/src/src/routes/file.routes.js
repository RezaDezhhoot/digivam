import { Router } from 'express';
import { param } from 'express-validator';
import { downloadFileById } from '../controllers/file.controller.js';
import { validateRequest } from '../middlewares/validate-request.js';

export const fileRouter = Router();

fileRouter.get(
  '/:id/download',
  [param('id').isInt({ gt: 0 }).withMessage('شناسه فایل نامعتبر است')],
  validateRequest,
  downloadFileById
);