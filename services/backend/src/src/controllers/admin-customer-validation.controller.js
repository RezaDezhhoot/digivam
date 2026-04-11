import path from 'node:path';
import { sequelize } from '../config/database.js';
import { CustomerValidation } from '../models/customer-validation.model.js';
import { Customer } from '../models/customer.model.js';
import { File } from '../models/file.model.js';
import { Validation } from '../models/validation.model.js';
import { Notification } from '../models/notification.model.js';
import { createNotification } from '../services/notification.service.js';
import { sendSms } from '../services/sms.service.js';
import {
  buildAdminSearchWhere,
  computeExpiresAt,
  createCustomerValidationSummary,
  findCustomerValidationById,
  listCustomerValidations,
  normalizeCustomerValidationStoredData,
  serializeCustomerValidation
} from '../services/customer-validation.service.js';
import { getPagination } from '../utils/pagination.js';

const uploadsRoot = path.resolve(process.cwd(), 'src', 'uploads');

const parseMaybeJson = (value) => {
  if (value == null || value === '') {
    return null;
  }

  if (typeof value === 'string') {
    return JSON.parse(value);
  }

  return value;
};

const upsertAdminAttachmentFile = async ({ record, uploadedFile, transaction }) => {
  const relativePath = path.relative(uploadsRoot, uploadedFile.path).replace(/\\/g, '/');
  const filePayload = {
    fileableType: 'customer_validation',
    fileableId: record.id,
    subject: 'validation_admin_attachment',
    path: relativePath,
    mimeType: uploadedFile.mimetype,
    size: uploadedFile.size,
    disk: 'local',
    status: 'processed',
    data: { originalName: uploadedFile.originalname }
  };

  let fileRecord = null;

  if (record.adminAttachmentId) {
    fileRecord = await File.findByPk(record.adminAttachmentId, { transaction });
  }

  if (!fileRecord) {
    fileRecord = await File.findOne({
      where: {
        fileableType: 'customer_validation',
        fileableId: record.id,
        subject: 'validation_admin_attachment'
      },
      transaction
    });
  }

  if (fileRecord) {
    await fileRecord.update(filePayload, { transaction });
    return fileRecord;
  }

  return File.create(filePayload, { transaction });
};

export const listAdminCustomerValidations = async (req, res, next) => {
  try {
    const { page, limit } = getPagination(req.query);
    const where = buildAdminSearchWhere(req.query);

    const result = await listCustomerValidations({ where, page, limit });

    return res.status(200).json(result);
  } catch (error) {
    return next(error);
  }
};

export const getAdminCustomerValidation = async (req, res, next) => {
  try {
    const item = await findCustomerValidationById(req.params.id);

    if (!item) {
      return res.status(404).json({ message: 'اعتبارسنجی مشتری یافت نشد' });
    }

    return res.status(200).json({ item });
  } catch (error) {
    return next(error);
  }
};

export const getAdminCustomerValidationSummary = async (_req, res, next) => {
  try {
    const summary = await createCustomerValidationSummary();
    return res.status(200).json(summary);
  } catch (error) {
    return next(error);
  }
};

export const updateAdminCustomerValidation = async (req, res, next) => {
  try {
    const record = await CustomerValidation.findByPk(req.params.id, {
      include: [
        { model: Customer, as: 'customer', required: false, attributes: ['id', 'name', 'phone'] },
        { model: Validation, as: 'validation', required: false, attributes: ['id', 'title', 'validFor'] }
      ]
    });

    if (!record) {
      return res.status(404).json({ message: 'اعتبارسنجی مشتری یافت نشد' });
    }

    const updates = {};

    if (req.body.result !== undefined) {
      updates.result = String(req.body.result || '').trim() || null;
    }

    if (req.body.data !== undefined) {
      updates.data = normalizeCustomerValidationStoredData(parseMaybeJson(req.body.data));
    }

    if (req.body.expiresAt !== undefined) {
      updates.expiresAt = req.body.expiresAt ? new Date(req.body.expiresAt) : null;
    }

    if (req.body.status && req.body.status !== record.status) {
      const newStatus = req.body.status;

      if (!Object.values(CustomerValidation.STATUSES).includes(newStatus)) {
        return res.status(422).json({ message: 'وضعیت نامعتبر است' });
      }

      updates.status = newStatus;

      if (newStatus === CustomerValidation.STATUSES.APPROVED) {
        updates.expiresAt = req.body.expiresAt
          ? new Date(req.body.expiresAt)
          : computeExpiresAt(record.validation);
      }
    }

    await sequelize.transaction(async (transaction) => {
      if (req.file) {
        const adminAttachmentFile = await upsertAdminAttachmentFile({
          record,
          uploadedFile: req.file,
          transaction
        });

        updates.adminAttachmentId = adminAttachmentFile.id;
      }

      await record.update(updates, { transaction });

      if (
        updates.status === CustomerValidation.STATUSES.APPROVED ||
        updates.status === CustomerValidation.STATUSES.REJECTED
      ) {
        const isApproved = updates.status === CustomerValidation.STATUSES.APPROVED;
        const statusText = isApproved ? 'تایید' : 'رد';
        const validationTitle = record.validation?.title || 'اعتبارسنجی';
        const resultMessage = updates.result || record.result || '';
        const notifBody = resultMessage
          ? `نتیجه بررسی ${validationTitle}: ${statusText} شد.\n${resultMessage}`
          : `نتیجه بررسی ${validationTitle}: ${statusText} شد.`;

        await createNotification({
          category: Notification.CATEGORIES.ATTENTION,
          title: 'توجه',
          body: notifBody,
          modelType: Notification.MODEL_TYPES.CUSTOMER,
          modelId: record.customerId,
          senderType: Notification.MODEL_TYPES.ADMIN,
          senderId: req.auth.sub,
          transaction
        });

        if (record.customer?.phone) {
          sendSms({
            phones: [record.customer.phone],
            message: `${validationTitle} شما ${statusText} شد. برای مشاهده جزئیات به پنل مشتری مراجعه کنید.`
          }).catch((e) => {
            console.error(e);
          });
        }
      }
    });

    const item = await findCustomerValidationById(record.id);
    return res.status(200).json({ message: 'اعتبارسنجی مشتری بروزرسانی شد', item });
  } catch (error) {
    return next(error);
  }
};

export const deleteAdminCustomerValidation = async (req, res, next) => {
  try {
    const record = await CustomerValidation.findByPk(req.params.id);

    if (!record) {
      return res.status(404).json({ message: 'اعتبارسنجی مشتری یافت نشد' });
    }

    await record.destroy();

    return res.status(200).json({ message: 'اعتبارسنجی مشتری حذف شد' });
  } catch (error) {
    return next(error);
  }
};
