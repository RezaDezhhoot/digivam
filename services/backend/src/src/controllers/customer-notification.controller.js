import { Notification } from '../models/notification.model.js';
import {
  buildNotificationSearchWhere,
  createNotificationSummary,
  listNotifications,
  markNotificationRead
} from '../services/notification.service.js';
import { getPagination } from '../utils/pagination.js';

const normalizeSearch = (value) => String(value || '').trim();

const customerWhere = (customerId) => ({
  modelType: Notification.MODEL_TYPES.CUSTOMER,
  modelId: Number(customerId)
});

export const getCustomerNotificationSummary = async (req, res, next) => {
  try {
    const where = customerWhere(req.auth.sub);
    const [summary, latest] = await Promise.all([
      createNotificationSummary(where),
      listNotifications({ where, page: 1, limit: 6 })
    ]);

    return res.status(200).json({
      summary,
      latest: latest.items
    });
  } catch (error) {
    return next(error);
  }
};

export const listCustomerNotifications = async (req, res, next) => {
  try {
    const { page, limit } = getPagination(req.query);
    const search = normalizeSearch(req.query.search);
    const category = normalizeSearch(req.query.category);
    const isRead = normalizeSearch(req.query.isRead);
    const where = {
      ...customerWhere(req.auth.sub),
      ...buildNotificationSearchWhere(search)
    };

    if (category) {
      where.category = category;
    }

    if (isRead === 'read') {
      where.isRead = true;
    }

    if (isRead === 'unread') {
      where.isRead = false;
    }

    const [payload, summary] = await Promise.all([
      listNotifications({ where, page, limit }),
      createNotificationSummary(customerWhere(req.auth.sub))
    ]);

    return res.status(200).json({
      ...payload,
      summary
    });
  } catch (error) {
    return next(error);
  }
};

export const markCustomerNotificationRead = async (req, res, next) => {
  try {
    const item = await Notification.findOne({
      where: {
        id: req.params.id,
        ...customerWhere(req.auth.sub)
      }
    });

    if (!item) {
      return res.status(404).json({ message: 'نوتیفیکیشن یافت نشد' });
    }

    await markNotificationRead(item);

    return res.status(200).json({ message: 'نوتیفیکیشن به عنوان خوانده شده ثبت شد' });
  } catch (error) {
    return next(error);
  }
};

export const markAllCustomerNotificationsRead = async (req, res, next) => {
  try {
    await Notification.update(
      {
        isRead: true,
        readAt: new Date()
      },
      {
        where: {
          ...customerWhere(req.auth.sub),
          isRead: false
        }
      }
    );

    return res.status(200).json({ message: 'همه نوتیفیکیشن ها خوانده شده علامت گذاری شدند' });
  } catch (error) {
    return next(error);
  }
};