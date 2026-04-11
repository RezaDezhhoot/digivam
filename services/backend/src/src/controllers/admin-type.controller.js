import path from 'node:path';
import { Op } from 'sequelize';
import { env } from '../config/env.js';
import { File } from '../models/file.model.js';
import { Type } from '../models/type.model.js';
import { createPaginationResult, getPagination } from '../utils/pagination.js';

const uploadsRoot = path.resolve(process.cwd(), 'src', 'uploads').replace(/\\/g, '/');

const typeInclude = [
  { model: File, as: 'logo', required: false },
  { model: File, as: 'banner', required: false },
  { model: File, as: 'contractBackground', required: false }
];

const normalizeSearch = (value) => String(value || '').trim();
const isPlainObject = (value) => Boolean(value) && typeof value === 'object' && !Array.isArray(value);

const normalizeText = (value, max = 255) => String(value || '').trim().slice(0, max);
const normalizeHtml = (value, max = 120000) => String(value || '').trim().slice(0, max);

const parseContractTemplateValue = (value) => {
  if (!value) {
    return {};
  }

  if (isPlainObject(value)) {
    return value;
  }

  try {
    const parsed = JSON.parse(String(value));
    return isPlainObject(parsed) ? parsed : {};
  } catch {
    return {};
  }
};

const normalizeContractTemplate = (value, fallbackTitle = '') => {
  const defaults = Type.createDefaultContractTemplate();
  const source = parseContractTemplateValue(value);
  const header = isPlainObject(source.header) ? source.header : {};
  const footer = isPlainObject(source.footer) ? source.footer : {};

  return {
    page: {
      size: 'A4'
    },
    header: {
      title: normalizeText(header.title || '', 255) || normalizeText(fallbackTitle || '', 255),
      dateText: normalizeText(header.dateText || defaults.header.dateText, 255) || defaults.header.dateText,
      contractNumberText:
        normalizeText(header.contractNumberText || defaults.header.contractNumberText, 255) || defaults.header.contractNumberText,
      showLogo: header.showLogo !== false
    },
    bodyHtml: normalizeHtml(source.bodyHtml || defaults.bodyHtml, 120000),
    footer: {
      customerSignatureLabel:
        normalizeText(footer.customerSignatureLabel || defaults.footer.customerSignatureLabel, 255) ||
        defaults.footer.customerSignatureLabel,
      brokerSignatureLabel:
        normalizeText(footer.brokerSignatureLabel || defaults.footer.brokerSignatureLabel, 255) || defaults.footer.brokerSignatureLabel,
      note: normalizeText(footer.note || defaults.footer.note, 2000)
    }
  };
};

const stripHtml = (value) => String(value || '')
  .replace(/<script[\s\S]*?<\/script>/gi, ' ')
  .replace(/<style[\s\S]*?<\/style>/gi, ' ')
  .replace(/<[^>]+>/g, ' ')
  .replace(/&nbsp;/gi, ' ')
  .replace(/\s+/g, ' ')
  .trim();

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

const serializeType = (item) => {
  const contractTemplate = normalizeContractTemplate(item.contractTemplate, item.title);

  return {
    id: item.id,
    title: item.title,
    type: item.type,
    typeLabel: Type.TYPE_LABELS[item.type] || item.type,
    body: item.body,
    logoUrl: fileUrl(item.logo),
    bannerUrl: fileUrl(item.banner),
    contractBackgroundUrl: fileUrl(item.contractBackground),
    contractTemplate,
    hasContractTemplate: Boolean(stripHtml(contractTemplate.bodyHtml)),
    createdAt: item.createdAt,
    updatedAt: item.updatedAt
  };
};

const upsertFile = async ({ typeId, subject, file }) => {
  const uploadsDir = path.resolve(process.cwd(), 'src', 'uploads');
  const relativePath = path.relative(uploadsDir, file.path).replace(/\\/g, '/');

  const found = await File.findOne({
    where: {
      fileableType: 'type',
      fileableId: typeId,
      subject
    }
  });

  const payload = {
    fileableType: 'type',
    fileableId: typeId,
    subject,
    path: relativePath,
    mimeType: file.mimetype,
    size: file.size,
    disk: 'local',
    status: 'processed'
  };

  if (found) {
    await found.update(payload);
    return;
  }

  await File.create(payload);
};

export const listLoanTypes = async (req, res, next) => {
  try {
    const search = normalizeSearch(req.query.search);
    const { page, limit, offset } = getPagination(req.query);
    const where = {};

    if (search) {
      where[Op.or] = [
        { title: { [Op.like]: `%${search}%` } },
        { body: { [Op.like]: `%${search}%` } },
        { type: { [Op.like]: `%${search}%` } }
      ];
    }

    const [total, items] = await Promise.all([
      Type.count({ where }),
      Type.findAll({
        where,
        include: typeInclude,
        order: [['id', 'DESC']],
        limit,
        offset
      })
    ]);

    return res.status(200).json(createPaginationResult({
      items: items.map(serializeType),
      total,
      page,
      limit
    }));
  } catch (error) {
    return next(error);
  }
};

export const createLoanType = async (req, res, next) => {
  try {
    const title = String(req.body.title || '').trim();
    const item = await Type.create({
      title,
      type: String(req.body.type || '').trim(),
      body: String(req.body.body || '').trim() || null,
      contractTemplate: normalizeContractTemplate(req.body.contractTemplate, title)
    });

    if (req.files?.logo?.[0]) {
      await upsertFile({ typeId: item.id, subject: Type.LOGO_SUBJECT, file: req.files.logo[0] });
    }

    if (req.files?.banner?.[0]) {
      await upsertFile({ typeId: item.id, subject: Type.BANNER_SUBJECT, file: req.files.banner[0] });
    }

    if (req.files?.contractBackground?.[0]) {
      await upsertFile({
        typeId: item.id,
        subject: Type.CONTRACT_BACKGROUND_SUBJECT,
        file: req.files.contractBackground[0]
      });
    }

    const fresh = await Type.findByPk(item.id, { include: typeInclude });
    return res.status(201).json({ message: 'نوع وام جدید ثبت شد', item: serializeType(fresh) });
  } catch (error) {
    return next(error);
  }
};

export const updateLoanType = async (req, res, next) => {
  try {
    const item = await Type.findByPk(req.params.id);

    if (!item) {
      return res.status(404).json({ message: 'نوع وام یافت نشد' });
    }

    const title = String(req.body.title || '').trim();

    await item.update({
      title,
      type: String(req.body.type || '').trim(),
      body: String(req.body.body || '').trim() || null,
      contractTemplate: normalizeContractTemplate(req.body.contractTemplate, title)
    });

    if (req.files?.logo?.[0]) {
      await upsertFile({ typeId: item.id, subject: Type.LOGO_SUBJECT, file: req.files.logo[0] });
    }

    if (req.files?.banner?.[0]) {
      await upsertFile({ typeId: item.id, subject: Type.BANNER_SUBJECT, file: req.files.banner[0] });
    }

    if (req.files?.contractBackground?.[0]) {
      await upsertFile({
        typeId: item.id,
        subject: Type.CONTRACT_BACKGROUND_SUBJECT,
        file: req.files.contractBackground[0]
      });
    }

    const fresh = await Type.findByPk(item.id, { include: typeInclude });
    return res.status(200).json({ message: 'نوع وام بروزرسانی شد', item: serializeType(fresh) });
  } catch (error) {
    return next(error);
  }
};

export const deleteLoanType = async (req, res, next) => {
  try {
    const item = await Type.findByPk(req.params.id);

    if (!item) {
      return res.status(404).json({ message: 'نوع وام یافت نشد' });
    }

    await Promise.all([
      File.destroy({ where: { fileableType: 'type', fileableId: item.id } }),
      item.destroy()
    ]);

    return res.status(200).json({ message: 'نوع وام حذف شد' });
  } catch (error) {
    return next(error);
  }
};