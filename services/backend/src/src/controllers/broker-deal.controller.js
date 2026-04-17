import { sequelize } from '../config/database.js';
import { Notification } from '../models/notification.model.js';
import { buildDealNotificationMetadata, createNotification } from '../services/notification.service.js';
import { loadDecreaseValidityAmount } from '../services/site-settings.service.js';
import {
  createDealSummary,
  findDealById,
  listDeals,
  loadDealById,
  requestDealContractOtp,
  reviewDealByBroker,
  signDealContract,
  submitDealTransferByBroker,
  serializeDeal
} from '../services/deal.service.js';
import { getPagination } from '../utils/pagination.js';

const sanitizeBrokerDeal = (item) => {
  if (!item || typeof item !== 'object') {
    return item;
  }

  const { brokerConfirmationAmount, ...rest } = item;
  return rest;
};

const attachBrokerDealMeta = async (item) => ({
  ...item,
  brokerConfirmationFee: String(await loadDecreaseValidityAmount()),
  brokerAlreadyPaid: Number(item?.brokerConfirmationAmount || 0) > 0
});

const buildBrokerApprovalNotificationBody = (item) => {
  if (item.step === 'contract') {
    return `درخواست معامله «${item.facility?.title || item.facilityData?.title || 'وام'}» توسط کارگزار تایید شد و قرارداد آماده امضا است.`;
  }

  if (item.step === 'payment') {
    return `درخواست معامله «${item.facility?.title || item.facilityData?.title || 'وام'}» توسط کارگزار تایید شد و پرونده وارد مرحله پرداخت شد.`;
  }

  return `درخواست معامله «${item.facility?.title || item.facilityData?.title || 'وام'}» توسط کارگزار تایید شد و پرونده وارد مرحله انتقال شد.`;
};

const buildBrokerPostSignPayload = (item) => {
  if (!(item.contractSignedByCustomer && item.contractSignedByBroker)) {
    return {
      title: 'امضای قرارداد توسط کارگزار',
      body: `کارگزار قرارداد معامله «${item.facility?.title || item.facilityData?.title || 'وام'}» را امضا کرد. در انتظار امضای شما.`
    };
  }

  if (item.step === 'transfer') {
    return {
      title: 'قرارداد معامله امضا شد',
      body: `قرارداد معامله «${item.facility?.title || item.facilityData?.title || 'وام'}» توسط هر دو طرف امضا شد و پرونده وارد مرحله انتقال امتیاز شد.`
    };
  }

  return {
    title: 'قرارداد معامله امضا شد',
    body: `قرارداد معامله «${item.facility?.title || item.facilityData?.title || 'وام'}» توسط هر دو طرف امضا شد و پرونده وارد مرحله پرداخت شد.`
  };
};

export const getBrokerDealSummary = async (req, res, next) => {
  try {
    const where = { brokerId: Number(req.auth.sub) };
    const [summary, latest] = await Promise.all([
      createDealSummary(where),
      listDeals({ where, page: 1, limit: 4 })
    ]);

    return res.status(200).json({ summary, latest: latest.items.map(sanitizeBrokerDeal) });
  } catch (error) {
    return next(error);
  }
};

export const listBrokerDeals = async (req, res, next) => {
  try {
    const { page, limit } = getPagination(req.query);
    const where = { brokerId: Number(req.auth.sub) };
    const loanTypeId = Number(req.query.loanTypeId || 0);

    if (req.query.status) {
      where.status = req.query.status;
    }

    if (req.query.step) {
      where.step = req.query.step;
    }

    if (loanTypeId > 0) {
      where.subTypeId = loanTypeId;
    }

    const result = await listDeals({ where, page, limit });
    return res.status(200).json({
      ...result,
      items: (result.items || []).map(sanitizeBrokerDeal)
    });
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

    return res.status(200).json({ item: sanitizeBrokerDeal(await attachBrokerDealMeta(item)) });
  } catch (error) {
    return next(error);
  }
};

export const reviewBrokerDeal = async (req, res, next) => {
  try {
    const deal = await loadDealById(req.params.id, { brokerId: Number(req.auth.sub) });
    const brokerConfirmationFee = await loadDecreaseValidityAmount();

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
        confirmationAmount: brokerConfirmationFee,
        transaction
      });

      return loadDealById(deal.id, { brokerId: Number(req.auth.sub) });
    });

    const item = await attachBrokerDealMeta(await serializeDeal(updated));

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
        senderId: item.brokerId,
        metadata: buildDealNotificationMetadata({ dealId: item.id, recipientType: Notification.MODEL_TYPES.CUSTOMER })
      }).catch(() => null);
    } else {
      await createNotification({
        category: Notification.CATEGORIES.ATTENTION,
        title: 'معامله تایید شد',
        body: buildBrokerApprovalNotificationBody(item),
        modelType: Notification.MODEL_TYPES.CUSTOMER,
        modelId: item.customerId,
        senderType: Notification.MODEL_TYPES.BROKER,
        senderId: item.brokerId,
        metadata: buildDealNotificationMetadata({ dealId: item.id, recipientType: Notification.MODEL_TYPES.CUSTOMER })
      }).catch(() => null);
    }

    return res.status(200).json({
      message:
        req.body.action === 'reject'
          ? 'معامله رد شد و پرونده بسته شد'
          : brokerConfirmationFee > 0
            ? 'تایید کارگزار ثبت شد، مبلغ کاهش اعتبار از کیف پول شما کسر شد و پرونده به مرحله بعد رفت'
            : 'تایید کارگزار ثبت شد و پرونده به مرحله بعد رفت',
      item: sanitizeBrokerDeal(item)
    });
  } catch (error) {
    return next(error);
  }
};

export const submitBrokerDealTransfer = async (req, res, next) => {
  try {
    const deal = await loadDealById(req.params.id, { brokerId: Number(req.auth.sub) });

    if (!deal) {
      return res.status(404).json({ message: 'معامله یافت نشد' });
    }

    const updated = await sequelize.transaction(async (transaction) => {
      await submitDealTransferByBroker({
        deal,
        brokerId: Number(req.auth.sub),
        actorName: deal.broker?.name || req.auth.name || 'کارگزار',
        description: req.body.description,
        files: { uploads: req.files, fileTitles: req.body.fileTitles },
        transaction
      });

      return loadDealById(deal.id, { brokerId: Number(req.auth.sub) });
    });

    const item = await attachBrokerDealMeta(await serializeDeal(updated));

    await createNotification({
      category: Notification.CATEGORIES.ATTENTION,
      title: 'اطلاعات انتقال ثبت شد',
      body: `کارگزار اطلاعات مرحله انتقال برای معامله «${item.facility?.title || item.facilityData?.title || 'وام'}» را ثبت کرد. جزئیات از همین پرونده قابل مشاهده است.`,
      modelType: Notification.MODEL_TYPES.CUSTOMER,
      modelId: item.customerId,
      senderType: Notification.MODEL_TYPES.BROKER,
      senderId: item.brokerId,
      metadata: buildDealNotificationMetadata({ dealId: item.id, recipientType: Notification.MODEL_TYPES.CUSTOMER })
    }).catch(() => null);

    return res.status(200).json({
      message: 'اطلاعات انتقال ثبت شد و پرونده در انتظار بررسی مشتری قرار گرفت',
      item: sanitizeBrokerDeal(item)
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

    const item = sanitizeBrokerDeal(await attachBrokerDealMeta(await serializeDeal(updated)));
    const bothSigned = item.contractSignedByCustomer && item.contractSignedByBroker;
    const notificationPayload = buildBrokerPostSignPayload(item);
    await createNotification({
      category: bothSigned ? Notification.CATEGORIES.ATTENTION : Notification.CATEGORIES.INFO,
      title: notificationPayload.title,
      body: notificationPayload.body,
      modelType: Notification.MODEL_TYPES.CUSTOMER,
      modelId: item.customerId,
      senderType: Notification.MODEL_TYPES.BROKER,
      senderId: item.brokerId,
      metadata: buildDealNotificationMetadata({ dealId: item.id, recipientType: Notification.MODEL_TYPES.CUSTOMER })
    }).catch(() => null);

    return res.status(200).json({
      message: bothSigned
        ? item.step === 'transfer'
          ? 'امضای قرارداد ثبت شد و معامله وارد مرحله انتقال شد'
          : 'امضای قرارداد ثبت شد و معامله وارد مرحله پرداخت شد'
        : 'امضای کارگزار ثبت شد و وضعیت قرارداد به‌روزرسانی شد',
      item
    });
  } catch (error) {
    return next(error);
  }
};