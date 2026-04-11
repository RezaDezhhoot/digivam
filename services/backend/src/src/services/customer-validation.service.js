import { Op } from 'sequelize';
import { Customer } from '../models/customer.model.js';
import { CustomerValidation } from '../models/customer-validation.model.js';
import { File } from '../models/file.model.js';
import { Validation } from '../models/validation.model.js';
import { Document } from '../models/document.model.js';
import { env } from '../config/env.js';
import { createPaginationResult } from '../utils/pagination.js';

const normalizeSearch = (value) => String(value || '').trim();

const customerValidationInclude = [
  {
    model: Customer,
    as: 'customer',
    required: false,
    attributes: ['id', 'name', 'phone', 'email', 'nationalCode', 'birthdate']
  },
  {
    model: Validation,
    as: 'validation',
    required: false,
    attributes: ['id', 'title', 'type', 'validFor', 'amount', 'available', 'description', 'stages']
  }
];

const formatDate = (value) =>
  value ? new Date(value).toLocaleString('fa-IR', { dateStyle: 'short', timeStyle: 'short' }) : '-';

const formatValidForLabel = (value) => {
  const days = Number(value || 0);
  return days > 0 ? `${days} روز اعتبار` : 'بدون انقضا';
};

const buildFileUrl = (filePath) => {
  if (!filePath) return null;
  const raw = String(filePath).replace(/\\/g, '/');
  if (/^https?:\/\//i.test(raw)) return raw;
  return `${env.backendBaseUrl}/uploads/${raw.replace(/^\/+/, '')}`;
};

const getStoredItemKind = (item) => {
  if (!item || typeof item !== 'object') {
    return '';
  }

  const explicitKind = String(item.itemType || '').trim();
  if (explicitKind) {
    return explicitKind;
  }

  if (item.documentId) {
    return 'document';
  }

  return String(item.type || '').trim();
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

const normalizeStoredValue = (item) => {
  const fieldType = getStoredFieldType(item);
  const value = item?.value;

  if (fieldType === Document.TYPES.FILE) {
    if (value == null || value === '') {
      return null;
    }

    if (typeof value === 'object' && value.fileId) {
      return Number(value.fileId);
    }

    const fileId = Number(value);
    return Number.isFinite(fileId) && fileId > 0 ? fileId : null;
  }

  if (value === undefined) {
    return null;
  }

  return value;
};

const normalizeStoredStageItem = (item) => {
  if (!item || typeof item !== 'object') {
    return item;
  }

  if (getStoredItemKind(item) !== 'document') {
    return {
      id: item.id,
      type: 'description',
      title: String(item.title || '').trim(),
      description: String(item.description || '').trim()
    };
  }

  const fieldType = getStoredFieldType(item);

  return {
    id: item.id,
    itemType: 'document',
    documentId: Number(item.documentId),
    title: String(item.title || '').trim(),
    type: fieldType || null,
    typeLabel: item.typeLabel || (fieldType ? Document.TYPE_LABELS[fieldType] || fieldType : null),
    fieldType: fieldType || null,
    fieldTypeLabel: item.fieldTypeLabel || (fieldType ? Document.TYPE_LABELS[fieldType] || fieldType : null),
    category: item.category || null,
    categoryLabel: item.categoryLabel || (item.category ? Document.CATEGORY_LABELS[item.category] || item.category : '-'),
    required: Boolean(item.required),
    help: item.help || '',
    mimes: item.mimes || null,
    max: item.max ? Number(item.max) : null,
    value: normalizeStoredValue(item)
  };
};

export const normalizeCustomerValidationStoredData = (data) => {
  if (!data || typeof data !== 'object') {
    return data;
  }

  const stages = Array.isArray(data.stages) ? data.stages : [];

  return {
    ...data,
    stages: stages.map((stage, stageIndex) => ({
      id: stage?.id || `stage-${stageIndex + 1}`,
      title: String(stage?.title || '').trim() || `مرحله ${stageIndex + 1}`,
      description: String(stage?.description || '').trim() || null,
      items: (Array.isArray(stage?.items) ? stage.items : [])
        .map(normalizeStoredStageItem)
        .filter(Boolean)
    }))
  };
};

const enrichDataWithFiles = async (data) => {
  if (!data || typeof data !== 'object') return data;
  const normalizedData = normalizeCustomerValidationStoredData(data);
  const stages = Array.isArray(normalizedData?.stages) ? normalizedData.stages : [];

  const fileIds = [];
  const documentIds = [];
  for (const stage of stages) {
    for (const item of Array.isArray(stage?.items) ? stage.items : []) {
      if (getStoredItemKind(item) === 'document' && item.documentId) {
        documentIds.push(Number(item.documentId));
      }

      if (getStoredItemKind(item) === 'document' && getStoredFieldType(item) === Document.TYPES.FILE && typeof item.value === 'number') {
        fileIds.push(item.value);
      }
    }
  }

  const [files, documents] = await Promise.all([
    fileIds.length ? File.findAll({ where: { id: [...new Set(fileIds)] } }) : Promise.resolve([]),
    documentIds.length ? Document.findAll({ where: { id: [...new Set(documentIds)] } }) : Promise.resolve([])
  ]);

  const fileMap = new Map(files.map((f) => [Number(f.id), f]));
  const documentMap = new Map(documents.map((document) => [Number(document.id), document]));

  return {
    ...normalizedData,
    stages: stages.map((stage) => ({
      ...stage,
      items: (Array.isArray(stage?.items) ? stage.items : []).map((item) => {
        if (getStoredItemKind(item) === 'document') {
          const document = documentMap.get(Number(item.documentId));
          const fieldType = getStoredFieldType(item) || document?.type || null;
          const enrichedItem = {
            ...item,
            title: item.title || document?.title || item.title || '',
            type: fieldType,
            typeLabel: item.typeLabel || (fieldType ? Document.TYPE_LABELS[fieldType] || fieldType : null),
            fieldType: fieldType,
            fieldTypeLabel: item.fieldTypeLabel || (fieldType ? Document.TYPE_LABELS[fieldType] || fieldType : null),
            category: item.category || document?.category || null,
            categoryLabel:
              item.categoryLabel ||
              (item.category || document?.category
                ? Document.CATEGORY_LABELS[item.category || document?.category] || item.category || document?.category
                : '-'),
            required: typeof item.required === 'boolean' ? item.required : Boolean(document?.required),
            help: item.help || document?.help || '',
            mimes: item.mimes || document?.mimes || null,
            max: item.max ? Number(item.max) : document?.max ? Number(document.max) : null
          };

          if (fieldType === Document.TYPES.FILE && typeof item.value === 'number') {
            const file = fileMap.get(item.value);
            if (file) {
              return {
                ...enrichedItem,
                value: {
                  fileId: file.id,
                  fileName: file.data?.originalName || file.subject || `file-${file.id}`,
                  url: buildFileUrl(file.path)
                }
              };
            }
          }

          return enrichedItem;
        }
        return item;
      })
    }))
  };
};

export const serializeCustomerValidation = async (item) => {
  const raw = typeof item?.toJSON === 'function' ? item.toJSON() : item;
  const enrichedData = await enrichDataWithFiles(raw.data);

  let selfValidationFileUrl = null;
  let selfValidationFileName = null;
  let adminAttachmentUrl = null;
  let adminAttachmentFileName = null;

  if (raw.selfValidationFileId) {
    const svFile = await File.findByPk(raw.selfValidationFileId);
    if (svFile) {
      selfValidationFileUrl = buildFileUrl(svFile.path);
      selfValidationFileName = svFile.data?.originalName || `file-${svFile.id}`;
    }
  }

  if (raw.adminAttachmentId) {
    const adminAttachmentFile = await File.findByPk(raw.adminAttachmentId);
    if (adminAttachmentFile) {
      adminAttachmentUrl = buildFileUrl(adminAttachmentFile.path);
      adminAttachmentFileName = adminAttachmentFile.data?.originalName || `file-${adminAttachmentFile.id}`;
    }
  }

  return {
    id: raw.id,
    customerId: raw.customerId,
    validationId: raw.validationId,
    status: raw.status,
    statusLabel: CustomerValidation.STATUS_LABELS[raw.status] || raw.status,
    statusColor: CustomerValidation.STATUS_COLORS[raw.status] || '#6b7280',
    data: enrichedData || null,
    result: raw.result || null,
    paidAmount: String(raw.paidAmount || 0),
    expiresAt: raw.expiresAt,
    expiresAtLabel: formatDate(raw.expiresAt),
    selfValidation: Boolean(raw.selfValidation),
    selfValidationFileId: raw.selfValidationFileId || null,
    selfValidationFileUrl,
    selfValidationFileName,
    adminAttachmentId: raw.adminAttachmentId || null,
    adminAttachmentUrl,
    adminAttachmentFileName,
    customer: raw.customer
      ? {
          id: raw.customer.id,
          name: raw.customer.name || `مشتری #${raw.customer.id}`,
          phone: raw.customer.phone || '-',
          email: raw.customer.email || '-',
          nationalCode: raw.customer.nationalCode || '-',
          birthdate: raw.customer.birthdate || null
        }
      : null,
    validation: raw.validation
      ? {
          id: raw.validation.id,
          title: raw.validation.title,
          type: raw.validation.type,
          validFor: raw.validation.validFor,
          validForLabel: formatValidForLabel(raw.validation.validFor),
          amount: String(raw.validation.amount || 0),
          description: raw.validation.description
        }
      : null,
    selfValidationLabel: Boolean(raw.selfValidation) ? 'توسط مشتری' : 'توسط دیجی وام',
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt,
    createdAtLabel: formatDate(raw.createdAt),
    updatedAtLabel: formatDate(raw.updatedAt)
  };
};

export const listCustomerValidations = async ({ where = {}, page = 1, limit = 10, order } = {}) => {
  const { rows, count } = await CustomerValidation.findAndCountAll({
    where,
    include: customerValidationInclude,
    order: order || [['createdAt', 'DESC'], ['id', 'DESC']],
    limit,
    offset: (page - 1) * limit,
    distinct: true
  });

  const items = await Promise.all(rows.map(serializeCustomerValidation));

  return createPaginationResult({
    items,
    total: count,
    page,
    limit
  });
};

export const findCustomerValidationById = async (id) => {
  const item = await CustomerValidation.findByPk(id, {
    include: customerValidationInclude
  });

  return item ? await serializeCustomerValidation(item) : null;
};

export const createCustomerValidationSummary = async (where = {}) => {
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

export const computeExpiresAt = (validation) => {
  if (!validation?.validFor) {
    return null;
  }

  const date = new Date();
  date.setDate(date.getDate() + Number(validation.validFor));
  return date;
};

export const buildAdminSearchWhere = (query = {}) => {
  const where = {};
  const search = normalizeSearch(query.search);

  if (query.status && Object.values(CustomerValidation.STATUSES).includes(query.status)) {
    where.status = query.status;
  }

  if (query.customerId) {
    where.customerId = Number(query.customerId);
  }

  if (query.validationId) {
    where.validationId = Number(query.validationId);
  }

  if (search) {
    where[Op.or] = [
      { result: { [Op.like]: `%${search}%` } },
      { '$customer.name$': { [Op.like]: `%${search}%` } },
      { '$customer.phone$': { [Op.like]: `%${search}%` } },
      { '$customer.national_code$': { [Op.like]: `%${search}%` } }
    ];
  }

  return where;
};

export const expireOutdatedValidations = async () => {
  const now = new Date();

  const [count] = await CustomerValidation.update(
    { status: CustomerValidation.STATUSES.EXPIRED },
    {
      where: {
        status: CustomerValidation.STATUSES.APPROVED,
        expiresAt: { [Op.lt]: now, [Op.ne]: null }
      }
    }
  );

  return count;
};

export const getValidationStagesForCustomer = async (validationId) => {
  const validation = await Validation.findByPk(validationId, {
    attributes: [
      'id',
      'title',
      'type',
      'validFor',
      'amount',
      'available',
      'description',
      'stages',
      'introTitle',
      'introDescription',
      'stepsLabel',
      'featureLines',
      'selfValidation',
      'selfValidationGuide',
      'selfValidationNote',
      'selfValidationUploadLabel'
    ]
  });

  if (!validation) {
    return null;
  }

  const stages = Array.isArray(validation.stages) ? validation.stages : [];

  const documentIds = stages
    .flatMap((stage) => (Array.isArray(stage?.items) ? stage.items : []))
    .filter((item) => item?.type === 'document')
    .map((item) => Number(item.documentId))
    .filter(Boolean);

  const documents = documentIds.length
    ? await Document.findAll({ where: { id: [...new Set(documentIds)] } })
    : [];
  const trainingVideo = await File.findOne({
    where: {
      fileableType: 'validation',
      fileableId: validation.id,
      subject: Validation.TRAINING_VIDEO_SUBJECT
    }
  });

  const documentMap = new Map(documents.map((d) => [Number(d.id), d]));

  const hydratedStages = stages.map((stage, stageIndex) => ({
    id: `stage-${stageIndex + 1}`,
    title: String(stage?.title || '').trim() || `مرحله ${stageIndex + 1}`,
    description: String(stage?.description || '').trim() || null,
    items: (Array.isArray(stage?.items) ? stage.items : [])
      .map((item, itemIndex) => {
        if (item?.type === 'document') {
          const doc = documentMap.get(Number(item.documentId));
          if (!doc) return null;
          return {
            id: `stage-${stageIndex + 1}-item-${itemIndex + 1}`,
            type: 'document',
            documentId: doc.id,
            title: doc.title,
            fieldType: doc.type,
            fieldTypeLabel: Document.TYPE_LABELS[doc.type] || doc.type,
            category: doc.category,
            categoryLabel: doc.category ? Document.CATEGORY_LABELS[doc.category] || doc.category : '-',
            required: Boolean(doc.required),
            help: doc.help || '',
            mimes: doc.mimes || null,
            max: doc.max ? Number(doc.max) : null
          };
        }

        if (item?.type === 'description') {
          return {
            id: `stage-${stageIndex + 1}-item-${itemIndex + 1}`,
            type: 'description',
            title: String(item?.title || '').trim(),
            description: String(item?.description || '').trim()
          };
        }

        return null;
      })
      .filter(Boolean)
  }));

  return {
    id: validation.id,
    title: validation.title,
    type: validation.type,
    validFor: validation.validFor,
    validForLabel: formatValidForLabel(validation.validFor),
    amount: String(validation.amount || 0),
    description: validation.description,
    introTitle: validation.introTitle || '',
    introDescription: validation.introDescription || '',
    stepsLabel: validation.stepsLabel || `${hydratedStages.length} مرحله ساده`,
    featureLines: Array.isArray(validation.featureLines) && validation.featureLines.length ? validation.featureLines : [],
    selfValidation: Boolean(validation.selfValidation),
    selfValidationGuide: validation.selfValidationGuide || '',
    selfValidationNote: validation.selfValidationNote || '',
    selfValidationUploadLabel: validation.selfValidationUploadLabel || 'بارگذاری فایل گزارش',
    trainingVideoUrl: trainingVideo ? buildFileUrl(trainingVideo.path) : null,
    stages: hydratedStages
  };
};
