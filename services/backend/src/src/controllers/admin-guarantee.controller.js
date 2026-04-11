import { Op } from 'sequelize';
import { Guarantee } from '../models/guarantee.model.js';
import { createPaginationResult, getPagination } from '../utils/pagination.js';

const normalizeSearch = (value) => String(value || '').trim();

export const listGuarantees = async (req, res, next) => {
  try {
    const search = normalizeSearch(req.query.search);
    const { page, limit, offset } = getPagination(req.query);
    const where = {};

    if (search) {
      where[Op.or] = [
        { title: { [Op.like]: `%${search}%` } },
        { help: { [Op.like]: `%${search}%` } }
      ];
    }

    const { rows, count } = await Guarantee.findAndCountAll({
      where,
      order: [['id', 'DESC']],
      limit,
      offset
    });

    return res.status(200).json(createPaginationResult({ items: rows, total: count, page, limit }));
  } catch (error) {
    return next(error);
  }
};

export const createGuarantee = async (req, res, next) => {
  try {
    const guarantee = await Guarantee.create({
      title: String(req.body.title || '').trim(),
      help: String(req.body.help || '').trim() || null
    });

    return res.status(201).json({ message: 'ضمانت جدید ثبت شد', item: guarantee });
  } catch (error) {
    return next(error);
  }
};

export const updateGuarantee = async (req, res, next) => {
  try {
    const guarantee = await Guarantee.findByPk(req.params.id);
    if (!guarantee) {
      return res.status(404).json({ message: 'ضمانت یافت نشد' });
    }

    await guarantee.update({
      title: String(req.body.title || '').trim(),
      help: String(req.body.help || '').trim() || null
    });

    return res.status(200).json({ message: 'ضمانت بروزرسانی شد', item: guarantee });
  } catch (error) {
    return next(error);
  }
};

export const deleteGuarantee = async (req, res, next) => {
  try {
    const guarantee = await Guarantee.findByPk(req.params.id);
    if (!guarantee) {
      return res.status(404).json({ message: 'ضمانت یافت نشد' });
    }

    await guarantee.destroy();
    return res.status(200).json({ message: 'ضمانت حذف شد' });
  } catch (error) {
    return next(error);
  }
};