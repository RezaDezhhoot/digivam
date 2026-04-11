import path from 'node:path';
import { Op } from 'sequelize';
import { env } from '../config/env.js';
import { sequelize } from '../config/database.js';
import { Document } from '../models/document.model.js';
import { File } from '../models/file.model.js';
import { Validation } from '../models/validation.model.js';
import { ValidationDocument } from '../models/validation-document.model.js';
import { createPaginationResult, getPagination } from '../utils/pagination.js';

const normalizeSearch = (value) => String(value || '').trim();
const uniqueIds = (items = []) => [...new Set(items.map((item) => Number(item)).filter(Boolean))];
const uploadsRoot = path.resolve(process.cwd(), 'src', 'uploads').replace(/\\/g, '/');

const VALIDATION_STAGE_ITEM_TYPES = {
  DOCUMENT: 'document',
  DESCRIPTION: 'description'
};

const validationInclude = [
  { model: File, as: 'trainingVideo', required: false }
];

const fileUrl = (file) => {
  if (!file) {
    return null;
  }

  const rawPath = String(file.path || '').replace(/\\/g, '/');

  if (/^https?:\/\//i.test(rawPath)) {
    return rawPath;
  }

  const relativePath = rawPath.startsWith(uploadsRoot)
    ? rawPath.slice(uploadsRoot.length).replace(/^\/+/, '')
    : rawPath.replace(/^\/+/, '');

  return `${env.backendBaseUrl}/uploads/${relativePath}`;
};

const normalizeDocumentIds = (value) => {
  if (Array.isArray(value)) {
    return uniqueIds(value);
  }

  const normalized = String(value || '').trim();

  if (!normalized) {
    return [];
  }

  try {
    const parsed = JSON.parse(normalized);
    return uniqueIds(Array.isArray(parsed) ? parsed : [normalized]);
  } catch {
    return uniqueIds([normalized]);
  }
};

const normalizeStagesInput = (value) => {
  if (Array.isArray(value)) {
    return value;
  }

  const normalized = String(value || '').trim();

  if (!normalized) {
    return [];
  }

  try {
    const parsed = JSON.parse(normalized);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const normalizeStageText = (value, limit = 10000) => String(value || '').trim().slice(0, limit) || null;

const normalizeValidationStages = (value, fallbackDocumentIds = []) => {
  const parsedStages = normalizeStagesInput(value)
    .map((stage) => {
      const title = normalizeStageText(stage?.title, 255);
      const description = normalizeStageText(stage?.description, 10000);
      const items = Array.isArray(stage?.items)
        ? stage.items
            .map((item) => {
              const type = String(item?.type || '').trim();

              if (type === VALIDATION_STAGE_ITEM_TYPES.DOCUMENT) {
                const documentId = Number(item?.documentId || 0);

                if (!documentId) {
                  return null;
                }

                return {
                  type,
                  documentId
                };
              }

              if (type !== VALIDATION_STAGE_ITEM_TYPES.DESCRIPTION) {
                return null;
              }

              const noteTitle = normalizeStageText(item?.title, 255);
              const noteDescription = normalizeStageText(item?.description, 10000);

              if (!noteTitle && !noteDescription) {
                return null;
              }

              return {
                type,
                title: noteTitle,
                description: noteDescription
              };
            })
            .filter(Boolean)
        : [];

      if (!title) {
        return null;
      }

      return {
        title,
        description,
        items
      };
    })
    .filter(Boolean);

  if (parsedStages.length) {
    return parsedStages;
  }

  const legacyDocumentIds = normalizeDocumentIds(fallbackDocumentIds);

  if (!legacyDocumentIds.length) {
    return [];
  }

  return [
    {
      title: 'مرحله 1',
      description: null,
      items: legacyDocumentIds.map((documentId) => ({
        type: VALIDATION_STAGE_ITEM_TYPES.DOCUMENT,
        documentId
      }))
    }
  ];
};

const collectStageDocumentIds = (stages = []) =>
  uniqueIds(
    stages.flatMap((stage) =>
      (Array.isArray(stage?.items) ? stage.items : [])
        .filter((item) => item?.type === VALIDATION_STAGE_ITEM_TYPES.DOCUMENT)
        .map((item) => item.documentId)
    )
  );

const hydrateStages = (stages = [], documents = []) => {
  const documentMap = new Map(documents.map((item) => [Number(item.id), item]));

  return stages.map((stage, stageIndex) => ({
    id: `stage-${stageIndex + 1}`,
    title: normalizeStageText(stage?.title, 255) || `مرحله ${stageIndex + 1}`,
    description: normalizeStageText(stage?.description, 10000),
    items: (Array.isArray(stage?.items) ? stage.items : [])
      .map((item, itemIndex) => {
        if (item?.type === VALIDATION_STAGE_ITEM_TYPES.DOCUMENT) {
          const documentId = Number(item.documentId || 0);
          const document = documentMap.get(documentId);

          if (!document) {
            return null;
          }

          return {
            id: `stage-${stageIndex + 1}-document-${itemIndex + 1}`,
            type: VALIDATION_STAGE_ITEM_TYPES.DOCUMENT,
            documentId,
            document
          };
        }

        if (item?.type !== VALIDATION_STAGE_ITEM_TYPES.DESCRIPTION) {
          return null;
        }

        return {
          id: `stage-${stageIndex + 1}-description-${itemIndex + 1}`,
          type: VALIDATION_STAGE_ITEM_TYPES.DESCRIPTION,
          title: normalizeStageText(item?.title, 255),
          description: normalizeStageText(item?.description, 10000)
        };
      })
      .filter(Boolean)
  }));
};

const createLegacyStages = (documents = []) => {
  if (!documents.length) {
    return [];
  }

  return hydrateStages(
    [
      {
        title: 'مرحله 1',
        description: null,
        items: documents.map((document) => ({
          type: VALIDATION_STAGE_ITEM_TYPES.DOCUMENT,
          documentId: document.id
        }))
      }
    ],
    documents
  );
};

const serializeDocumentSummary = (item, sort = 0) => ({
  id: item.id,
  title: item.title,
  type: item.type,
  typeLabel: Document.TYPE_LABELS[item.type] || item.type,
  subject: item.subject,
  subjectLabel: item.subject ? Document.SUBJECT_LABELS[item.subject] || item.subject : '-',
  category: item.category,
  categoryLabel: item.category ? Document.CATEGORY_LABELS[item.category] || item.category : '-',
  required: Boolean(item.required),
  sort
});

const buildDocumentMapForValidations = async (validationIds = []) => {
  if (!validationIds.length) {
    return new Map();
  }

  const links = await ValidationDocument.findAll({
    where: { validationId: validationIds },
    order: [['sort', 'ASC'], ['id', 'ASC']]
  });

  const documentIds = uniqueIds(links.map((item) => item.documentId));
  const documents = documentIds.length
    ? await Document.findAll({ where: { id: documentIds } })
    : [];
  const documentMap = new Map(documents.map((item) => [Number(item.id), item]));
  const validationMap = new Map();

  validationIds.forEach((id) => validationMap.set(Number(id), []));

  links.forEach((link) => {
    const list = validationMap.get(Number(link.validationId)) || [];
    const document = documentMap.get(Number(link.documentId));

    if (document) {
      list.push(serializeDocumentSummary(document, Number(link.sort || 0)));
    }

    validationMap.set(Number(link.validationId), list);
  });

  return validationMap;
};

const serializeValidation = (item, documents = []) => {
  const stages = Array.isArray(item?.stages) && item.stages.length
    ? hydrateStages(item.stages, documents)
    : createLegacyStages(documents);

  return {
    id: item.id,
    title: item.title,
    type: item.type,
    validFor: item.validFor,
    amount: String(item.amount || 0),
    available: Boolean(item.available),
    description: item.description,
    introTitle: item.introTitle || '',
    introDescription: item.introDescription || '',
    stepsLabel: item.stepsLabel || '',
    featureLines: Array.isArray(item.featureLines) ? item.featureLines : [],
    selfValidation: Boolean(item.selfValidation),
    selfValidationGuide: item.selfValidationGuide || '',
    selfValidationNote: item.selfValidationNote || '',
    selfValidationUploadLabel: item.selfValidationUploadLabel || '',
    trainingVideoUrl: fileUrl(item.trainingVideo),
    trainingVideoName: item.trainingVideo ? path.basename(String(item.trainingVideo.path || '')) : null,
    trainingVideoMimeType: item.trainingVideo?.mimeType || null,
    trainingVideoSize: item.trainingVideo?.size || null,
    stageCount: stages.length,
    documentCount: documents.length,
    documents,
    stages,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt
  };
};

const upsertTrainingVideo = async ({ validationId, file, transaction }) => {
  const uploadsDir = path.resolve(process.cwd(), 'src', 'uploads');
  const relativePath = path.relative(uploadsDir, file.path).replace(/\\/g, '/');

  const found = await File.findOne({
    where: {
      fileableType: 'validation',
      fileableId: validationId,
      subject: Validation.TRAINING_VIDEO_SUBJECT
    },
    transaction
  });

  const payload = {
    fileableType: 'validation',
    fileableId: validationId,
    subject: Validation.TRAINING_VIDEO_SUBJECT,
    path: relativePath,
    mimeType: file.mimetype,
    size: file.size,
    disk: 'local',
    status: 'processed'
  };

  if (found) {
    await found.update(payload, { transaction });
    return;
  }

  await File.create(payload, { transaction });
};

const syncValidationDocuments = async (validationId, documentIds = [], transaction) => {
  await ValidationDocument.destroy({
    where: { validationId },
    transaction
  });

  const uniqueDocumentIds = normalizeDocumentIds(documentIds);

  if (!uniqueDocumentIds.length) {
    return;
  }

  const documents = await Document.findAll({
    where: {
      id: uniqueDocumentIds,
      subject: Document.SUBJECTS.VALIDATION
    },
    transaction
  });

  if (documents.length !== uniqueDocumentIds.length) {
    const error = new Error('حداقل یکی از مستندات انتخاب شده معتبر نیست یا برای اعتبارسنجی تعریف نشده است');
    error.status = 422;
    throw error;
  }

  await ValidationDocument.bulkCreate(
    uniqueDocumentIds.map((documentId, index) => ({
      validationId,
      documentId,
      sort: index
    })),
    { transaction }
  );
};

export const listValidations = async (req, res, next) => {
  try {
    const search = normalizeSearch(req.query.search);
    const available = String(req.query.available || '').trim();
    const { page, limit, offset } = getPagination(req.query);
    const where = {};

    if (search) {
      where[Op.or] = [
        { title: { [Op.like]: `%${search}%` } },
        { type: { [Op.like]: `%${search}%` } },
        { description: { [Op.like]: `%${search}%` } }
      ];
    }

    if (available === '1' || available === '0') {
      where.available = available === '1';
    }

    const { rows, count } = await Validation.findAndCountAll({
      where,
      include: validationInclude,
      distinct: true,
      order: [['id', 'DESC']],
      limit,
      offset
    });

    const documentMap = await buildDocumentMapForValidations(rows.map((item) => item.id));

    return res.status(200).json(createPaginationResult({
      items: rows.map((item) => serializeValidation(item, documentMap.get(Number(item.id)) || [])),
      total: count,
      page,
      limit
    }));
  } catch (error) {
    return next(error);
  }
};

export const createValidation = async (req, res, next) => {
  try {
    const stages = normalizeValidationStages(req.body.stages, req.body.documentIds || []);
    const documentIds = collectStageDocumentIds(stages);

    const item = await sequelize.transaction(async (transaction) => {
      const featureLinesRaw = req.body.featureLines;
      let featureLines = null;
      if (typeof featureLinesRaw === 'string') {
        try { featureLines = JSON.parse(featureLinesRaw); } catch { featureLines = featureLinesRaw.split('\n').map(l => l.trim()).filter(Boolean); }
      } else if (Array.isArray(featureLinesRaw)) {
        featureLines = featureLinesRaw.map(l => String(l).trim()).filter(Boolean);
      }

      const validation = await Validation.create(
        {
          title: String(req.body.title || '').trim(),
          type: String(req.body.type || '').trim(),
          validFor: req.body.validFor ? Number(req.body.validFor) : null,
          amount: req.body.amount ? Number(req.body.amount) : null,
          available: req.body.available === true || req.body.available === 'true' || req.body.available === '1',
          description: String(req.body.description || '').trim() || null,
          introTitle: String(req.body.introTitle || '').trim() || null,
          introDescription: String(req.body.introDescription || '').trim() || null,
          stepsLabel: String(req.body.stepsLabel || '').trim() || null,
          featureLines: featureLines?.length ? featureLines : null,
          stages: stages.length ? stages : null,
          selfValidation: req.body.selfValidation === true || req.body.selfValidation === 'true' || req.body.selfValidation === '1',
          selfValidationGuide: String(req.body.selfValidationGuide || '').trim() || null,
          selfValidationNote: String(req.body.selfValidationNote || '').trim() || null,
          selfValidationUploadLabel: String(req.body.selfValidationUploadLabel || '').trim() || null
        },
        { transaction }
      );

      await syncValidationDocuments(validation.id, documentIds, transaction);

      if (req.files?.trainingVideo?.[0]) {
        await upsertTrainingVideo({
          validationId: validation.id,
          file: req.files.trainingVideo[0],
          transaction
        });
      }

      return validation;
    });

    const documentMap = await buildDocumentMapForValidations([item.id]);
    const fresh = await Validation.findByPk(item.id, { include: validationInclude });
    return res.status(201).json({
      message: 'روش اعتبارسنجی ثبت شد',
      item: serializeValidation(fresh, documentMap.get(Number(item.id)) || [])
    });
  } catch (error) {
    return next(error);
  }
};

export const updateValidation = async (req, res, next) => {
  try {
    const item = await Validation.findByPk(req.params.id);

    if (!item) {
      return res.status(404).json({ message: 'روش اعتبارسنجی یافت نشد' });
    }

    const stages = normalizeValidationStages(req.body.stages, req.body.documentIds || []);
    const documentIds = collectStageDocumentIds(stages);

    await sequelize.transaction(async (transaction) => {
      const featureLinesRaw = req.body.featureLines;
      let featureLines = null;
      if (typeof featureLinesRaw === 'string') {
        try { featureLines = JSON.parse(featureLinesRaw); } catch { featureLines = featureLinesRaw.split('\n').map(l => l.trim()).filter(Boolean); }
      } else if (Array.isArray(featureLinesRaw)) {
        featureLines = featureLinesRaw.map(l => String(l).trim()).filter(Boolean);
      }

      await item.update(
        {
          title: String(req.body.title || '').trim(),
          type: String(req.body.type || '').trim(),
          validFor: req.body.validFor ? Number(req.body.validFor) : null,
          amount: req.body.amount ? Number(req.body.amount) : null,
          available: req.body.available === true || req.body.available === 'true' || req.body.available === '1',
          description: String(req.body.description || '').trim() || null,
          introTitle: String(req.body.introTitle || '').trim() || null,
          introDescription: String(req.body.introDescription || '').trim() || null,
          stepsLabel: String(req.body.stepsLabel || '').trim() || null,
          featureLines: featureLines?.length ? featureLines : null,
          stages: stages.length ? stages : null,
          selfValidation: req.body.selfValidation === true || req.body.selfValidation === 'true' || req.body.selfValidation === '1',
          selfValidationGuide: String(req.body.selfValidationGuide || '').trim() || null,
          selfValidationNote: String(req.body.selfValidationNote || '').trim() || null,
          selfValidationUploadLabel: String(req.body.selfValidationUploadLabel || '').trim() || null
        },
        { transaction }
      );

      await syncValidationDocuments(item.id, documentIds, transaction);

      if (req.files?.trainingVideo?.[0]) {
        await upsertTrainingVideo({
          validationId: item.id,
          file: req.files.trainingVideo[0],
          transaction
        });
      }
    });

    const documentMap = await buildDocumentMapForValidations([item.id]);
    const fresh = await Validation.findByPk(item.id, { include: validationInclude });
    return res.status(200).json({
      message: 'روش اعتبارسنجی بروزرسانی شد',
      item: serializeValidation(fresh, documentMap.get(Number(item.id)) || [])
    });
  } catch (error) {
    return next(error);
  }
};

export const deleteValidation = async (req, res, next) => {
  try {
    const item = await Validation.findByPk(req.params.id);

    if (!item) {
      return res.status(404).json({ message: 'روش اعتبارسنجی یافت نشد' });
    }

    await sequelize.transaction(async (transaction) => {
      await ValidationDocument.destroy({ where: { validationId: item.id }, transaction });
      await File.destroy({
        where: {
          fileableType: 'validation',
          fileableId: item.id
        },
        transaction
      });
      await item.destroy({ transaction });
    });

    return res.status(200).json({ message: 'روش اعتبارسنجی حذف شد' });
  } catch (error) {
    return next(error);
  }
};