import { Op } from 'sequelize';
import { Document } from '../models/document.model.js';
import { createPaginationResult, getPagination } from '../utils/pagination.js';

const normalizeSearch = (value) => String(value || '').trim();

const serializeDocument = (item) => ({
  id: item.id,
  title: item.title,
  type: item.type,
  typeLabel: Document.TYPE_LABELS[item.type] || item.type,
  mimes: item.mimes || '',
  max: item.max,
  help: item.help,
  subject: item.subject,
  subjectLabel: item.subject ? Document.SUBJECT_LABELS[item.subject] || item.subject : '-',
  required: Boolean(item.required),
  category: item.category,
  categoryLabel: item.category ? Document.CATEGORY_LABELS[item.category] || item.category : '-',
  createdAt: item.createdAt,
  updatedAt: item.updatedAt
});

export const listDocuments = async (req, res, next) => {
  try {
    const search = normalizeSearch(req.query.search);
    const subject = normalizeSearch(req.query.subject);
    const category = normalizeSearch(req.query.category);
    const type = normalizeSearch(req.query.type);
    const { page, limit, offset } = getPagination(req.query);
    const where = {};

    if (search) {
      where[Op.or] = [
        { title: { [Op.like]: `%${search}%` } },
        { help: { [Op.like]: `%${search}%` } },
        { mimes: { [Op.like]: `%${search}%` } }
      ];
    }

    if (subject) {
      where.subject = subject;
    }

    if (category) {
      where.category = category;
    }

    if (type) {
      where.type = type;
    }

    const { rows, count } = await Document.findAndCountAll({
      where,
      order: [['id', 'DESC']],
      limit,
      offset
    });

    return res.status(200).json(createPaginationResult({
      items: rows.map(serializeDocument),
      total: count,
      page,
      limit
    }));
  } catch (error) {
    return next(error);
  }
};

export const listDocumentOptions = async (req, res, next) => {
  try {
    const subject = normalizeSearch(req.query.subject);
    const where = {};

    if (subject) {
      where.subject = subject;
    }

    const items = await Document.findAll({
      where,
      order: [['title', 'ASC'], ['id', 'ASC']]
    });

    return res.status(200).json({ items: items.map(serializeDocument) });
  } catch (error) {
    return next(error);
  }
};

export const createDocument = async (req, res, next) => {
  try {
    const item = await Document.create({
      title: String(req.body.title || '').trim(),
      type: String(req.body.type || '').trim(),
      mimes: String(req.body.mimes || '').trim() || null,
      max: req.body.max ? Number(req.body.max) : null,
      help: String(req.body.help || '').trim() || null,
      subject: String(req.body.subject || '').trim() || null,
      required: req.body.required === true || req.body.required === 'true' || req.body.required === '1',
      category: String(req.body.category || '').trim() || null
    });

    return res.status(201).json({ message: 'مستند جدید ثبت شد', item: serializeDocument(item) });
  } catch (error) {
    return next(error);
  }
};

export const updateDocument = async (req, res, next) => {
  try {
    const item = await Document.findByPk(req.params.id);

    if (!item) {
      return res.status(404).json({ message: 'مستند یافت نشد' });
    }

    await item.update({
      title: String(req.body.title || '').trim(),
      type: String(req.body.type || '').trim(),
      mimes: String(req.body.mimes || '').trim() || null,
      max: req.body.max ? Number(req.body.max) : null,
      help: String(req.body.help || '').trim() || null,
      subject: String(req.body.subject || '').trim() || null,
      required: req.body.required === true || req.body.required === 'true' || req.body.required === '1',
      category: String(req.body.category || '').trim() || null
    });

    return res.status(200).json({ message: 'مستند بروزرسانی شد', item: serializeDocument(item) });
  } catch (error) {
    return next(error);
  }
};

export const deleteDocument = async (req, res, next) => {
  try {
    const item = await Document.findByPk(req.params.id);

    if (!item) {
      return res.status(404).json({ message: 'مستند یافت نشد' });
    }

    await item.destroy();
    return res.status(200).json({ message: 'مستند حذف شد' });
  } catch (error) {
    return next(error);
  }
};