import { sequelize } from '../config/database.js';
import { clearDealSignature, createDealSummary, findDealById, listDeals, loadDealById, manageDealByAdmin, refreshDealContract, serializeDeal } from '../services/deal.service.js';
import { Notification } from '../models/notification.model.js';
import { createNotification } from '../services/notification.service.js';
import { getPagination } from '../utils/pagination.js';

export const getAdminDealSummary = async (_req, res, next) => {
  try {
    const [summary, latest] = await Promise.all([
      createDealSummary(),
      listDeals({ page: 1, limit: 6 })
    ]);

    return res.status(200).json({ summary, latest: latest.items });
  } catch (error) {
    return next(error);
  }
};

export const listAdminDeals = async (req, res, next) => {
  try {
    const { page, limit } = getPagination(req.query);
    const where = {};

    if (req.query.status) {
      where.status = req.query.status;
    }

    if (req.query.step) {
      where.step = req.query.step;
    }

    if (req.query.actBy) {
      where.actBy = req.query.actBy;
    }

    const search = String(req.query.search || '').trim();
    if (search) {
      const codeMatch = search.match(/^DG-?(\d+)$/i);
      const dealId = codeMatch ? Number(codeMatch[1]) : (Number.isFinite(Number(search)) && Number(search) > 0 ? Number(search) : null);
      if (dealId) {
        where.id = dealId;
      }
    }

    const result = await listDeals({ where, page, limit });
    return res.status(200).json(result);
  } catch (error) {
    return next(error);
  }
};

export const getAdminDeal = async (req, res, next) => {
  try {
    const item = await findDealById(req.params.id);

    if (!item) {
      return res.status(404).json({ message: 'معامله یافت نشد' });
    }

    return res.status(200).json({ item });
  } catch (error) {
    return next(error);
  }
};

export const updateAdminDeal = async (req, res, next) => {
  try {
    const deal = await loadDealById(req.params.id);

    if (!deal) {
      return res.status(404).json({ message: 'معامله یافت نشد' });
    }

    const previousState = {
      status: deal.status,
      step: deal.step,
      actBy: deal.actBy
    };

    const updated = await sequelize.transaction(async (transaction) => {
      await manageDealByAdmin({
        deal,
        status: req.body.status,
        step: req.body.step,
        actBy: req.body.actBy,
        note: req.body.note,
        adminId: Number(req.auth.sub),
        adminName: req.auth.name || 'ادمین',
        transaction
      });

      return loadDealById(deal.id);
    });

    const item = await serializeDeal(updated);

    const changeParts = [];
    if (item.status !== previousState.status) {
      changeParts.push(`وضعیت پرونده به «${item.statusLabel || item.status}» تغییر کرد`);
    }
    if (item.step !== previousState.step) {
      changeParts.push(`مرحله پرونده به «${item.stepLabel || item.step}» تغییر کرد`);
    }
    if (item.actBy !== previousState.actBy) {
      changeParts.push(`صف اقدام روی «${item.actByLabel || item.actBy}» قرار گرفت`);
    }

    if (changeParts.length) {
      const title = 'بروزرسانی وضعیت معامله';
      const body = `پرونده «${item.facility?.title || item.facilityData?.title || 'وام'}» توسط ادمین بروزرسانی شد. ${changeParts.join(' | ')}`;

      const notifications = [];
      if (item.customerId) {
        notifications.push(
          createNotification({
            category: Notification.CATEGORIES.ATTENTION,
            title,
            body,
            modelType: Notification.MODEL_TYPES.CUSTOMER,
            modelId: item.customerId,
            senderType: Notification.MODEL_TYPES.ADMIN,
            senderId: Number(req.auth.sub)
          })
        );
      }
      if (item.brokerId) {
        notifications.push(
          createNotification({
            category: Notification.CATEGORIES.ATTENTION,
            title,
            body,
            modelType: Notification.MODEL_TYPES.BROKER,
            modelId: item.brokerId,
            senderType: Notification.MODEL_TYPES.ADMIN,
            senderId: Number(req.auth.sub)
          })
        );
      }

      await Promise.all(notifications.map((job) => job.catch(() => null)));
    }

    return res.status(200).json({
      message: 'تغییرات معامله با موفقیت ثبت شد',
      item
    });
  } catch (error) {
    return next(error);
  }
};

export const refreshAdminDealContract = async (req, res, next) => {
  try {
    const deal = await loadDealById(req.params.id);

    if (!deal) {
      return res.status(404).json({ message: 'معامله یافت نشد' });
    }

    const updated = await sequelize.transaction(async (transaction) => {
      await refreshDealContract({ deal, transaction });
      return loadDealById(deal.id);
    });

    const item = await serializeDeal(updated);
    return res.status(200).json({
      message: 'قرارداد با موفقیت بازسازی شد',
      item
    });
  } catch (error) {
    return next(error);
  }
};

export const removeAdminDealSignature = async (req, res, next) => {
  try {
    const deal = await loadDealById(req.params.id);

    if (!deal) {
      return res.status(404).json({ message: 'معامله یافت نشد' });
    }

    const updated = await sequelize.transaction(async (transaction) => {
      await clearDealSignature({
        deal,
        role: req.params.role,
        adminId: Number(req.auth.sub),
        adminName: req.auth.name || 'ادمین',
        transaction
      });

      return loadDealById(deal.id);
    });

    const item = await serializeDeal(updated);

    const notifications = [];
    if (item.customerId) {
      notifications.push(
        createNotification({
          category: Notification.CATEGORIES.WARNING,
          title: 'امضای قرارداد حذف شد',
          body: `امضای ${req.params.role === 'customer' ? 'مشتری' : 'کارگزار'} توسط ادمین از قرارداد «${item.facility?.title || item.facilityData?.title || 'وام'}» حذف شد و قرارداد دوباره بروزرسانی شد.`,
          modelType: Notification.MODEL_TYPES.CUSTOMER,
          modelId: item.customerId,
          senderType: Notification.MODEL_TYPES.ADMIN,
          senderId: Number(req.auth.sub)
        })
      );
    }
    if (item.brokerId) {
      notifications.push(
        createNotification({
          category: Notification.CATEGORIES.WARNING,
          title: 'امضای قرارداد حذف شد',
          body: `امضای ${req.params.role === 'customer' ? 'مشتری' : 'کارگزار'} توسط ادمین از قرارداد «${item.facility?.title || item.facilityData?.title || 'وام'}» حذف شد و قرارداد دوباره بروزرسانی شد.`,
          modelType: Notification.MODEL_TYPES.BROKER,
          modelId: item.brokerId,
          senderType: Notification.MODEL_TYPES.ADMIN,
          senderId: Number(req.auth.sub)
        })
      );
    }

    await Promise.all(notifications.map((job) => job.catch(() => null)));

    return res.status(200).json({
      message: 'امضا با موفقیت حذف شد',
      item
    });
  } catch (error) {
    return next(error);
  }
};