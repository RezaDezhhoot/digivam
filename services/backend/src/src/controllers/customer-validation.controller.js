import path from 'node:path';
import { Op } from 'sequelize';
import { sequelize } from '../config/database.js';
import { env } from '../config/env.js';
import { Customer } from '../models/customer.model.js';
import { CustomerValidation } from '../models/customer-validation.model.js';
import { File } from '../models/file.model.js';
import { Invoice } from '../models/invoice.model.js';
import { Validation } from '../models/validation.model.js';
import { Document } from '../models/document.model.js';
import { getValidationStagesForCustomer, normalizeCustomerValidationStoredData } from '../services/customer-validation.service.js';
import { Zarin } from '../services/payment/drivers/zarin.js';
import { PaymentStatus, paymentStatusLabel } from '../services/payment/enums/payment-status.js';
import { Payment } from '../services/payment/payment.js';
import { toEnglishDigits } from '../utils/digits.js';
import { createPaginationResult, getPagination } from '../utils/pagination.js';

const uploadsRoot = path.resolve(process.cwd(), 'src', 'uploads').replace(/\\/g, '/');
const uploadsDir = path.resolve(process.cwd(), 'src', 'uploads');
const VALIDATION_INVOICE_PAYABLE_TYPE = 'customer_validation';

const formatDateLabel = (value) =>
  value ? new Date(value).toLocaleString('fa-IR', { dateStyle: 'short', timeStyle: 'short' }) : '-';

const formatValidForLabel = (value) => {
  const days = Number(value || 0);
  return days > 0 ? `${days} روز اعتبار` : 'بدون انقضا';
};

const normalizeMoneyAmount = (value) => {
  const amount = Number(value || 0);

  if (!Number.isFinite(amount)) {
    return 0;
  }

  return Math.max(Math.round(amount), 0);
};

const fileUrl = (file) => {
  if (!file) return null;
  const rawPath = String(file.path || '').replace(/\\/g, '/');
  if (/^https?:\/\//i.test(rawPath)) return rawPath;
  const relativePath = rawPath.startsWith(uploadsRoot)
    ? rawPath.slice(uploadsRoot.length).replace(/^\/+/, '')
    : rawPath.replace(/^\/+/, '');
  return `${env.backendBaseUrl}/uploads/${relativePath}`;
};

const fileDownloadUrl = (fileId) => {
  const numericId = Number(fileId || 0);
  return numericId > 0 ? `${env.backendBaseUrl}/api/files/${numericId}/download` : null;
};

const parseRequestData = (value) => {
  if (!value) {
    return {};
  }

  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
    } catch {
      return {};
    }
  }

  return typeof value === 'object' && !Array.isArray(value) ? value : {};
};

const normalizeRequestFiles = (files) => {
  if (!files) {
    return [];
  }

  const list = Array.isArray(files)
    ? files
    : Object.values(files)
        .flatMap((entry) => (Array.isArray(entry) ? entry : [entry]))
        .filter(Boolean);

  const uniqueFiles = new Map();

  for (const file of list) {
    if (file?.fieldname && !uniqueFiles.has(file.fieldname)) {
      uniqueFiles.set(file.fieldname, file);
    }
  }

  return [...uniqueFiles.values()];
};

const getStoredFieldType = (item) => {
  if (!item || typeof item !== 'object') {
    return '';
  }

  const explicitFieldType = String(item.fieldType || '').trim();
  if (explicitFieldType) {
    return explicitFieldType;
  }

  const rawType = String(item.type || '').trim();
  return rawType && rawType !== 'document' ? rawType : '';
};

const isStoredDocumentItem = (item) => Boolean(item?.documentId);

const isStoredFileItem = (item) => {
  if (!isStoredDocumentItem(item)) {
    return false;
  }

  const fieldType = getStoredFieldType(item);
  return fieldType ? fieldType === Document.TYPES.FILE : typeof item?.value === 'number';
};

const createStoredDocumentItem = (item, value) => {
  const fieldType = String(item?.fieldType || '').trim() || getStoredFieldType(item);

  return {
    id: item.id,
    itemType: 'document',
    documentId: Number(item.documentId),
    title: String(item.title || '').trim(),
    type: fieldType || null,
    typeLabel: item.typeLabel || item.fieldTypeLabel || (fieldType ? Document.TYPE_LABELS[fieldType] || fieldType : null),
    fieldType: fieldType || null,
    fieldTypeLabel: item.fieldTypeLabel || item.typeLabel || (fieldType ? Document.TYPE_LABELS[fieldType] || fieldType : null),
    category: item.category || null,
    categoryLabel: item.categoryLabel || (item.category ? Document.CATEGORY_LABELS[item.category] || item.category : '-'),
    required: Boolean(item.required),
    help: item.help || '',
    mimes: item.mimes || null,
    max: item.max ? Number(item.max) : null,
    value: fieldType === Document.TYPES.FILE
      ? (value == null || value === '' ? null : Number(value))
      : (value ?? null)
  };
};

const mergeFileEntriesIntoStages = (formData, fileEntries) => {
  const stages = Array.isArray(formData?.stages) ? formData.stages : [];

  const merged = stages.map((stage) => ({
    ...stage,
    items: (Array.isArray(stage?.items) ? stage.items : []).map((item) => {
      if (isStoredDocumentItem(item)) {
        const key = `field_${item.documentId}`;
        const fileEntry = fileEntries[key];
        return createStoredDocumentItem(item, fileEntry ?? item.value ?? null);
      }
      return item;
    })
  }));

  return normalizeCustomerValidationStoredData({ stages: merged });
};

const mergeResubmitStages = (previousData, newFormData, fileEntries) => {
  const newStages = Array.isArray(newFormData?.stages) ? newFormData.stages : [];
  const prevStages = Array.isArray(previousData?.stages) ? previousData.stages : [];

  if (newStages.length) {
    return mergeFileEntriesIntoStages(newFormData, fileEntries);
  }

  if (prevStages.length && Object.keys(fileEntries).length) {
    return mergeFileEntriesIntoStages(previousData, fileEntries);
  }

  return normalizeCustomerValidationStoredData(previousData);
};

const splitName = (name) => {
  const normalized = String(name || '').trim();

  if (!normalized) {
    return { firstName: null, lastName: null };
  }

  const parts = normalized.split(/\s+/);

  if (parts.length === 1) {
    return { firstName: parts[0], lastName: null };
  }

  return {
    firstName: parts[0],
    lastName: parts.slice(1).join(' ')
  };
};

const getValidationCallbackUrl = (validationId) =>
  `${String(env.webBaseUrl || '').replace(/\/+$/, '')}/customer/validation-flow/${validationId}`;

const serializeInvoice = (invoice) => {
  if (!invoice) {
    return null;
  }

  return {
    id: invoice.id,
    status: invoice.status,
    statusLabel: paymentStatusLabel(invoice.status),
    transactionId: invoice.transactionId,
    paymentRef: invoice.paymentRef,
    amount: String(invoice.amount || 0),
    totalAmount: String(invoice.totalAmount || 0),
    paidAt: invoice.paidAt,
    createdAt: invoice.createdAt,
    updatedAt: invoice.updatedAt,
    paymentLink: invoice.data?.paymentLink || null
  };
};

const customerValidationInclude = [
  {
    model: Validation,
    as: 'validation',
    required: false,
    attributes: ['id', 'title', 'type', 'validFor', 'amount', 'available', 'description', 'stages']
  }
];

const extractUploadedFiles = (data) => {
  const files = [];
  const stages = Array.isArray(data?.stages) ? data.stages : [];

  for (const stage of stages) {
    for (const item of Array.isArray(stage?.items) ? stage.items : []) {
      if (isStoredFileItem(item) && item?.value != null) {
        if (typeof item.value === 'number') {
          files.push({
            key: `field_${item.documentId}`,
            fileId: item.value,
            fileName: item.title || `field_${item.documentId}`,
            url: null
          });
        } else if (typeof item.value === 'object' && item.value.fileId) {
          files.push({
            key: `field_${item.documentId}`,
            fileId: item.value.fileId,
            fileName: item.value.fileName || item.title || `field_${item.documentId}`,
            url: item.value.url || null,
            downloadUrl: item.value.downloadUrl || fileDownloadUrl(item.value.fileId)
          });
        }
      }
    }
  }

  return files;
};

const enrichCustomerData = async (data) => {
  if (!data || typeof data !== 'object') return data;
  const normalized = normalizeCustomerValidationStoredData(data);
  const stages = Array.isArray(normalized?.stages) ? normalized.stages : [];

  const fileIds = [];
  for (const stage of stages) {
    for (const item of Array.isArray(stage?.items) ? stage.items : []) {
      if (isStoredFileItem(item) && typeof item.value === 'number') {
        fileIds.push(item.value);
      }
    }
  }

  if (!fileIds.length) return normalized;

  const files = await File.findAll({ where: { id: [...new Set(fileIds)] } });
  const fileMap = new Map(files.map((f) => [Number(f.id), f]));

  return {
    ...normalized,
    stages: stages.map((stage) => ({
      ...stage,
      items: (Array.isArray(stage?.items) ? stage.items : []).map((item) => {
        if (isStoredFileItem(item) && typeof item.value === 'number') {
          const file = fileMap.get(item.value);
          if (file) {
            return {
              ...item,
              value: {
                fileId: file.id,
                fileName: file.data?.originalName || file.subject || `file-${file.id}`,
                url: fileUrl(file),
                downloadUrl: fileDownloadUrl(file.id)
              }
            };
          }
        }
        return item;
      })
    }))
  };
};

const serializeForCustomer = async (item) => {
  const raw = typeof item?.toJSON === 'function' ? item.toJSON() : item;
  const enrichedData = await enrichCustomerData(raw.data);
  let adminAttachmentUrl = null;
  let adminAttachmentFileName = null;
  let adminAttachmentDownloadUrl = null;

  if (raw.adminAttachmentId) {
    const adminAttachmentFile = await File.findByPk(raw.adminAttachmentId);
    if (adminAttachmentFile) {
      adminAttachmentUrl = fileUrl(adminAttachmentFile);
      adminAttachmentDownloadUrl = fileDownloadUrl(adminAttachmentFile.id);
      adminAttachmentFileName = adminAttachmentFile.data?.originalName || `file-${adminAttachmentFile.id}`;
    }
  }

  const validation = raw.validation
    ? {
        id: raw.validation.id,
        title: raw.validation.title,
        type: raw.validation.type,
        validFor: raw.validation.validFor,
        validForLabel: formatValidForLabel(raw.validation.validFor),
        amount: String(raw.validation.amount || 0),
        description: raw.validation.description || null
      }
    : null;

  const result = {
    id: raw.id,
    validationId: raw.validationId,
    status: raw.status,
    statusLabel: CustomerValidation.STATUS_LABELS[raw.status] || raw.status,
    statusColor: CustomerValidation.STATUS_COLORS[raw.status] || '#6b7280',
    data: enrichedData || null,
    result: raw.result || null,
    paidAmount: String(raw.paidAmount || 0),
    expiresAt: raw.expiresAt,
    expiresAtLabel: formatDateLabel(raw.expiresAt),
    validationTitle: validation?.title || '-',
    validationType: validation?.type || '-',
    validationDescription: validation?.description || null,
    validationValidFor: validation?.validFor ?? null,
    validationValidForLabel: validation?.validForLabel || null,
    validationAmount: validation?.amount || '0',
    validation,
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt,
    createdAtLabel: formatDateLabel(raw.createdAt),
    updatedAtLabel: formatDateLabel(raw.updatedAt),
    selfValidation: Boolean(raw.selfValidation),
    selfValidationLabel: Boolean(raw.selfValidation) ? 'توسط مشتری' : 'توسط دیجی وام',
    adminAttachmentId: raw.adminAttachmentId || null,
    adminAttachmentUrl,
    adminAttachmentDownloadUrl,
    adminAttachmentFileName,
    canResubmit: [CustomerValidation.STATUSES.REJECTED, CustomerValidation.STATUSES.EXPIRED].includes(raw.status),
    uploadedFiles: extractUploadedFiles(enrichedData)
  };

  return result;
};

const buildUploadedFileEntries = async ({ files, customerValidationId, transaction, replaceExisting = false }) => {
  const fileEntries = {};

  for (const file of normalizeRequestFiles(files)) {
    const relativePath = path.relative(uploadsDir, file.path).replace(/\\/g, '/');
    const payload = {
      fileableType: 'customer_validation',
      fileableId: customerValidationId,
      subject: file.fieldname,
      path: relativePath,
      mimeType: file.mimetype,
      size: file.size,
      disk: 'local',
      status: 'processed',
      data: { originalName: file.originalname }
    };

    let fileRecord;

    if (replaceExisting) {
      const existing = await File.findOne({
        where: {
          fileableType: 'customer_validation',
          fileableId: customerValidationId,
          subject: file.fieldname
        },
        transaction
      });

      if (existing) {
        await existing.update(payload, { transaction });
        fileRecord = existing;
      }
    }

    if (!fileRecord) {
      fileRecord = await File.create(payload, { transaction });
    }

    fileEntries[file.fieldname] = fileRecord.id;
  }

  return fileEntries;
};

const getPaidInvoiceForValidation = async ({ invoiceId, customerId, validationId, amount }) => {
  if (!invoiceId) {
    return null;
  }

  const invoice = await Invoice.findOne({
    where: {
      id: Number(invoiceId),
      userId: customerId,
      payableType: VALIDATION_INVOICE_PAYABLE_TYPE,
      payableId: validationId,
      status: PaymentStatus.PAID
    }
  });

  if (!invoice) {
    return null;
  }

  if (normalizeMoneyAmount(invoice.amount) !== normalizeMoneyAmount(amount)) {
    return null;
  }

  return invoice;
};

const buildCustomerValidationSummary = async (customerId) => {
  const where = { customerId };
  const [total, submit, pending, approved, rejected, expired] = await Promise.all([
    CustomerValidation.count({ where }),
    CustomerValidation.count({ where: { ...where, status: CustomerValidation.STATUSES.SUBMIT } }),
    CustomerValidation.count({ where: { ...where, status: CustomerValidation.STATUSES.PENDING } }),
    CustomerValidation.count({ where: { ...where, status: CustomerValidation.STATUSES.APPROVED } }),
    CustomerValidation.count({ where: { ...where, status: CustomerValidation.STATUSES.REJECTED } }),
    CustomerValidation.count({ where: { ...where, status: CustomerValidation.STATUSES.EXPIRED } })
  ]);

  return { total, submit, pending, approved, rejected, expired };
};

export const listMyValidations = async (req, res, next) => {
  try {
    const { page, limit } = getPagination(req.query);
    const baseWhere = { customerId: req.auth.sub };
    const where = { ...baseWhere };

    if (req.query.status && Object.values(CustomerValidation.STATUSES).includes(req.query.status)) {
      where.status = req.query.status === CustomerValidation.STATUSES.PENDING
        ? {
            [Op.in]: [CustomerValidation.STATUSES.SUBMIT, CustomerValidation.STATUSES.PENDING]
          }
        : req.query.status;
    }

    const [{ rows, count }, summary] = await Promise.all([
      CustomerValidation.findAndCountAll({
        where,
        include: customerValidationInclude,
        order: [['createdAt', 'DESC'], ['id', 'DESC']],
        limit,
        offset: (page - 1) * limit,
        distinct: true
      }),
      buildCustomerValidationSummary(req.auth.sub)
    ]);

    return res.status(200).json(
      createPaginationResult({
        items: await Promise.all(rows.map(serializeForCustomer)),
        total: count,
        page,
        limit,
        extra: { summary }
      })
    );
  } catch (error) {
    return next(error);
  }
};

export const getMyValidation = async (req, res, next) => {
  try {
    const item = await CustomerValidation.findOne({
      where: { id: req.params.id, customerId: req.auth.sub },
      include: customerValidationInclude
    });

    if (!item) {
      return res.status(404).json({ message: 'اعتبارسنجی یافت نشد' });
    }

    return res.status(200).json({ item: await serializeForCustomer(item) });
  } catch (error) {
    return next(error);
  }
};

export const getValidationStatus = async (req, res, next) => {
  try {
    const validationId = Number(req.params.validationId);

    if (!validationId) {
      return res.status(422).json({ message: 'شناسه اعتبارسنجی نامعتبر است' });
    }

    const existing = await CustomerValidation.findOne({
      where: {
        customerId: req.auth.sub,
        validationId
      },
      include: customerValidationInclude,
      order: [['createdAt', 'DESC'], ['id', 'DESC']]
    });

    if (existing) {
      return res.status(200).json({
        hasRecord: true,
        item: await serializeForCustomer(existing)
      });
    }

    return res.status(200).json({ hasRecord: false, item: null });
  } catch (error) {
    return next(error);
  }
};

export const getValidationStages = async (req, res, next) => {
  try {
    const validationId = Number(req.params.validationId);

    if (!validationId) {
      return res.status(422).json({ message: 'شناسه اعتبارسنجی نامعتبر است' });
    }

    const stages = await getValidationStagesForCustomer(validationId);

    if (!stages) {
      return res.status(404).json({ message: 'اعتبارسنجی یافت نشد' });
    }

    return res.status(200).json(stages);
  } catch (error) {
    return next(error);
  }
};

export const startValidationPayment = async (req, res, next) => {
  try {
    const validationId = Number(req.body.validationId);

    if (!validationId) {
      return res.status(422).json({ message: 'شناسه اعتبارسنجی نامعتبر است' });
    }

    const validation = await Validation.findByPk(validationId, {
      attributes: ['id', 'title', 'amount', 'available']
    });

    if (!validation || !validation.available) {
      return res.status(404).json({ message: 'اعتبارسنجی یافت نشد یا غیرفعال است' });
    }

    const existingActive = await CustomerValidation.findOne({
      where: {
        customerId: req.auth.sub,
        validationId,
        status: {
          [Op.in]: [
            CustomerValidation.STATUSES.SUBMIT,
            CustomerValidation.STATUSES.PENDING,
            CustomerValidation.STATUSES.APPROVED
          ]
        }
      },
      order: [['createdAt', 'DESC'], ['id', 'DESC']]
    });

    if (existingActive) {
      return res.status(422).json({
        message: 'برای این اعتبارسنجی قبلا درخواست فعال ثبت شده است',
        existingId: existingActive.id,
        existingStatus: existingActive.status
      });
    }

    const amount = normalizeMoneyAmount(validation.amount);

    if (amount <= 0) {
      return res.status(422).json({ message: 'این اعتبارسنجی نیاز به پرداخت ندارد' });
    }

    const customer = await Customer.findByPk(req.auth.sub, {
      attributes: ['id', 'name', 'phone', 'nationalCode']
    });

    if (!customer) {
      return res.status(404).json({ message: 'مشتری یافت نشد' });
    }

    const { firstName, lastName } = splitName(customer.name);
    const payment = Payment.make(
      new Zarin({
        holderType: 'customer',
        holderId: customer.id,
        phone: customer.phone,
        description: `پرداخت هزینه اعتبارسنجی ${validation.title}`
      })
    )
      .amount(amount)
      .syncData(
        {
          firstName,
          lastName,
          nationalCode: customer.nationalCode || null
        },
        {
          customerId: customer.id,
          validationId: validation.id,
          source: VALIDATION_INVOICE_PAYABLE_TYPE
        }
      );

    const driver = await payment.makeInvoice(Invoice.build(), {
      userId: customer.id,
      ip: req.ip,
      payableType: VALIDATION_INVOICE_PAYABLE_TYPE,
      payableId: validation.id
    });

    await driver.execute(
      {
        description: `پرداخت هزینه اعتبارسنجی ${validation.title}`,
        mobile: customer.phone
      },
      getValidationCallbackUrl(validation.id)
    );

    return res.status(201).json({
      message: 'لینک پرداخت ایجاد شد',
      paymentLink: driver.getPaymentLink(),
      invoice: serializeInvoice(driver.getInvoice())
    });
  } catch (error) {
    return next(error);
  }
};

export const verifyValidationPayment = async (req, res, next) => {
  try {
    const validationId = Number(req.body.validationId);
    const authority = toEnglishDigits(String(req.body.Authority || '')).trim();
    const callbackStatus = String(req.body.Status || '').trim().toUpperCase();

    if (!validationId || !authority) {
      return res.status(422).json({ message: 'اطلاعات بازگشت پرداخت نامعتبر است' });
    }

    const invoice = await Invoice.findOne({
      where: {
        transactionId: authority,
        userId: req.auth.sub,
        payableType: VALIDATION_INVOICE_PAYABLE_TYPE,
        payableId: validationId
      },
      order: [['id', 'DESC']]
    });

    if (!invoice) {
      return res.status(404).json({ message: 'فاکتور پرداخت یافت نشد' });
    }

    if (invoice.status === PaymentStatus.PAID) {
      return res.status(200).json({
        paid: true,
        message: 'این پرداخت قبلا تایید شده است',
        invoice: serializeInvoice(invoice)
      });
    }

    if (callbackStatus !== 'OK') {
      if (invoice.status === PaymentStatus.PENDING) {
        invoice.status = PaymentStatus.ERROR;
        invoice.data = {
          ...(invoice.data || {}),
          callbackStatus
        };
        await invoice.save();
      }

      return res.status(200).json({
        paid: false,
        message: 'پرداخت توسط کاربر لغو شد یا ناموفق بود',
        invoice: serializeInvoice(invoice)
      });
    }

    const validation = await Validation.findByPk(validationId, {
      attributes: ['id', 'title', 'amount']
    });

    const driver = await Payment.make(
      new Zarin({
        holderType: 'customer',
        holderId: req.auth.sub,
        phone: req.auth.phone,
        description: `پرداخت هزینه اعتبارسنجی ${validation?.title || ''}`.trim()
      })
    ).getInvoice(invoice);

    await driver.verify({ authority });

    if (driver.isSuccessful()) {
      await driver.success();
    }

    await invoice.reload();

    let customerValidationRecord = null;

    if (driver.isSuccessful()) {
      const existingActive = await CustomerValidation.findOne({
        where: {
          customerId: req.auth.sub,
          validationId,
          status: {
            [Op.in]: [
              CustomerValidation.STATUSES.SUBMIT,
              CustomerValidation.STATUSES.PENDING,
              CustomerValidation.STATUSES.APPROVED
            ]
          }
        }
      });

      if (!existingActive) {
        customerValidationRecord = await sequelize.transaction(async (transaction) => {
          const record = await CustomerValidation.create(
            {
              customerId: req.auth.sub,
              validationId,
              status: CustomerValidation.STATUSES.SUBMIT,
              data: null,
              paidAmount: normalizeMoneyAmount(invoice.amount),
              expiresAt: null
            },
            { transaction }
          );

          await invoice.update(
            {
              data: {
                ...(invoice.data || {}),
                customerValidationId: record.id,
                validationSubmittedAt: new Date().toISOString()
              }
            },
            { transaction }
          );

          return record;
        });
      } else {
        customerValidationRecord = existingActive;
      }
    }

    return res.status(200).json({
      paid: driver.isSuccessful(),
      message: driver.isSuccessful() ? 'پرداخت با موفقیت انجام شد' : 'پرداخت تایید نشد',
      invoice: serializeInvoice(invoice),
      customerValidationId: customerValidationRecord?.id || null
    });
  } catch (error) {
    return next(error);
  }
};

export const submitValidation = async (req, res, next) => {
  try {
    const validationId = Number(req.body.validationId);

    if (!validationId) {
      return res.status(422).json({ message: 'شناسه اعتبارسنجی نامعتبر است' });
    }

    const validation = await Validation.findByPk(validationId, {
      attributes: ['id', 'title', 'amount', 'available']
    });

    if (!validation || !validation.available) {
      return res.status(404).json({ message: 'اعتبارسنجی یافت نشد یا غیرفعال است' });
    }

    const existingActive = await CustomerValidation.findOne({
      where: {
        customerId: req.auth.sub,
        validationId,
        status: {
          [Op.in]: [
            CustomerValidation.STATUSES.SUBMIT,
            CustomerValidation.STATUSES.PENDING,
            CustomerValidation.STATUSES.APPROVED
          ]
        }
      }
    });

    if (existingActive) {
      return res.status(422).json({
        message: 'شما قبلا این اعتبارسنجی را ثبت کرده اید',
        existingId: existingActive.id,
        existingStatus: existingActive.status
      });
    }

    const validationAmount = normalizeMoneyAmount(validation.amount);
    const formData = parseRequestData(req.body.data);
    const invoiceId = req.body.invoiceId ? Number(req.body.invoiceId) : null;
    const invoice = validationAmount > 0
      ? await getPaidInvoiceForValidation({
          invoiceId,
          customerId: req.auth.sub,
          validationId,
          amount: validationAmount
        })
      : null;

    if (validationAmount > 0 && !invoice) {
      return res.status(422).json({ message: 'ابتدا پرداخت اعتبارسنجی را با موفقیت انجام دهید' });
    }

    if (invoice?.data?.customerValidationId) {
      return res.status(422).json({ message: 'این پرداخت قبلا برای ثبت اعتبارسنجی استفاده شده است' });
    }

    const record = await sequelize.transaction(async (transaction) => {
      const customerValidation = await CustomerValidation.create(
        {
          customerId: req.auth.sub,
          validationId,
          status: CustomerValidation.STATUSES.PENDING,
          data: formData,
          paidAmount: invoice ? normalizeMoneyAmount(invoice.amount) : null,
          expiresAt: null
        },
        { transaction }
      );

      const fileEntries = await buildUploadedFileEntries({
        files: req.files,
        customerValidationId: customerValidation.id,
        transaction
      });

      const stagesData = mergeFileEntriesIntoStages(formData, fileEntries);
      await customerValidation.update({ data: stagesData }, { transaction });

      if (invoice) {
        await invoice.update(
          {
            data: {
              ...(invoice.data || {}),
              customerValidationId: customerValidation.id,
              validationSubmittedAt: new Date().toISOString()
            }
          },
          { transaction }
        );
      }

      return customerValidation;
    });

    const fresh = await CustomerValidation.findByPk(record.id, {
      include: customerValidationInclude
    });

    return res.status(201).json({
      message: 'اعتبارسنجی شما با موفقیت ثبت شد و در انتظار بررسی است',
      item: await serializeForCustomer(fresh)
    });
  } catch (error) {
    return next(error);
  }
};

export const resubmitValidation = async (req, res, next) => {
  try {
    const record = await CustomerValidation.findOne({
      where: {
        id: req.params.id,
        customerId: req.auth.sub,
        status: CustomerValidation.STATUSES.REJECTED
      }
    });

    if (!record) {
      return res.status(404).json({ message: 'اعتبارسنجی رد شده ای یافت نشد' });
    }

    const formData = parseRequestData(req.body.data);
    const previousData = record.data && typeof record.data === 'object' ? record.data : {};

    await sequelize.transaction(async (transaction) => {
      const fileEntries = await buildUploadedFileEntries({
        files: req.files,
        customerValidationId: record.id,
        transaction,
        replaceExisting: true
      });

      const mergedStages = mergeResubmitStages(previousData, formData, fileEntries);
      await record.update(
        {
          data: mergedStages,
          status: CustomerValidation.STATUSES.PENDING,
          result: null
        },
        { transaction }
      );
    });

    const fresh = await CustomerValidation.findByPk(record.id, {
      include: customerValidationInclude
    });

    return res.status(200).json({
      message: 'اعتبارسنجی مجدد ثبت شد و در انتظار بررسی است',
      item: await serializeForCustomer(fresh)
    });
  } catch (error) {
    return next(error);
  }
};

export const initValidation = async (req, res, next) => {
  try {
    const validationId = Number(req.body.validationId);

    if (!validationId) {
      return res.status(422).json({ message: 'شناسه اعتبارسنجی نامعتبر است' });
    }

    const validation = await Validation.findByPk(validationId, {
      attributes: ['id', 'title', 'amount', 'available']
    });

    if (!validation || !validation.available) {
      return res.status(404).json({ message: 'اعتبارسنجی یافت نشد یا غیرفعال است' });
    }

    const existingActive = await CustomerValidation.findOne({
      where: {
        customerId: req.auth.sub,
        validationId,
        status: {
          [Op.in]: [
            CustomerValidation.STATUSES.SUBMIT,
            CustomerValidation.STATUSES.PENDING,
            CustomerValidation.STATUSES.APPROVED
          ]
        }
      },
      order: [['createdAt', 'DESC'], ['id', 'DESC']]
    });

    if (existingActive) {
      return res.status(200).json({
        message: 'درخواست فعال قبلی وجود دارد',
        customerValidationId: existingActive.id
      });
    }

    const amount = normalizeMoneyAmount(validation.amount);

    if (amount > 0) {
      return res.status(422).json({ message: 'این اعتبارسنجی نیاز به پرداخت دارد. ابتدا پرداخت را انجام دهید' });
    }

    const record = await CustomerValidation.create({
      customerId: req.auth.sub,
      validationId,
      status: CustomerValidation.STATUSES.SUBMIT,
      data: null,
      paidAmount: null,
      expiresAt: null
    });

    return res.status(201).json({
      message: 'اعتبارسنجی شروع شد',
      customerValidationId: record.id
    });
  } catch (error) {
    return next(error);
  }
};

export const saveStage = async (req, res, next) => {
  try {
    const record = await CustomerValidation.findOne({
      where: {
        id: req.params.id,
        customerId: req.auth.sub,
        status: [CustomerValidation.STATUSES.SUBMIT,CustomerValidation.STATUSES.REJECTED]
      }
    });

    if (!record) {
      return res.status(404).json({ message: 'اعتبارسنجی در حال تکمیل یافت نشد' });
    }

    const stageIndex = Number(req.body.stageIndex);

    if (!Number.isFinite(stageIndex) || stageIndex < 0) {
      return res.status(422).json({ message: 'شماره مرحله نامعتبر است' });
    }

    const validation = await getValidationStagesForCustomer(record.validationId);

    if (!validation) {
      return res.status(404).json({ message: 'اعتبارسنجی یافت نشد' });
    }

    const definedStages = Array.isArray(validation.stages) ? validation.stages : [];

    if (stageIndex >= definedStages.length) {
      return res.status(422).json({ message: 'شماره مرحله خارج از محدوده است' });
    }

    const stageItems = Array.isArray(definedStages[stageIndex]?.items)
      ? definedStages[stageIndex].items
      : [];

    const existingData = record.data && typeof record.data === 'object' ? record.data : {};
    const existingStages = Array.isArray(existingData.stages) ? [...existingData.stages] : [];

    while (existingStages.length <= stageIndex) {
      const idx = existingStages.length;
      existingStages.push({
        id: `stage-${idx + 1}`,
        title: String(definedStages[idx]?.title || '').trim() || `مرحله ${idx + 1}`,
        description: String(definedStages[idx]?.description || '').trim() || null,
        items: []
      });
    }

    const fieldValues = parseRequestData(req.body.fields);

    await sequelize.transaction(async (transaction) => {
      const fileEntries = await buildUploadedFileEntries({
        files: req.files,
        customerValidationId: record.id,
        transaction,
        replaceExisting: true
      });

      const updatedItems = stageItems.map((item, itemIndex) => {
        if (item?.type !== 'document' || !item.documentId) {
          return {
            id: `stage-${stageIndex + 1}-item-${itemIndex + 1}`,
            type: item?.type || 'description',
            title: item?.title || '',
            description: item?.description || ''
          };
        }

        const fieldKey = `field_${item.documentId}`;
        const fileEntry = fileEntries[fieldKey];
        const textValue = fieldValues[fieldKey];

        const existingItem = (existingStages[stageIndex]?.items || [])
          .find((ei) => ei?.documentId === item.documentId);

        let value = existingItem?.value ?? null;

        if (fileEntry) {
          value = fileEntry;
        } else if (textValue !== undefined && textValue !== null) {
          value = textValue;
        }

        return createStoredDocumentItem(
          {
            ...item,
            id: item.id || `stage-${stageIndex + 1}-item-${itemIndex + 1}`
          },
          value
        );
      });

      existingStages[stageIndex] = {
        ...existingStages[stageIndex],
        items: updatedItems
      };

      await record.update({ data: normalizeCustomerValidationStoredData({ stages: existingStages }) }, { transaction });
    });

    return res.status(200).json({ message: 'مرحله ذخیره شد' });
  } catch (error) {
    return next(error);
  }
};

export const finalizeValidation = async (req, res, next) => {
  try {
    const record = await CustomerValidation.findOne({
      where: {
        id: req.params.id,
        customerId: req.auth.sub,
        status: CustomerValidation.STATUSES.SUBMIT
      }
    });

    if (!record) {
      return res.status(404).json({ message: 'اعتبارسنجی در حال تکمیل یافت نشد' });
    }

    await record.update({ status: CustomerValidation.STATUSES.PENDING });

    const fresh = await CustomerValidation.findByPk(record.id, {
      include: customerValidationInclude
    });

    return res.status(200).json({
      message: 'اعتبارسنجی شما با موفقیت ثبت شد و در انتظار بررسی است',
      item: await serializeForCustomer(fresh)
    });
  } catch (error) {
    return next(error);
  }
};

export const submitSelfValidation = async (req, res, next) => {
  try {
    const validationId = Number(req.body.validationId);

    if (!validationId) {
      return res.status(422).json({ message: 'شناسه اعتبارسنجی نامعتبر است' });
    }

    const validation = await Validation.findByPk(validationId, {
      attributes: ['id', 'title', 'amount', 'available', 'selfValidation']
    });

    if (!validation || !validation.available) {
      return res.status(404).json({ message: 'اعتبارسنجی یافت نشد یا غیرفعال است' });
    }

    if (!validation.selfValidation) {
      return res.status(422).json({ message: 'این اعتبارسنجی امکان ارسال توسط مشتری را ندارد' });
    }

    const existingActive = await CustomerValidation.findOne({
      where: {
        customerId: req.auth.sub,
        validationId,
        status: {
          [Op.in]: [
            CustomerValidation.STATUSES.SUBMIT,
            CustomerValidation.STATUSES.PENDING,
            CustomerValidation.STATUSES.APPROVED
          ]
        }
      }
    });

    if (existingActive) {
      return res.status(422).json({
        message: 'شما قبلا این اعتبارسنجی را ثبت کرده اید',
        existingId: existingActive.id,
        existingStatus: existingActive.status
      });
    }

    const rejectedRecord = await CustomerValidation.findOne({
      where: {
        customerId: req.auth.sub,
        validationId,
        selfValidation: true,
        status: CustomerValidation.STATUSES.REJECTED
      },
      order: [['updatedAt', 'DESC'], ['id', 'DESC']]
    });

    const uploadedFile = Array.isArray(req.files) ? req.files[0] : null;

    if (!uploadedFile) {
      return res.status(422).json({ message: 'بارگذاری فایل گزارش الزامی است' });
    }

    const { record, reusedRejectedRecord } = await sequelize.transaction(async (transaction) => {
      let customerValidation = rejectedRecord;

      if (customerValidation) {
        await customerValidation.update(
          {
            status: CustomerValidation.STATUSES.PENDING,
            result: null,
            selfValidation: true,
            data: null,
            paidAmount: null,
            expiresAt: null
          },
          { transaction }
        );
      } else {
        customerValidation = await CustomerValidation.create(
          {
            customerId: req.auth.sub,
            validationId,
            status: CustomerValidation.STATUSES.PENDING,
            selfValidation: true,
            data: null,
            paidAmount: null,
            expiresAt: null
          },
          { transaction }
        );
      }

      const relativePath = path.relative(uploadsDir, uploadedFile.path).replace(/\\/g, '/');
      const filePayload = {
        fileableType: 'customer_validation',
        fileableId: customerValidation.id,
        subject: 'self_validation',
        path: relativePath,
        mimeType: uploadedFile.mimetype,
        size: uploadedFile.size,
        disk: 'local',
        status: 'processed',
        data: { originalName: uploadedFile.originalname }
      };

      let fileRecord = null;

      if (customerValidation.selfValidationFileId) {
        fileRecord = await File.findByPk(customerValidation.selfValidationFileId, { transaction });
      }

      if (!fileRecord) {
        fileRecord = await File.findOne({
          where: {
            fileableType: 'customer_validation',
            fileableId: customerValidation.id,
            subject: 'self_validation'
          },
          transaction
        });
      }

      if (fileRecord) {
        await fileRecord.update(filePayload, { transaction });
      } else {
        fileRecord = await File.create(filePayload, { transaction });
      }

      await customerValidation.update(
        { selfValidationFileId: fileRecord.id },
        { transaction }
      );

      return {
        record: customerValidation,
        reusedRejectedRecord: Boolean(rejectedRecord)
      };
    });

    const fresh = await CustomerValidation.findByPk(record.id, {
      include: customerValidationInclude
    });

    return res.status(reusedRejectedRecord ? 200 : 201).json({
      message: reusedRejectedRecord
        ? 'گزارش اعتبارسنجی شما بروزرسانی شد و در انتظار بررسی است'
        : 'گزارش اعتبارسنجی شما با موفقیت ثبت شد و در انتظار بررسی است',
      item: await serializeForCustomer(fresh)
    });
  } catch (error) {
    return next(error);
  }
};