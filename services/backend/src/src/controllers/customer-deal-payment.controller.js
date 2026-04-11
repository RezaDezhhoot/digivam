import path from 'node:path';
import { sequelize } from '../config/database.js';
import { env } from '../config/env.js';
import { DealPaymentType } from '../models/deal-payment-type.model.js';
import { File } from '../models/file.model.js';
import { Invoice } from '../models/invoice.model.js';
import { Zarin } from '../services/payment/drivers/zarin.js';
import { PaymentStatus } from '../services/payment/enums/payment-status.js';
import { Payment } from '../services/payment/payment.js';
import { toEnglishDigits } from '../utils/digits.js';
import { advanceDealPayment, findDealById, loadDealById, serializeDeal } from '../services/deal.service.js';
import { createNotification } from '../services/notification.service.js';
import { DEAL_PAYMENT_STATUSES, PaymentTypes } from '../constants/deal.js';

const DEAL_CASH_PAYMENT_PAYABLE_TYPE = 'deal_cash_payment';
const uploadsRoot = path.resolve(process.cwd(), 'src', 'uploads');

const getDealCashCallbackUrl = (dealId, paymentTypeId) =>
  `${String(env.webBaseUrl || '').replace(/\/+$/, '')}/customer/deals/${dealId}?cashVerify=1&paymentTypeId=${paymentTypeId}`;

export const uploadCheckPaymentFile = async (req, res, next) => {
  try {
    const dealId = Number(req.params.id);
    const paymentTypeId = Number(req.params.paymentTypeId);
    const customerId = Number(req.auth.sub);

    const deal = await loadDealById(dealId, { customerId });
    if (!deal) {
      return res.status(404).json({ message: 'پرونده معامله یافت نشد' });
    }

    const serialized = await serializeDeal(deal);

    if (serialized.status !== 'in_progress' || serialized.step !== 'payment') {
      return res.status(422).json({ message: 'معامله در مرحله پرداخت نیست' });
    }

    const paymentType = (serialized.paymentTypes || []).find((p) => p.id === paymentTypeId);
    if (!paymentType) {
      return res.status(404).json({ message: 'روش پرداخت یافت نشد' });
    }

    if (paymentType.paymentType !== PaymentTypes.CHECK) {
      return res.status(422).json({ message: 'این روش پرداخت از نوع چک نیست' });
    }

    const files = Array.isArray(req.files)
      ? req.files.filter(Boolean)
      : req.file
        ? [req.file]
        : [];

    if (!files.length) {
      return res.status(422).json({ message: 'فایل ارسال نشده است' });
    }

    const existingValues = paymentType.values && typeof paymentType.values === 'object' ? paymentType.values : {};
    const existingFileIds = [
      ...(Array.isArray(existingValues.fileIds) ? existingValues.fileIds : []),
      ...(Array.isArray(existingValues.files) ? existingValues.files.map((item) => item?.fileId) : []),
      existingValues.fileId
    ]
      .map((item) => Number(item || 0))
      .filter((item) => Number.isFinite(item) && item > 0);

    const uploadedFileIds = [];
    for (const file of files) {
      const relativePath = path.relative(uploadsRoot, file.path).replace(/\\/g, '/');

      const fileRecord = await File.create({
        fileableType: 'deal_payment',
        fileableId: paymentTypeId,
        subject: 'check_payment',
        path: relativePath,
        mimeType: file.mimetype,
        size: file.size,
        disk: 'local',
        status: 'processed',
        data: { originalName: file.originalname }
      });

      uploadedFileIds.push(Number(fileRecord.id));
    }

    const mergedFileIds = [...new Set([...existingFileIds, ...uploadedFileIds])];
    const primaryFileId = mergedFileIds[mergedFileIds.length - 1] || null;
    const { fileUrl: _legacyFileUrl, fileName: _legacyFileName, files: _legacyFiles, ...restValues } = existingValues;

    await DealPaymentType.update(
      {
        status: DEAL_PAYMENT_STATUSES.DONE,
        doneAt: new Date(),
        values: {
          ...restValues,
          fileId: primaryFileId,
          fileIds: mergedFileIds
        }
      },
      { where: { id: paymentTypeId, dealId } }
    );

    const updatedDeal = await findDealById(dealId, { customerId });
    return res.status(200).json({ message: `${uploadedFileIds.length} فایل پرداخت بارگذاری شد`, deal: updatedDeal });
  } catch (error) {
    return next(error);
  }
};

export const startDealCashPayment = async (req, res, next) => {
  try {
    const dealId = Number(req.params.id);
    const paymentTypeId = Number(req.params.paymentTypeId);
    const customerId = Number(req.auth.sub);

    const deal = await loadDealById(dealId, { customerId });
    if (!deal) {
      return res.status(404).json({ message: 'پرونده معامله یافت نشد' });
    }

    const serialized = await serializeDeal(deal);

    if (serialized.status !== 'in_progress' || serialized.step !== 'payment') {
      return res.status(422).json({ message: 'معامله در مرحله پرداخت نیست' });
    }

    const paymentTypeItem = (serialized.paymentTypes || []).find((p) => p.id === paymentTypeId);
    if (!paymentTypeItem) {
      return res.status(404).json({ message: 'روش پرداخت یافت نشد' });
    }

    if (paymentTypeItem.paymentType !== PaymentTypes.CASH) {
      return res.status(422).json({ message: 'این روش پرداخت از نوع نقدی نیست' });
    }

    if (paymentTypeItem.status === DEAL_PAYMENT_STATUSES.DONE) {
      return res.status(422).json({ message: 'این روش پرداخت قبلا انجام شده است' });
    }

    const amount = Number(paymentTypeItem.amount || 0);
    if (!amount || amount <= 0) {
      return res.status(422).json({ message: 'مبلغ پرداخت نامعتبر است' });
    }

    const customerPhone = deal.customer?.phone || '';
    const dealCode = serialized.dealCode || `DG-${dealId}`;

    const payment = Payment.make(
      new Zarin({
        holderType: 'customer',
        holderId: customerId,
        phone: customerPhone,
        description: `پرداخت نقدی معامله ${dealCode}`
      })
    )
      .amount(amount)
      .syncData(
        { customerId, dealId, paymentTypeId },
        { customerId, dealId, paymentTypeId, source: DEAL_CASH_PAYMENT_PAYABLE_TYPE }
      );

    const driver = await payment.makeInvoice(Invoice.build(), {
      userId: customerId,
      ip: req.ip,
      payableType: DEAL_CASH_PAYMENT_PAYABLE_TYPE,
      payableId: paymentTypeId
    });

    await driver.execute(
      {
        description: `پرداخت نقدی معامله ${dealCode}`,
        mobile: customerPhone
      },
      getDealCashCallbackUrl(dealId, paymentTypeId)
    );

    return res.status(201).json({
      message: 'لینک پرداخت ایجاد شد',
      paymentLink: driver.getPaymentLink()
    });
  } catch (error) {
    return next(error);
  }
};

export const verifyDealCashPayment = async (req, res, next) => {
  try {
    const dealId = Number(req.params.id);
    const paymentTypeId = Number(req.params.paymentTypeId);
    const customerId = Number(req.auth.sub);
    const authority = toEnglishDigits(String(req.body.Authority || req.query.Authority || '')).trim();
    const callbackStatus = String(req.body.Status || req.query.Status || '').trim().toUpperCase();

    if (!authority) {
      return res.status(422).json({ message: 'اطلاعات بازگشت پرداخت نامعتبر است' });
    }

    const invoice = await Invoice.findOne({
      where: {
        transactionId: authority,
        userId: customerId,
        payableType: DEAL_CASH_PAYMENT_PAYABLE_TYPE,
        payableId: paymentTypeId
      },
      order: [['id', 'DESC']]
    });

    if (!invoice) {
      return res.status(404).json({ message: 'فاکتور پرداخت یافت نشد' });
    }

    if (invoice.status === PaymentStatus.PAID) {
      const updatedDeal = await findDealById(dealId, { customerId });
      return res.status(200).json({ paid: true, message: 'این پرداخت قبلا تایید شده است', deal: updatedDeal });
    }

    if (callbackStatus !== 'OK') {
      if (invoice.status === PaymentStatus.PENDING) {
        invoice.status = PaymentStatus.ERROR;
        invoice.data = { ...(invoice.data || {}), callbackStatus };
        await invoice.save();
      }

      return res.status(200).json({ paid: false, message: 'پرداخت توسط کاربر لغو شد یا ناموفق بود' });
    }

    const deal = await loadDealById(dealId, { customerId });
    if (!deal) {
      return res.status(404).json({ message: 'پرونده معامله یافت نشد' });
    }

    const serialized = await serializeDeal(deal);
    const dealCode = serialized.dealCode || `DG-${dealId}`;

    const driver = await Payment.make(
      new Zarin({
        holderType: 'customer',
        holderId: customerId,
        phone: deal.customer?.phone || '',
        description: `پرداخت نقدی معامله ${dealCode}`
      })
    ).getInvoice(invoice);

    await driver.verify({ authority });

    if (driver.isSuccessful()) {
      await driver.success();
    }

    await invoice.reload();

    if (driver.isSuccessful()) {
      await DealPaymentType.update(
        {
          status: DEAL_PAYMENT_STATUSES.DONE,
          doneAt: new Date(),
          values: { authority, paidAt: new Date().toISOString() }
        },
        { where: { id: paymentTypeId, dealId } }
      );
    }

    const updatedDeal = await findDealById(dealId, { customerId });
    return res.status(200).json({
      paid: driver.isSuccessful(),
      message: driver.isSuccessful() ? 'پرداخت با موفقیت تایید شد' : 'تایید پرداخت ناموفق بود',
      deal: updatedDeal
    });
  } catch (error) {
    return next(error);
  }
};

export const advanceDealPaymentStage = async (req, res, next) => {
  const t = await sequelize.transaction();
  try {
    const dealId = Number(req.params.id);
    const customerId = Number(req.auth.sub);

    const deal = await loadDealById(dealId, { customerId });
    if (!deal) {
      await t.rollback();
      return res.status(404).json({ message: 'پرونده معامله یافت نشد' });
    }

    const serialized = await serializeDeal(deal);

    if (serialized.status !== 'in_progress' || serialized.step !== 'payment' || serialized.actBy !== 'customer') {
      await t.rollback();
      return res.status(422).json({ message: 'معامله در مرحله پرداخت مشتری نیست' });
    }

    const pending = (serialized.paymentTypes || []).filter((p) => p.status !== DEAL_PAYMENT_STATUSES.DONE);
    if (pending.length > 0) {
      await t.rollback();
      return res.status(422).json({ message: 'همه روش‌های پرداخت باید تکمیل شوند' });
    }

    await advanceDealPayment({ deal, customerId, transaction: t });
    await t.commit();

    const updatedDeal = await findDealById(dealId, { customerId });

    if (deal.brokerId) {
      createNotification({
        category: 'attention',
        title: 'پرداخت معامله تکمیل شد',
        body: `مشتری پرداخت‌های مرحله پرداخت را تکمیل کرد. پرونده وارد مرحله انتقال امتیاز شده است.`,
        modelType: 'broker',
        modelId: Number(deal.brokerId),
        senderType: 'customer',
        senderId: customerId
      }).catch(() => {});
    }

    return res.status(200).json({ message: 'مرحله پرداخت تکمیل شد', deal: updatedDeal });
  } catch (error) {
    await t.rollback();
    return next(error);
  }
};
