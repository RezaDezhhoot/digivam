import { Notification } from '../models/notification.model.js';
import {
  buildNotificationSearchWhere,
  createNotification,
  createNotificationSummary,
  listNotificationActors,
  listNotifications
} from '../services/notification.service.js';
import { getPagination } from '../utils/pagination.js';

const normalizeSearch = (value) => String(value || '').trim();

export const getAdminNotificationOptions = async (_req, res, next) => {
  try {
    const payload = await listNotificationActors();
    return res.status(200).json(payload);
  } catch (error) {
    return next(error);
  }
};

export const listAdminNotifications = async (req, res, next) => {
  try {
    const { page, limit } = getPagination(req.query);
    const search = normalizeSearch(req.query.search);
    const category = normalizeSearch(req.query.category);
    const modelType = normalizeSearch(req.query.modelType);
    const modelId = req.query.modelId ? Number(req.query.modelId) : null;
    const isRead = normalizeSearch(req.query.isRead);
    const where = {
      ...buildNotificationSearchWhere(search)
    };

    if (category) {
      where.category = category;
    }

    if (modelType) {
      where.modelType = modelType;
    }

    if (modelId) {
      where.modelId = modelId;
    }

    if (isRead === 'read') {
      where.isRead = true;
    }

    if (isRead === 'unread') {
      where.isRead = false;
    }

    const [payload, summary] = await Promise.all([
      listNotifications({ where, page, limit }),
      createNotificationSummary(where)
    ]);

    return res.status(200).json({
      ...payload,
      summary
    });
  } catch (error) {
    return next(error);
  }
};

export const createAdminNotification = async (req, res, next) => {
  try {
    const item = await createNotification({
      category: req.body.category,
      title: req.body.title,
      body: req.body.body,
      modelType: req.body.modelType,
      modelId: req.body.modelId,
      senderType: Notification.MODEL_TYPES.ADMIN,
      senderId: req.auth.sub,
      metadata: req.body.metadata || null
    });

    const payload = await listNotifications({ where: { id: item.id }, page: 1, limit: 1 });

    return res.status(201).json({
      message: 'نوتیفیکیشن با موفقیت ارسال شد',
      item: payload.items[0] || null
    });
  } catch (error) {
    return next(error);
  }
};