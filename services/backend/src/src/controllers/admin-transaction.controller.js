import { Op } from 'sequelize';
import { Broker } from '../models/broker.model.js';
import { Customer } from '../models/customer.model.js';
import { Invoice } from '../models/invoice.model.js';
import { Transaction } from '../models/transaction.model.js';
import { User } from '../models/user.model.js';
import { Wallet } from '../models/wallet.model.js';
import { paymentStatusLabel } from '../services/payment/enums/payment-status.js';
import { serializeWallet } from '../services/wallet.service.js';
import { createPaginationResult, getPagination } from '../utils/pagination.js';

const HOLDER_LABELS = {
  [Wallet.HOLDER_TYPES.ADMIN]: 'ادمین',
  [Wallet.HOLDER_TYPES.BROKER]: 'کارگزار',
  [Wallet.HOLDER_TYPES.CUSTOMER]: 'مشتری'
};

const INVOICE_USER_MODEL_LABELS = {
  [Invoice.USER_MODELS.ADMIN]: 'ادمین',
  [Invoice.USER_MODELS.BROKER]: 'کارگزار',
  [Invoice.USER_MODELS.CUSTOMER]: 'مشتری'
};

const TRANSACTION_TYPE_LABELS = {
  [Transaction.TYPES.DEPOSIT]: 'واریز',
  [Transaction.TYPES.WITHDRAW]: 'برداشت'
};

const PAYABLE_TYPE_LABELS = {
  invoice: 'شارژ کیف پول',
  customer_validation: 'هزینه اعتبارسنجی',
  deal_cash_payment: 'پرداخت نقدی معامله',
  deal_settlement: 'تسویه حساب معامله',
  broker_confirmation: 'پیش‌پرداخت معامله',
  broker_withdrawal: 'درخواست برداشت',
  withdrawal_refund: 'استرداد برداشت',
  admin_deposit: 'واریز توسط ادمین',
  admin_withdraw: 'برداشت توسط ادمین'
};

const normalizeSearch = (value) => String(value || '').trim();
const uniqueNumbers = (items = []) => [...new Set(items.map((item) => Number(item)).filter(Boolean))];
const isNumeric = (value) => /^\d+$/.test(String(value || '').trim());

const normalizeHolderType = (value) => {
  const holderType = normalizeSearch(value);
  return Object.values(Wallet.HOLDER_TYPES).includes(holderType) ? holderType : '';
};

const resolveConfirmed = (value) => {
  const normalized = String(value ?? '').trim().toLowerCase();

  if (!normalized) {
    return null;
  }

  if (['1', 'true', 'yes'].includes(normalized)) {
    return true;
  }

  if (['0', 'false', 'no'].includes(normalized)) {
    return false;
  }

  return null;
};

const driverLabel = (value) => {
  const driver = String(value || '').toLowerCase();

  if (driver.includes('zarin')) {
    return 'زرین پال';
  }

  return value || '-';
};

const buildHolderMaps = async (wallets = []) => {
  const brokerIds = uniqueNumbers(wallets.filter((item) => item.holderType === Wallet.HOLDER_TYPES.BROKER).map((item) => item.holderId));
  const customerIds = uniqueNumbers(wallets.filter((item) => item.holderType === Wallet.HOLDER_TYPES.CUSTOMER).map((item) => item.holderId));
  const adminIds = uniqueNumbers(wallets.filter((item) => item.holderType === Wallet.HOLDER_TYPES.ADMIN).map((item) => item.holderId));

  const [brokers, customers, admins] = await Promise.all([
    brokerIds.length
      ? Broker.findAll({ where: { id: brokerIds }, attributes: ['id', 'name', 'phone', 'nationalCode'] })
      : [],
    customerIds.length
      ? Customer.findAll({ where: { id: customerIds }, attributes: ['id', 'name', 'phone', 'nationalCode'] })
      : [],
    adminIds.length
      ? User.findAll({ where: { id: adminIds }, attributes: ['id', 'name', 'phone', 'nationalId', 'email'] })
      : []
  ]);

  return {
    [Wallet.HOLDER_TYPES.BROKER]: new Map(brokers.map((item) => [Number(item.id), item])),
    [Wallet.HOLDER_TYPES.CUSTOMER]: new Map(customers.map((item) => [Number(item.id), item])),
    [Wallet.HOLDER_TYPES.ADMIN]: new Map(admins.map((item) => [Number(item.id), item]))
  };
};

const resolveHolder = (wallet, holderMaps) => {
  if (!wallet) {
    return {
      holderType: null,
      holderTypeLabel: '-',
      holderId: null,
      holderName: '-',
      holderPhone: '-',
      holderNationalCode: '-'
    };
  }
  const holder = holderMaps[wallet.holderType]?.get(Number(wallet.holderId));
  const nationalCode = wallet.holderType === Wallet.HOLDER_TYPES.ADMIN ? holder?.nationalId : holder?.nationalCode;

  return {
    holderType: wallet.holderType,
    holderTypeLabel: HOLDER_LABELS[wallet.holderType] || wallet.holderType,
    holderId: Number(wallet.holderId),
    holderName: holder?.name || '-',
    holderPhone: holder?.phone || holder?.email || '-',
    holderNationalCode: nationalCode || '-'
  };
};

const resolveInvoiceUserModel = (invoice) => {
  const fallback = String(invoice?.payableData?.holderType || invoice?.payableData?.userModel || '').trim().toLowerCase();
  const model = String(invoice?.userModel || '').trim().toLowerCase() || fallback;
  return Object.values(Invoice.USER_MODELS).includes(model) ? model : null;
};

const buildInvoiceUserMaps = async (invoices = []) => {
  const brokerIds = uniqueNumbers(
    invoices.filter((item) => resolveInvoiceUserModel(item) === Invoice.USER_MODELS.BROKER).map((item) => item.userId)
  );
  const customerIds = uniqueNumbers(
    invoices.filter((item) => resolveInvoiceUserModel(item) === Invoice.USER_MODELS.CUSTOMER).map((item) => item.userId)
  );
  const adminIds = uniqueNumbers(
    invoices.filter((item) => resolveInvoiceUserModel(item) === Invoice.USER_MODELS.ADMIN).map((item) => item.userId)
  );

  const [brokers, customers, admins] = await Promise.all([
    brokerIds.length
      ? Broker.findAll({ where: { id: brokerIds }, attributes: ['id', 'name', 'phone', 'nationalCode'] })
      : [],
    customerIds.length
      ? Customer.findAll({ where: { id: customerIds }, attributes: ['id', 'name', 'phone', 'nationalCode'] })
      : [],
    adminIds.length
      ? User.findAll({ where: { id: adminIds }, attributes: ['id', 'name', 'phone', 'nationalId', 'email'] })
      : []
  ]);

  return {
    [Invoice.USER_MODELS.BROKER]: new Map(brokers.map((item) => [Number(item.id), item])),
    [Invoice.USER_MODELS.CUSTOMER]: new Map(customers.map((item) => [Number(item.id), item])),
    [Invoice.USER_MODELS.ADMIN]: new Map(admins.map((item) => [Number(item.id), item]))
  };
};

const resolveInvoicePayer = (invoice, payerMaps) => {
  const userModel = resolveInvoiceUserModel(invoice);
  const payer = userModel ? payerMaps[userModel]?.get(Number(invoice.userId)) : null;
  const nationalCode = userModel === Invoice.USER_MODELS.ADMIN ? payer?.nationalId : payer?.nationalCode;

  return {
    userId: invoice?.userId ? Number(invoice.userId) : null,
    userModel,
    userModelLabel: userModel ? INVOICE_USER_MODEL_LABELS[userModel] || userModel : '-',
    payerName: payer?.name || [invoice?.firstName, invoice?.lastName].filter(Boolean).join(' ').trim() || '-',
    payerPhone: payer?.phone || payer?.email || '-',
    payerNationalCode: nationalCode || invoice?.nationalCode || '-'
  };
};

const buildHolderSearchQueries = async (search, holderType = '') => {
  const normalizedSearch = normalizeSearch(search);

  if (!normalizedSearch) {
    return [];
  }

  const likeSearch = `%${normalizedSearch}%`;

  const [brokers, customers, admins] = await Promise.all([
    !holderType || holderType === Wallet.HOLDER_TYPES.BROKER
      ? Broker.findAll({
          where: {
            [Op.or]: [
              { name: { [Op.like]: likeSearch } },
              { phone: { [Op.like]: likeSearch } },
              { nationalCode: { [Op.like]: likeSearch } }
            ]
          },
          attributes: ['id']
        })
      : [],
    !holderType || holderType === Wallet.HOLDER_TYPES.CUSTOMER
      ? Customer.findAll({
          where: {
            [Op.or]: [
              { name: { [Op.like]: likeSearch } },
              { phone: { [Op.like]: likeSearch } },
              { nationalCode: { [Op.like]: likeSearch } }
            ]
          },
          attributes: ['id']
        })
      : [],
    !holderType || holderType === Wallet.HOLDER_TYPES.ADMIN
      ? User.findAll({
          where: {
            role: 'admin',
            [Op.or]: [
              { name: { [Op.like]: likeSearch } },
              { phone: { [Op.like]: likeSearch } },
              { email: { [Op.like]: likeSearch } },
              { nationalId: { [Op.like]: likeSearch } }
            ]
          },
          attributes: ['id']
        })
      : []
  ]);

  const conditions = [];

  if (brokers.length) {
    conditions.push({
      holderType: Wallet.HOLDER_TYPES.BROKER,
      holderId: { [Op.in]: brokers.map((item) => Number(item.id)) }
    });
  }

  if (customers.length) {
    conditions.push({
      holderType: Wallet.HOLDER_TYPES.CUSTOMER,
      holderId: { [Op.in]: customers.map((item) => Number(item.id)) }
    });
  }

  if (admins.length) {
    conditions.push({
      holderType: Wallet.HOLDER_TYPES.ADMIN,
      holderId: { [Op.in]: admins.map((item) => Number(item.id)) }
    });
  }

  return conditions;
};

const findWalletIds = async ({ search = '', holderType = '' }) => {
  const normalizedSearch = normalizeSearch(search);
  const normalizedHolderType = normalizeHolderType(holderType);
  const where = {};

  if (normalizedHolderType) {
    where.holderType = normalizedHolderType;
  }

  if (normalizedSearch) {
    const holderConditions = await buildHolderSearchQueries(normalizedSearch, normalizedHolderType);
    const orConditions = [...holderConditions, { uuid: { [Op.like]: `%${normalizedSearch}%` } }];

    if (isNumeric(normalizedSearch)) {
      orConditions.push({ id: Number(normalizedSearch) });
    }

    where[Op.or] = orConditions;
  }

  const wallets = await Wallet.findAll({
    where,
    attributes: ['id']
  });

  return wallets.map((item) => Number(item.id));
};

const serializeInvoice = (invoice, wallet, holder, payer) => ({
  id: invoice.id,
  driver: invoice.driver,
  driverLabel: driverLabel(invoice.driver),
  status: invoice.status,
  statusLabel: paymentStatusLabel(invoice.status),
  transactionId: invoice.transactionId,
  paymentRef: invoice.paymentRef,
  amount: String(invoice.amount || 0),
  discount: String(invoice.discount || 0),
  totalAmount: String(invoice.totalAmount || 0),
  paidAt: invoice.paidAt,
  firstName: invoice.firstName,
  lastName: invoice.lastName,
  nationalCode: invoice.nationalCode,
  ip: invoice.ip,
  userModel: payer.userModel,
  userModelLabel: payer.userModelLabel,
  subjectLabel: PAYABLE_TYPE_LABELS[invoice.payableType] || invoice.payableType || null,
  payableType: invoice.payableType,
  payableId: invoice.payableId,
  createdAt: invoice.createdAt,
  updatedAt: invoice.updatedAt,
  wallet: wallet ? serializeWallet(wallet) : null,
  ...payer,
  ...holder
});

const serializeWalletTransaction = (transaction, wallet, holder, relatedInvoice, relatedInvoicePayer) => ({
  id: transaction.id,
  uuid: transaction.uuid,
  type: transaction.type,
  typeLabel: TRANSACTION_TYPE_LABELS[transaction.type] || transaction.type,
  payableType: transaction.payableType || null,
  subjectLabel: PAYABLE_TYPE_LABELS[transaction.payableType] || null,
  subject: String(transaction.meta?.description || '').trim() || null,
  amount: String(transaction.amount || 0),
  confirmed: Boolean(transaction.confirmed),
  wallet: wallet ? serializeWallet(wallet) : null,
  invoiceId: relatedInvoice?.id || null,
  invoiceTransactionId: relatedInvoice?.transactionId || transaction.meta?.transactionId || null,
  invoicePaymentRef: relatedInvoice?.paymentRef || transaction.meta?.paymentRef || null,
  invoiceStatus: relatedInvoice?.status || null,
  invoiceStatusLabel: relatedInvoice?.status ? paymentStatusLabel(relatedInvoice.status) : null,
  invoiceUserModel: relatedInvoicePayer?.userModel || null,
  invoiceUserModelLabel: relatedInvoicePayer?.userModelLabel || null,
  invoicePayerName: relatedInvoicePayer?.payerName || null,
  invoicePayerPhone: relatedInvoicePayer?.payerPhone || null,
  invoicePayerNationalCode: relatedInvoicePayer?.payerNationalCode || null,
  createdAt: transaction.createdAt,
  updatedAt: transaction.updatedAt,
  ...holder
});

export const listAdminInvoiceTransactions = async (req, res, next) => {
  try {
    const search = normalizeSearch(req.query.search);
    const status = normalizeSearch(req.query.status);
    const holderType = normalizeHolderType(req.query.holderType);
    const { page, limit, offset } = getPagination(req.query);
    const where = {};

    if (status) {
      where.status = status;
    }

    if (holderType) {
      where.userModel = holderType;
    }

    if (search) {
      const directFilters = [
        { transactionId: { [Op.like]: `%${search}%` } },
        { paymentRef: { [Op.like]: `%${search}%` } },
        { nationalCode: { [Op.like]: `%${search}%` } },
        { firstName: { [Op.like]: `%${search}%` } },
        { lastName: { [Op.like]: `%${search}%` } }
      ];

      if (isNumeric(search)) {
        directFilters.push({ id: Number(search) });
      }

      const searchWalletIds = await findWalletIds({ search, holderType });

      if (searchWalletIds.length) {
        directFilters.push({
          payableType: 'wallet',
          payableId: { [Op.in]: searchWalletIds }
        });
      }

      where[Op.or] = directFilters;
    }

    const { rows, count } = await Invoice.findAndCountAll({
      where,
      order: [['id', 'DESC']],
      limit,
      offset
    });

    const walletIds = uniqueNumbers(
      rows.filter((item) => item.payableType === 'wallet').map((item) => item.payableId)
    );
    const wallets = walletIds.length
      ? await Wallet.findAll({ where: { id: walletIds } })
      : [];
    const walletMap = new Map(wallets.map((item) => [Number(item.id), item]));
    const holderMaps = await buildHolderMaps(wallets);
    const payerMaps = await buildInvoiceUserMaps(rows);

    const items = rows.map((item) => {
      const wallet = walletMap.get(Number(item.payableId));
      return serializeInvoice(item, wallet, resolveHolder(wallet, holderMaps), resolveInvoicePayer(item, payerMaps));
    });

    return res.status(200).json(createPaginationResult({ items, total: count, page, limit }));
  } catch (error) {
    return next(error);
  }
};

export const listAdminWalletTransactions = async (req, res, next) => {
  try {
    const search = normalizeSearch(req.query.search);
    const type = normalizeSearch(req.query.type);
    const holderType = normalizeHolderType(req.query.holderType);
    const confirmed = resolveConfirmed(req.query.confirmed);
    const { page, limit, offset } = getPagination(req.query);
    const where = {};

    if (type) {
      where.type = type;
    }

    if (confirmed !== null) {
      where.confirmed = confirmed;
    }

    if (holderType) {
      const holderWalletIds = await findWalletIds({ holderType });

      if (!holderWalletIds.length) {
        return res.status(200).json(createPaginationResult({ items: [], total: 0, page, limit }));
      }

      where.walletId = { [Op.in]: holderWalletIds };
    }

    if (search) {
      const directFilters = [{ uuid: { [Op.like]: `%${search}%` } }];

      if (isNumeric(search)) {
        directFilters.push({ id: Number(search) });
        directFilters.push({ payableId: Number(search) });
        directFilters.push({ amount: Number(search) });
      }

      const searchWalletIds = await findWalletIds({ search, holderType });
      if (searchWalletIds.length) {
        directFilters.push({ walletId: { [Op.in]: searchWalletIds } });
      }

      where[Op.or] = directFilters;
    }

    const { rows, count } = await Transaction.findAndCountAll({
      where,
      order: [['id', 'DESC']],
      limit,
      offset
    });

    const walletIds = uniqueNumbers(rows.map((item) => item.walletId));
    const wallets = walletIds.length
      ? await Wallet.findAll({ where: { id: walletIds } })
      : [];
    const walletMap = new Map(wallets.map((item) => [Number(item.id), item]));
    const holderMaps = await buildHolderMaps(wallets);
    const invoiceIds = uniqueNumbers(
      rows.filter((item) => item.payableType === 'invoice').map((item) => item.payableId)
    );
    const invoices = invoiceIds.length
      ? await Invoice.findAll({ where: { id: invoiceIds } })
      : [];
    const invoiceMap = new Map(invoices.map((item) => [Number(item.id), item]));
    const invoicePayerMaps = await buildInvoiceUserMaps(invoices);

    const items = rows.map((item) => {
      const wallet = walletMap.get(Number(item.walletId));
      const holder = resolveHolder(wallet, holderMaps);
      const relatedInvoice = item.payableType === 'invoice' ? invoiceMap.get(Number(item.payableId)) : null;
      const relatedInvoicePayer = relatedInvoice ? resolveInvoicePayer(relatedInvoice, invoicePayerMaps) : null;

      return serializeWalletTransaction(item, wallet, holder, relatedInvoice, relatedInvoicePayer);
    });

    return res.status(200).json(createPaginationResult({ items, total: count, page, limit }));
  } catch (error) {
    return next(error);
  }
};