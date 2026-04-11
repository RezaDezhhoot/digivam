import { Broker } from '../models/broker.model.js';
import { Invoice } from '../models/invoice.model.js';
import { Transaction } from '../models/transaction.model.js';
import { Wallet } from '../models/wallet.model.js';
import { env } from '../config/env.js';
import { creditWallet, ensureWallet, normalizeMoneyAmount, serializeWallet } from '../services/wallet.service.js';
import { Zarin } from '../services/payment/drivers/zarin.js';
import { Payment } from '../services/payment/payment.js';
import { PaymentStatus, paymentStatusLabel } from '../services/payment/enums/payment-status.js';
import { toEnglishDigits } from '../utils/digits.js';
import { BROKER_WALLET_CHARGE_AMOUNTS } from '../validators/broker-wallet.validator.js';

const INVOICE_PAYABLE_TYPE = 'wallet';
const TRANSACTION_PAYABLE_TYPE = 'invoice';

const serializeTransaction = (item) => ({
  id: item.id,
  type: item.type,
  typeLabel: item.type === Transaction.TYPES.DEPOSIT ? 'واریز' : 'برداشت',
  amount: String(item.amount || 0),
  confirmed: Boolean(item.confirmed),
  createdAt: item.createdAt,
  updatedAt: item.updatedAt
});

const serializeInvoice = (invoice) => ({
  id: invoice.id,
  status: invoice.status,
  statusLabel: paymentStatusLabel(invoice.status),
  transactionId: invoice.transactionId,
  paymentRef: invoice.paymentRef,
  amount: String(invoice.amount || 0),
  totalAmount: String(invoice.totalAmount || 0),
  paidAt: invoice.paidAt,
  createdAt: invoice.createdAt,
  updatedAt: invoice.updatedAt
});

const splitName = (name) => {
  const normalized = String(name || '').trim();

  if (!normalized) {
    return { firstName: null, lastName: null };
  }

  const parts = normalized.split(/\s+/);

  if (parts.length === 1) {
    return { firstName: parts[0], lastName: null };
  }

  return {
    firstName: parts[0],
    lastName: parts.slice(1).join(' ')
  };
};

const getBrokerOrFail = async (brokerId) => {
  const broker = await Broker.findByPk(brokerId);

  if (!broker) {
    const error = new Error('کارگزار یافت نشد');
    error.status = 404;
    throw error;
  }

  return broker;
};

const getWalletForBroker = async (brokerId) =>
  ensureWallet({
    holderType: Wallet.HOLDER_TYPES.BROKER,
    holderId: brokerId
  });

const getBrokerCallbackUrl = () => `${String(env.brokerBaseUrl || '').replace(/\/+$/, '')}/validity`;

export const getBrokerWalletOverview = async (req, res, next) => {
  try {
    await getBrokerOrFail(req.auth.sub);
    const wallet = await getWalletForBroker(req.auth.sub);
    const transactions = await Transaction.findAll({
      where: {
        walletId: wallet.id,
        confirmed: true
      },
      order: [['id', 'DESC']],
      limit: 50
    });

    return res.status(200).json({
      wallet: serializeWallet(wallet),
      walletBalance: String(wallet.balance || 0),
      quickAmounts: BROKER_WALLET_CHARGE_AMOUNTS,
      transactions: transactions.map(serializeTransaction)
    });
  } catch (error) {
    return next(error);
  }
};

export const createBrokerWalletCharge = async (req, res, next) => {
  try {
    const broker = await getBrokerOrFail(req.auth.sub);
    const wallet = await getWalletForBroker(broker.id);
    const amount = normalizeMoneyAmount(req.body.amount);
    const { firstName, lastName } = splitName(broker.name);

    const payment = Payment.make(
      new Zarin({
        holderType: Wallet.HOLDER_TYPES.BROKER,
        holderId: broker.id,
        walletId: wallet.id,
        phone: broker.phone,
        description: 'شارژ کیف پول کارگزار'
      })
    )
      .amount(amount)
      .syncData(
        {
          firstName,
          lastName,
          nationalCode: broker.nationalCode || null
        },
        {
          walletId: wallet.id,
          holderType: Wallet.HOLDER_TYPES.BROKER,
          holderId: broker.id
        }
      );

    const driver = await payment.makeInvoice(Invoice.build(), {
      userId: broker.id,
      ip: req.ip,
      payableType: INVOICE_PAYABLE_TYPE,
      payableId: wallet.id
    });

    await driver.execute(
      {
        description: 'شارژ کیف پول کارگزار',
        mobile: broker.phone
      },
      getBrokerCallbackUrl()
    );

    return res.status(201).json({
      message: 'لینک پرداخت ایجاد شد',
      paymentLink: driver.getPaymentLink(),
      invoice: serializeInvoice(driver.getInvoice())
    });
  } catch (error) {
    return next(error);
  }
};

export const verifyBrokerWalletCharge = async (req, res, next) => {
  try {
    await getBrokerOrFail(req.auth.sub);
    const wallet = await getWalletForBroker(req.auth.sub);
    const authority = toEnglishDigits(String(req.body.Authority || '')).trim();
    const callbackStatus = String(req.body.Status || '').trim().toUpperCase();

    const invoice = await Invoice.findOne({
      where: {
        transactionId: authority,
        userId: req.auth.sub,
        payableType: INVOICE_PAYABLE_TYPE,
        payableId: wallet.id
      },
      order: [['id', 'DESC']]
    });

    if (!invoice) {
      return res.status(404).json({ message: 'فاکتور پرداخت یافت نشد' });
    }

    if (invoice.status === PaymentStatus.PAID) {
      await wallet.reload();

      return res.status(200).json({
        paid: true,
        message: 'این پرداخت قبلا تایید شده است',
        wallet: serializeWallet(wallet),
        walletBalance: String(wallet.balance || 0),
        invoice: serializeInvoice(invoice)
      });
    }

    if (callbackStatus !== 'OK') {
      if (invoice.status === PaymentStatus.PENDING) {
        invoice.status = PaymentStatus.ERROR;
        invoice.data = {
          ...(invoice.data || {}),
          callbackStatus
        };
        await invoice.save();
      }

      return res.status(200).json({
        paid: false,
        message: 'پرداخت توسط کاربر لغو شد یا ناموفق بود',
        wallet: serializeWallet(wallet),
        walletBalance: String(wallet.balance || 0),
        invoice: serializeInvoice(invoice)
      });
    }

    const driver = await Payment.make(
      new Zarin({
        holderType: Wallet.HOLDER_TYPES.BROKER,
        holderId: req.auth.sub,
        walletId: wallet.id,
        phone: req.auth.phone,
        description: 'شارژ کیف پول کارگزار'
      })
    ).getInvoice(invoice);

    await driver.verify({ authority });

    if (driver.isSuccessful()) {
      await driver.success(async (paidInvoice, transaction) => {
        await creditWallet({
          walletId: wallet.id,
          amount: paidInvoice.amount,
          payableType: TRANSACTION_PAYABLE_TYPE,
          payableId: paidInvoice.id,
          meta: {
            invoiceId: paidInvoice.id,
            transactionId: paidInvoice.transactionId,
            paymentRef: paidInvoice.paymentRef,
            source: 'zarinpal'
          },
          transaction
        });
      });
    }

    await Promise.all([invoice.reload(), wallet.reload()]);

    return res.status(200).json({
      paid: driver.isSuccessful(),
      message: driver.isSuccessful() ? 'پرداخت با موفقیت انجام شد' : 'پرداخت تایید نشد',
      wallet: serializeWallet(wallet),
      walletBalance: String(wallet.balance || 0),
      invoice: serializeInvoice(invoice)
    });
  } catch (error) {
    return next(error);
  }
};