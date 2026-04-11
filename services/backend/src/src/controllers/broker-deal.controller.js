import { sequelize } from '../config/database.js';
import { Notification } from '../models/notification.model.js';
import { createNotification } from '../services/notification.service.js';
import {
  createDealSummary,
  findDealById,
  listDeals,
  loadDealById,
  requestDealContractOtp,
  reviewDealByBroker,
  signDealContract,
  serializeDeal
} from '../services/deal.service.js';
import { getPagination } from '../utils/pagination.js';

export const getBrokerDealSummary = async (req, res, next) => {
  try {
    const where = { brokerId: Number(req.auth.sub) };
    const [summary, latest] = await Promise.all([
      createDealSummary(where),
      listDeals({ where, page: 1, limit: 4 })
    ]);

    return res.status(200).json({ summary, latest: latest.items });
  } catch (error) {
    return next(error);
  }
};

export const listBrokerDeals = async (req, res, next) => {
  try {
    const { page, limit } = getPagination(req.query);
    const where = { brokerId: Number(req.auth.sub) };

    if (req.query.status) {
      where.status = req.query.status;
    }

    if (req.query.step) {
      where.step = req.query.step;
    }

    const result = await listDeals({ where, page, limit });
    return res.status(200).json(result);
  } catch (error) {
    return next(error);
  }
};

export const getBrokerDeal = async (req, res, next) => {
  try {
    const item = await findDealById(req.params.id, { brokerId: Number(req.auth.sub) });

    if (!item) {
      return res.status(404).json({ message: 'معامله یافت نشد' });
    }

    return res.status(200).json({ item });
  } catch (error) {
    return next(error);
  }
};

export const reviewBrokerDeal = async (req, res, next) => {
  try {
    const deal = await loadDealById(req.params.id, { brokerId: Number(req.auth.sub) });

    if (!deal) {
      return res.status(404).json({ message: 'معامله یافت نشد' });
    }

    if (deal.status !== 'in_progress' || deal.step !== 'verify_broker' || deal.actBy !== 'broker') {
      return res.status(422).json({ message: 'این معامله در مرحله بررسی کارگزار نیست' });
    }

    const updated = await sequelize.transaction(async (transaction) => {
      await reviewDealByBroker({
        deal,
        brokerId: req.auth.sub,
        action: req.body.action,
        reason: req.body.reason,
        paymentTypes: req.body.paymentTypes,
        transaction
      });

      return loadDealById(deal.id, { brokerId: Number(req.auth.sub) });
    });

    const item = await serializeDeal(updated);

    if (req.body.action === 'reject') {
      await createNotification({
        category: Notification.CATEGORIES.WARNING,
        title: 'معامله رد شد',
        body: req.body.reason
          ? `درخواست معامله شما رد شد: ${req.body.reason}`
          : 'درخواست معامله شما توسط کارگزار رد شد.',
        modelType: Notification.MODEL_TYPES.CUSTOMER,
        modelId: item.customerId,
        senderType: Notification.MODEL_TYPES.BROKER,
        senderId: item.brokerId
      }).catch(() => null);
    } else {
      await createNotification({
        category: Notification.CATEGORIES.ATTENTION,
        title: 'معامله تایید شد',
        body: `درخواست معامله «${item.facility?.title || item.facilityData?.title || 'وام'}» توسط کارگزار تایید شد و قرارداد آماده امضا است.`,
        modelType: Notification.MODEL_TYPES.CUSTOMER,
        modelId: item.customerId,
        senderType: Notification.MODEL_TYPES.BROKER,
        senderId: item.brokerId
      }).catch(() => null);
    }

    return res.status(200).json({
      message:
        req.body.action === 'reject'
          ? 'معامله رد شد و پرونده بسته شد'
          : 'تایید کارگزار ثبت شد، روش‌های پرداخت ذخیره شدند و قرارداد برای امضای طرفین آماده است',
      item
    });
  } catch (error) {
    return next(error);
  }
};

export const requestBrokerDealContractOtp = async (req, res, next) => {
  try {
    const deal = await loadDealById(req.params.id, { brokerId: Number(req.auth.sub) });

    if (!deal) {
      return res.status(404).json({ message: 'معامله یافت نشد' });
    }

    const payload = await requestDealContractOtp({
      deal,
      actorType: 'broker',
      actorPhone: deal.broker?.phone,
      actorName: deal.broker?.name
    });

    return res.status(200).json(payload);
  } catch (error) {
    return next(error);
  }
};

export const signBrokerDealContract = async (req, res, next) => {
  try {
    const deal = await loadDealById(req.params.id, { brokerId: Number(req.auth.sub) });

    if (!deal) {
      return res.status(404).json({ message: 'معامله یافت نشد' });
    }

    const updated = await sequelize.transaction(async (transaction) => {
      await signDealContract({
        deal,
        actorType: 'broker',
        actorId: Number(req.auth.sub),
        actorName: deal.broker?.name,
        actorPhone: deal.broker?.phone,
        code: req.body.code,
        signature: req.body.signature,
        transaction
      });

      return loadDealById(deal.id, { brokerId: Number(req.auth.sub) });
    });

    const item = await serializeDeal(updated);

    const bothSigned = item.contractSignedByCustomer && item.contractSignedByBroker;
    await createNotification({
      category: bothSigned ? Notification.CATEGORIES.ATTENTION : Notification.CATEGORIES.INFO,
      title: bothSigned ? 'قرارداد معامله امضا شد' : 'امضای قرارداد توسط کارگزار',
      body: bothSigned
        ? `قرارداد معامله «${item.facility?.title || item.facilityData?.title || 'وام'}» توسط هر دو طرف امضا شد و پرونده وارد مرحله پرداخت شد.`
        : `کارگزار قرارداد معامله «${item.facility?.title || item.facilityData?.title || 'وام'}» را امضا کرد. در انتظار امضای شما.`,
      modelType: Notification.MODEL_TYPES.CUSTOMER,
      modelId: item.customerId,
      senderType: Notification.MODEL_TYPES.BROKER,
      senderId: item.brokerId
    }).catch(() => null);

    return res.status(200).json({
      message: bothSigned
        ? 'امضای قرارداد ثبت شد و معامله وارد مرحله پرداخت شد'
        : 'امضای کارگزار ثبت شد و وضعیت قرارداد به‌روزرسانی شد',
      item
    });
  } catch (error) {
    return next(error);
  }
};