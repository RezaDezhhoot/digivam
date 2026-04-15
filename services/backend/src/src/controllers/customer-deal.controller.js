import { sequelize } from '../config/database.js';
import { Notification } from '../models/notification.model.js';
import { Facility } from '../models/facility.model.js';
import { Deal } from '../models/deal.model.js';
import { BrokerRate } from '../models/broker-rate.model.js';
import { Broker } from '../models/broker.model.js';
import { buildDealNotificationMetadata, createNotification } from '../services/notification.service.js';
import {
  confirmDealTransferByCustomer,
  createDealForCustomer,
  createDealSummary,
  findDealById,
  listDeals,
  loadDealById,
  loadFacilityForDeal,
  requestDealAdminReviewByCustomer,
  requestDealContractOtp,
  requestDealTransferOtp,
  saveDealDocuments,
  signDealContract,
  serializeDeal
} from '../services/deal.service.js';
import { getPagination } from '../utils/pagination.js';

const sanitizeCustomerDeal = (item) => {
  if (!item || typeof item !== 'object') {
    return item;
  }

  const { broker, brokerId, brokerConfirmationAmount, facilityData, ...rest } = item;
  const nextFacilityData = facilityData && typeof facilityData === 'object' && !Array.isArray(facilityData)
    ? { ...facilityData }
    : facilityData;

  if (nextFacilityData && 'broker' in nextFacilityData) {
    delete nextFacilityData.broker;
  }

  return {
    ...rest,
    facilityData: nextFacilityData
  };
};

export const getCustomerDealSummary = async (req, res, next) => {
  try {
    const where = { customerId: Number(req.auth.sub) };
    const [summary, latest] = await Promise.all([
      createDealSummary(where),
      listDeals({ where, page: 1, limit: 4 })
    ]);

    return res.status(200).json({
      summary,
      latest: latest.items.map(sanitizeCustomerDeal)
    });
  } catch (error) {
    return next(error);
  }
};

export const listCustomerDeals = async (req, res, next) => {
  try {
    const { page, limit } = getPagination(req.query);
    const where = { customerId: Number(req.auth.sub) };

    if (req.query.status) {
      where.status = req.query.status;
    }

    if (req.query.step) {
      where.step = req.query.step;
    }

    const result = await listDeals({ where, page, limit });
    return res.status(200).json({
      ...result,
      items: (result.items || []).map(sanitizeCustomerDeal)
    });
  } catch (error) {
    return next(error);
  }
};

export const getCustomerDeal = async (req, res, next) => {
  try {
    const item = await findDealById(req.params.id, { customerId: Number(req.auth.sub) });

    if (!item) {
      return res.status(404).json({ message: 'معامله یافت نشد' });
    }

    return res.status(200).json({ item: sanitizeCustomerDeal(item) });
  } catch (error) {
    return next(error);
  }
};

export const createCustomerDealRequest = async (req, res, next) => {
  try {
    const facility = await loadFacilityForDeal(req.body.facilityId);

    if (!facility || facility.status !== Facility.STATUSES.PUBLISHED) {
      return res.status(404).json({ message: 'امتیاز وام موردنظر در دسترس نیست' });
    }

    const created = await sequelize.transaction(async (transaction) => {
      const deal = await createDealForCustomer({
        customerId: req.auth.sub,
        facility,
        requestedAmount: req.body.requestedAmount,
        installmentMonths: req.body.installmentMonths,
        interestRate: req.body.interestRate,
        transaction
      });
      
      return deal.id;
    });

    const d = await loadDealById(created, { customerId: Number(req.auth.sub) });
    const serializedItem = await serializeDeal(d);
    const item = sanitizeCustomerDeal(serializedItem);

    if (serializedItem.step === Deal.STEPS.VERIFY_BROKER) {
      await createNotification({
        category: Notification.CATEGORIES.ATTENTION,
        title: 'درخواست جدید معامله وام',
        body: `یک درخواست جدید برای «${serializedItem.facility?.title || serializedItem.facilityData?.title || 'وام'}» آماده بررسی شماست.`,
        modelType: Notification.MODEL_TYPES.BROKER,
        modelId: serializedItem.brokerId,
        senderType: Notification.MODEL_TYPES.CUSTOMER,
        senderId: serializedItem.customerId,
        metadata: buildDealNotificationMetadata({
          dealId: serializedItem.id,
          recipientType: Notification.MODEL_TYPES.BROKER
        })
      }).catch(() => null);
    }

    return res.status(201).json({
      message: serializedItem.step === Deal.STEPS.VERIFY_BROKER ? 'درخواست معامله ثبت شد و برای کارگزار ارسال شد' : 'معامله ایجاد شد، لطفا مدارک را تکمیل و ارسال کنید',
      item
    });
  } catch (error) {
    return next(error);
  }
};

export const upsertCustomerDealDocuments = async (req, res, next) => {
  try {
    const deal = await loadDealById(req.params.id, { customerId: Number(req.auth.sub) });

    if (!deal) {
      return res.status(404).json({ message: 'معامله یافت نشد' });
    }

    if (deal.status !== 'in_progress' || deal.step !== 'submit' || deal.actBy !== 'customer') {
      return res.status(422).json({ message: 'در وضعیت فعلی امکان ثبت یا ویرایش مدارک وجود ندارد' });
    }

    const submit = String(req.body.submit || '').trim() === '1' || req.body.submit === true || req.body.submit === 'true';

    const updated = await sequelize.transaction(async (transaction) => {
      await saveDealDocuments({
        deal,
        fields: req.body.fields,
        files: req.files,
        submit,
        transaction
      });

      return await loadDealById(deal.id, { customerId: Number(req.auth.sub) });
    });

    const serializedItem = await serializeDeal(updated);
    const item = sanitizeCustomerDeal(serializedItem);

    if (submit) {
      await createNotification({
        category: Notification.CATEGORIES.ATTENTION,
        title: 'مدارک معامله ارسال شد',
        body: `مدارک معامله «${serializedItem.facility?.title || serializedItem.facilityData?.title || 'وام'}» توسط مشتری تکمیل و ارسال شد.`,
        modelType: Notification.MODEL_TYPES.BROKER,
        modelId: serializedItem.brokerId,
        senderType: Notification.MODEL_TYPES.CUSTOMER,
        senderId: serializedItem.customerId,
        metadata: buildDealNotificationMetadata({
          dealId: serializedItem.id,
          recipientType: Notification.MODEL_TYPES.BROKER
        })
      }).catch(() => null);
    }

    return res.status(200).json({
      message: submit ? 'مدارک با موفقیت ارسال شد و معامله وارد مرحله بررسی کارگزار شد' : 'اطلاعات معامله ذخیره شد',
      item
    });
  } catch (error) {
    return next(error);
  }
};

export const requestCustomerDealContractOtp = async (req, res, next) => {
  try {
    const deal = await loadDealById(req.params.id, { customerId: Number(req.auth.sub) });

    if (!deal) {
      return res.status(404).json({ message: 'معامله یافت نشد' });
    }

    const payload = await requestDealContractOtp({
      deal,
      actorType: 'customer',
      actorPhone: deal.customer?.phone,
      actorName: deal.customer?.name
    });

    return res.status(200).json(payload);
  } catch (error) {
    return next(error);
  }
};

export const signCustomerDealContract = async (req, res, next) => {
  try {
    const deal = await loadDealById(req.params.id, { customerId: Number(req.auth.sub) });

    if (!deal) {
      return res.status(404).json({ message: 'معامله یافت نشد' });
    }

    const updated = await sequelize.transaction(async (transaction) => {
      await signDealContract({
        deal,
        actorType: 'customer',
        actorId: Number(req.auth.sub),
        actorName: deal.customer?.name,
        actorPhone: deal.customer?.phone,
        code: req.body.code,
        signature: req.body.signature,
        transaction
      });

      return loadDealById(deal.id, { customerId: Number(req.auth.sub) });
    });

    const serializedItem = await serializeDeal(updated);
    const item = sanitizeCustomerDeal(serializedItem);

    const bothSigned = item.contractSignedByCustomer && item.contractSignedByBroker;
    const notificationBody = bothSigned
      ? item.step === Deal.STEPS.TRANSFER
        ? `قرارداد معامله «${item.facility?.title || 'وام'}» توسط هر دو طرف امضا شد و پرونده وارد مرحله انتقال امتیاز شد.`
        : `قرارداد معامله «${item.facility?.title || 'وام'}» توسط هر دو طرف امضا شد و پرونده وارد مرحله پرداخت شد.`
      : `مشتری قرارداد معامله «${item.facility?.title || 'وام'}» را امضا کرد. در انتظار امضای شما.`;
    await createNotification({
      category: bothSigned ? Notification.CATEGORIES.ATTENTION : Notification.CATEGORIES.INFO,
      title: bothSigned ? 'قرارداد معامله امضا شد' : 'امضای قرارداد توسط مشتری',
      body: notificationBody,
      modelType: Notification.MODEL_TYPES.BROKER,
      modelId: serializedItem.brokerId,
      senderType: Notification.MODEL_TYPES.CUSTOMER,
      senderId: serializedItem.customerId,
      metadata: buildDealNotificationMetadata({
        dealId: serializedItem.id,
        recipientType: Notification.MODEL_TYPES.BROKER
      })
    }).catch(() => null);

    return res.status(200).json({
      message: item.contractSignedByCustomer && item.contractSignedByBroker
        ? item.step === Deal.STEPS.TRANSFER
          ? 'امضای قرارداد ثبت شد و معامله وارد مرحله انتقال شد'
          : 'امضای قرارداد ثبت شد و معامله وارد مرحله پرداخت شد'
        : 'امضای مشتری ثبت شد و وضعیت قرارداد به‌روزرسانی شد',
      item
    });
  } catch (error) {
    return next(error);
  }
};

export const requestCustomerDealTransferOtp = async (req, res, next) => {
  try {
    const deal = await loadDealById(req.params.id, { customerId: Number(req.auth.sub) });

    if (!deal) {
      return res.status(404).json({ message: 'معامله یافت نشد' });
    }

    const payload = await requestDealTransferOtp({
      deal,
      actorPhone: deal.customer?.phone,
      actorName: deal.customer?.name
    });

    return res.status(200).json(payload);
  } catch (error) {
    return next(error);
  }
};

export const confirmCustomerDealTransfer = async (req, res, next) => {
  try {
    const deal = await loadDealById(req.params.id, { customerId: Number(req.auth.sub) });

    if (!deal) {
      return res.status(404).json({ message: 'معامله یافت نشد' });
    }

    const updated = await sequelize.transaction(async (transaction) => {
      await confirmDealTransferByCustomer({
        deal,
        customerId: Number(req.auth.sub),
        actorName: deal.customer?.name || req.auth.name || 'مشتری',
        actorPhone: deal.customer?.phone,
        code: req.body.code,
        transaction
      });

      return loadDealById(deal.id, { customerId: Number(req.auth.sub) });
    });

    const serializedItem = await serializeDeal(updated);
    const item = sanitizeCustomerDeal(serializedItem);

    await createNotification({
      category: Notification.CATEGORIES.ATTENTION,
      title: 'انتقال امتیاز تایید شد',
      body: `مشتری انتقال امتیاز معامله «${serializedItem.facility?.title || serializedItem.facilityData?.title || 'وام'}» را تایید کرد و پرونده نهایی شد.`,
      modelType: Notification.MODEL_TYPES.BROKER,
      modelId: serializedItem.brokerId,
      senderType: Notification.MODEL_TYPES.CUSTOMER,
      senderId: serializedItem.customerId,
      metadata: buildDealNotificationMetadata({
        dealId: serializedItem.id,
        recipientType: Notification.MODEL_TYPES.BROKER
      })
    }).catch(() => null);

    return res.status(200).json({
      message: 'انتقال امتیاز تایید شد و معامله با موفقیت نهایی شد',
      item
    });
  } catch (error) {
    return next(error);
  }
};

export const requestCustomerDealAdminReview = async (req, res, next) => {
  try {
    const deal = await loadDealById(req.params.id, { customerId: Number(req.auth.sub) });

    if (!deal) {
      return res.status(404).json({ message: 'معامله یافت نشد' });
    }

    const updated = await sequelize.transaction(async (transaction) => {
      await requestDealAdminReviewByCustomer({
        deal,
        customerId: Number(req.auth.sub),
        actorName: deal.customer?.name || req.auth.name || 'مشتری',
        reason: req.body.reason,
        transaction
      });

      return loadDealById(deal.id, { customerId: Number(req.auth.sub) });
    });

    const serializedItem = await serializeDeal(updated);
    const item = sanitizeCustomerDeal(serializedItem);
    const title = 'پرونده وارد بررسی مدیریت شد';
    const body = `درخواست بررسی مدیریت برای معامله «${serializedItem.facility?.title || serializedItem.facilityData?.title || 'وام'}» ثبت شد و تا پایان بررسی، پرونده قفل است.`;

    await Promise.all([
      createNotification({
        category: Notification.CATEGORIES.ATTENTION,
        title,
        body,
        modelType: Notification.MODEL_TYPES.CUSTOMER,
        modelId: serializedItem.customerId,
        senderType: Notification.MODEL_TYPES.CUSTOMER,
        senderId: serializedItem.customerId,
        metadata: buildDealNotificationMetadata({
          dealId: serializedItem.id,
          recipientType: Notification.MODEL_TYPES.CUSTOMER
        })
      }).catch(() => null),
      createNotification({
        category: Notification.CATEGORIES.ATTENTION,
        title,
        body,
        modelType: Notification.MODEL_TYPES.BROKER,
        modelId: serializedItem.brokerId,
        senderType: Notification.MODEL_TYPES.CUSTOMER,
        senderId: serializedItem.customerId,
        metadata: buildDealNotificationMetadata({
          dealId: serializedItem.id,
          recipientType: Notification.MODEL_TYPES.BROKER
        })
      }).catch(() => null)
    ]);

    return res.status(200).json({
      message: 'درخواست بررسی مدیریت ثبت شد',
      item
    });
  } catch (error) {
    return next(error);
  }
};

export const rateBrokerForDeal = async (req, res, next) => {
  try {
    const deal = await loadDealById(req.params.id, { customerId: Number(req.auth.sub) });

    if (!deal) {
      return res.status(404).json({ message: 'معامله یافت نشد' });
    }

    if (deal.status !== Deal.STATUSES.DONE || deal.step !== Deal.STEPS.FINISHED) {
      return res.status(422).json({ message: 'امتیازدهی فقط پس از اتمام معامله امکان‌پذیر است' });
    }

    if (!deal.brokerId) {
      return res.status(422).json({ message: 'کارگزاری برای این معامله ثبت نشده است' });
    }

    const existing = await BrokerRate.findOne({ where: { dealId: deal.id } });
    if (existing) {
      return res.status(422).json({ message: 'شما قبلاً برای این معامله امتیاز ثبت کرده‌اید' });
    }

    const score = Number(req.body.score);
    const comment = (req.body.comment || '').trim().slice(0, 1000) || null;

    await sequelize.transaction(async (transaction) => {
      await BrokerRate.create({
        dealId: deal.id,
        brokerId: deal.brokerId,
        customerId: Number(req.auth.sub),
        score,
        comment
      }, { transaction });

      const avg = await BrokerRate.findOne({
        where: { brokerId: deal.brokerId },
        attributes: [[sequelize.fn('AVG', sequelize.col('score')), 'avgScore']],
        raw: true,
        transaction
      });

      await Broker.update(
        { rate: Number(Number(avg?.avgScore || score).toFixed(2)) },
        { where: { id: deal.brokerId }, transaction }
      );
    });

    return res.status(200).json({ message: 'امتیاز شما با موفقیت ثبت شد' });
  } catch (error) {
    return next(error);
  }
};