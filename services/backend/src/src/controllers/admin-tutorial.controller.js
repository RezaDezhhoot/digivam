import path from 'node:path';
import { Op } from 'sequelize';
import { env } from '../config/env.js';
import { File } from '../models/file.model.js';
import { Tutorial } from '../models/tutorial.model.js';
import { getPagination, createPaginationResult } from '../utils/pagination.js';

const uploadsRoot = path.resolve(process.cwd(), 'src', 'uploads');

const fileUrl = (file) => {
  if (!file) return null;
  const rawPath = String(file.path || '').replace(/\\/g, '/');
  if (/^https?:\/\//i.test(rawPath)) return rawPath;
  const relativePath = rawPath.startsWith(uploadsRoot)
    ? rawPath.slice(uploadsRoot.length).replace(/^\/+/, '')
    : rawPath.replace(/^\/+/, '');
  return `${env.backendBaseUrl}/uploads/${relativePath}`;
};

const serializeTutorial = (item) => ({
  id: item.id,
  title: item.title,
  description: item.description || '',
  sort: item.sort,
  status: item.status,
  statusLabel: Tutorial.STATUS_LABELS[item.status] || item.status,
  videoUrl: fileUrl(item.video),
  createdAt: item.createdAt
});

const saveVideoFile = async (file, tutorialId) => {
  const relativePath = path.relative(uploadsRoot, file.path).replace(/\\/g, '/');
  const subject = Tutorial.VIDEO_SUBJECT;

  const found = await File.findOne({
    where: { fileableType: 'tutorial', fileableId: tutorialId, subject }
  });

  const payload = {
    fileableType: 'tutorial',
    fileableId: tutorialId,
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

export const listTutorials = async (req, res, next) => {
  try {
    const { page, limit, offset } = getPagination(req.query);
    const search = String(req.query.search || '').trim();
    const where = {};

    if (search) {
      where.title = { [Op.like]: `%${search}%` };
    }

    const [total, items] = await Promise.all([
      Tutorial.count({ where }),
      Tutorial.findAll({
        where,
        include: [{ model: File, as: 'video', attributes: ['id', 'path', 'mimeType', 'size'] }],
        order: [['sort', 'ASC'], ['id', 'DESC']],
        limit,
        offset
      })
    ]);

    return res.status(200).json(
      createPaginationResult({ items: items.map(serializeTutorial), total, page, limit })
    );
  } catch (error) {
    return next(error);
  }
};

export const createTutorial = async (req, res, next) => {
  try {
    const tutorial = await Tutorial.create({
      title: req.body.title,
      description: req.body.description || '',
      sort: Number(req.body.sort) || 0,
      status: req.body.status || 'active'
    });

    if (req.files?.video?.[0]) {
      await saveVideoFile(req.files.video[0], tutorial.id);
    }

    const fresh = await Tutorial.findByPk(tutorial.id, {
      include: [{ model: File, as: 'video', attributes: ['id', 'path', 'mimeType', 'size'] }]
    });

    return res.status(201).json(serializeTutorial(fresh));
  } catch (error) {
    return next(error);
  }
};

export const updateTutorial = async (req, res, next) => {
  try {
    const tutorial = await Tutorial.findByPk(req.params.id);

    if (!tutorial) {
      return res.status(404).json({ message: 'آموزش مورد نظر یافت نشد' });
    }

    await tutorial.update({
      title: req.body.title,
      description: req.body.description || '',
      sort: Number(req.body.sort) || 0,
      status: req.body.status || tutorial.status
    });

    if (req.files?.video?.[0]) {
      await saveVideoFile(req.files.video[0], tutorial.id);
    }

    const fresh = await Tutorial.findByPk(tutorial.id, {
      include: [{ model: File, as: 'video', attributes: ['id', 'path', 'mimeType', 'size'] }]
    });

    return res.status(200).json(serializeTutorial(fresh));
  } catch (error) {
    return next(error);
  }
};

export const deleteTutorial = async (req, res, next) => {
  try {
    const tutorial = await Tutorial.findByPk(req.params.id);

    if (!tutorial) {
      return res.status(404).json({ message: 'آموزش مورد نظر یافت نشد' });
    }

    await File.destroy({ where: { fileableType: 'tutorial', fileableId: tutorial.id } });
    await tutorial.destroy();

    return res.status(200).json({ message: 'آموزش با موفقیت حذف شد' });
  } catch (error) {
    return next(error);
  }
};
