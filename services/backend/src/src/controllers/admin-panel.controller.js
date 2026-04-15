import bcrypt from 'bcryptjs';
import { Op, QueryTypes } from 'sequelize';
import { Broker } from '../models/broker.model.js';
import { BrokerWithdrawal } from '../models/broker-withdrawal.model.js';
import { Customer } from '../models/customer.model.js';
import { Document } from '../models/document.model.js';
import { Facility } from '../models/facility.model.js';
import { Guarantee } from '../models/guarantee.model.js';
import { Invoice } from '../models/invoice.model.js';
import { Ticket } from '../models/ticket.model.js';
import { File } from '../models/file.model.js';
import { PageView } from '../models/page-view.model.js';
import { Transaction } from '../models/transaction.model.js';
import { Type } from '../models/type.model.js';
import { User } from '../models/user.model.js';
import { Validation } from '../models/validation.model.js';
import { Wallet } from '../models/wallet.model.js';
import { CustomerValidation } from '../models/customer-validation.model.js';
import { Deal } from '../models/deal.model.js';
import { env } from '../config/env.js';
import { createDealSummary } from '../services/deal.service.js';
import { createFacilityViewsSummary } from '../services/facility.service.js';
import { PaymentStatus } from '../services/payment/enums/payment-status.js';
import { TICKET_STATUS } from '../services/ticket.service.js';
import { ensureWallet, ensureWalletsForHolders, holderKey, serializeWallet } from '../services/wallet.service.js';
import { createPaginationResult, getPagination } from '../utils/pagination.js';
import { sequelize } from '../config/database.js';

const normalizeSearch = (value) => String(value || '').trim();

const avatarUrl = (file) => {
  if (!file) return null;
  const rawPath = String(file.path || '').replace(/\\/g, '/');
  if (/^https?:\/\//i.test(rawPath)) return rawPath;
  return `${env.backendBaseUrl}/uploads/${rawPath.replace(/^\/+/, '')}`;
};

const startOfToday = () => {
  const value = new Date();
  value.setHours(0, 0, 0, 0);
  return value;
};

const normalizeSuspendReason = (value) => {
  const normalized = String(value || '').trim();
  return normalized || null;
};

const attachWallets = async (items, holderType) => {
  const walletMap = await ensureWalletsForHolders(
    items.map((item) => ({ holderType, holderId: item.id }))
  );

  return items.map((item) => {
    const plain = item.toJSON();
    const wallet = serializeWallet(walletMap.get(holderKey(holderType, item.id)));

    return {
      ...plain,
      wallet,
      walletBalance: wallet.balance
    };
  });
};

export const getAdminDealAnalytics = async (req, res, next) => {
  try {
    const period = String(req.query.period || 'daily');
    const now = new Date();
    let startDate;
    let bucketExpression;
    let advanceCursor;
    let formatBucketKey;
    let formatLabel;

    const startOfDay = (value) => {
      const nextValue = new Date(value);
      nextValue.setHours(0, 0, 0, 0);
      return nextValue;
    };

    const startOfWeek = (value) => {
      const nextValue = startOfDay(value);
      nextValue.setDate(nextValue.getDate() - nextValue.getDay());
      return nextValue;
    };

    const startOfMonth = (value) => {
      const nextValue = startOfDay(value);
      nextValue.setDate(1);
      return nextValue;
    };

    const startOfYear = (value) => {
      const nextValue = startOfDay(value);
      nextValue.setMonth(0, 1);
      return nextValue;
    };

    const formatDateKey = (value) => {
      const year = value.getFullYear();
      const month = `${value.getMonth() + 1}`.padStart(2, '0');
      const day = `${value.getDate()}`.padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    const formatWeekLabel = (value) => {
      const firstDayOfYear = new Date(value.getFullYear(), 0, 1);
      const diffInDays = Math.floor((startOfDay(value) - startOfWeek(firstDayOfYear)) / 86400000);
      const weekNumber = Math.floor(diffInDays / 7) + 1;
      return `${value.getFullYear()}-W${String(weekNumber).padStart(2, '0')}`;
    };

    switch (period) {
      case 'daily':
        startDate = startOfDay(new Date(now));
        startDate.setDate(startDate.getDate() - 29);
        bucketExpression = 'DATE(d.created_at)';
        advanceCursor = (value) => value.setDate(value.getDate() + 1);
        formatBucketKey = (value) => formatDateKey(value);
        formatLabel = (value) => formatDateKey(value);
        break;
      case 'weekly':
        startDate = startOfWeek(new Date(now));
        startDate.setDate(startDate.getDate() - (11 * 7));
        bucketExpression = 'DATE(DATE_SUB(d.created_at, INTERVAL DAYOFWEEK(d.created_at) - 1 DAY))';
        advanceCursor = (value) => value.setDate(value.getDate() + 7);
        formatBucketKey = (value) => formatDateKey(value);
        formatLabel = (value) => formatWeekLabel(value);
        break;
      case 'monthly':
        startDate = startOfMonth(new Date(now));
        startDate.setMonth(startDate.getMonth() - 11);
        bucketExpression = "DATE(DATE_FORMAT(d.created_at, '%Y-%m-01'))";
        advanceCursor = (value) => value.setMonth(value.getMonth() + 1);
        formatBucketKey = (value) => `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-01`;
        formatLabel = (value) => `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}`;
        break;
      case 'yearly':
        startDate = startOfYear(new Date(now));
        startDate.setFullYear(startDate.getFullYear() - 4);
        bucketExpression = "DATE(CONCAT(YEAR(d.created_at), '-01-01'))";
        advanceCursor = (value) => value.setFullYear(value.getFullYear() + 1);
        formatBucketKey = (value) => `${value.getFullYear()}-01-01`;
        formatLabel = (value) => String(value.getFullYear());
        break;
      default:
        startDate = startOfDay(new Date(now));
        startDate.setDate(startDate.getDate() - 29);
        bucketExpression = 'DATE(d.created_at)';
        advanceCursor = (value) => value.setDate(value.getDate() + 1);
        formatBucketKey = (value) => formatDateKey(value);
        formatLabel = (value) => formatDateKey(value);
    }

    const query = `
      SELECT
        ${bucketExpression} AS bucketDate,
        SUM(d.broker_confirmation_amount) AS totalAmount,
        COUNT(*) AS dealCount
      FROM deals d
      WHERE d.broker_confirmation_amount > 0
        AND d.created_at >= ?
      GROUP BY ${bucketExpression}
      ORDER BY ${bucketExpression} ASC
    `;

    const rows = await sequelize.query(query, {
      replacements: [startDate],
      type: QueryTypes.SELECT
    });

    const amountMap = new Map(
      rows.map((row) => [String(row.bucketDate).slice(0, 10), Number(row.totalAmount || 0)])
    );

    const items = [];
    const itemIndexByKey = new Map();
    const cursor = new Date(startDate);
    const limitDate = new Date(now);

    while (cursor <= limitDate) {
      const key = formatBucketKey(cursor);
      const title = formatLabel(cursor);
      itemIndexByKey.set(key, items.length);
      items.push({
        label: title,
        title,
        value: amountMap.get(key) || 0,
        dealCount: 0
      });
      advanceCursor(cursor);
    }

    rows.forEach((row) => {
      const key = String(row.bucketDate).slice(0, 10);
      const itemIndex = itemIndexByKey.get(key);
      if (itemIndex !== undefined) {
        items[itemIndex].value = Number(row.totalAmount || 0);
        items[itemIndex].dealCount = Number(row.dealCount || 0);
      }
    });

    return res.status(200).json({ items });
  } catch (error) {
    return next(error);
  }
};

export const getAdminSummary = async (_req, res, next) => {
  try {
    const today = startOfToday();
    const topViewedRowsPromise = Facility.findAll({
      include: [{ model: Broker, as: 'broker', required: false, attributes: ['id', 'name'] }],
      order: [['views', 'DESC'], ['updatedAt', 'DESC'], ['id', 'DESC']],
      limit: 6
    });

    const [
      brokers,
      customers,
      admins,
      guarantees,
      loanTypes,
      documents,
      validations,
      facilities,
      pendingFacilities,
      publishedFacilities,
      rejectedFacilities,
      inProgressFacilities,
      expiredFacilities,
      invoices,
      paidInvoices,
      paidInvoiceAmount,
      walletTransactions,
      confirmedWalletTransactions,
      confirmedWalletAmount,
      pendingTickets,
      pendingWithdrawals,
      newBrokersToday,
      newCustomersToday,
      newFacilitiesToday,
      newTicketsToday,
      topViewedRows
    ] = await Promise.all([
      Broker.count(),
      Customer.count(),
      User.count({ where: { role: 'admin' } }),
      Guarantee.count(),
      Type.count(),
      Document.count(),
      Validation.count(),
      Facility.count(),
      Facility.count({ where: { status: Facility.STATUSES.PENDING } }),
      Facility.count({ where: { status: Facility.STATUSES.PUBLISHED } }),
      Facility.count({ where: { status: Facility.STATUSES.REJECTED } }),
      Facility.count({ where: { status: Facility.STATUSES.IN_PROGRESS } }),
      Facility.count({ where: { status: Facility.STATUSES.EXPIRED } }),
      Invoice.count(),
      Invoice.count({ where: { status: PaymentStatus.PAID } }),
      Invoice.sum('totalAmount', { where: { status: PaymentStatus.PAID } }),
      Transaction.count(),
      Transaction.count({ where: { confirmed: true } }),
      Transaction.sum('amount', { where: { confirmed: true } }),
      Ticket.count({ where: { parentId: null, status: TICKET_STATUS.PENDING } }),
      BrokerWithdrawal.count({ where: { status: BrokerWithdrawal.STATUSES.PENDING } }),
      Broker.count({ where: { createdAt: { [Op.gte]: today } } }),
      Customer.count({ where: { createdAt: { [Op.gte]: today } } }),
      Facility.count({ where: { createdAt: { [Op.gte]: today } } }),
      Ticket.count({ where: { parentId: null, createdAt: { [Op.gte]: today } } }),
      topViewedRowsPromise
    ]);

    const [
      customerValidationsTotal,
      customerValidationsPending,
      customerValidationsApproved,
      customerValidationsRejected,
    ] = await Promise.all([
      CustomerValidation.count(),
      CustomerValidation.count({ where: { status: CustomerValidation.STATUSES.PENDING } }),
      CustomerValidation.count({ where: { status: CustomerValidation.STATUSES.APPROVED } }),
      CustomerValidation.count({ where: { status: CustomerValidation.STATUSES.REJECTED } }),
    ]);

    const deals = await createDealSummary();

    const facilityViews = createFacilityViewsSummary(topViewedRows);

    return res.status(200).json({
      brokers,
      customers,
      admins,
      guarantees,
      loanTypes,
      documents,
      validations,
      facilities,
      pendingFacilities,
      publishedFacilities,
      rejectedFacilities,
      inProgressFacilities,
      expiredFacilities,
      totalFacilityViews: facilityViews.totalViews,
      topViewedFacilities: facilityViews.topViewed,
      invoices,
      paidInvoices,
      paidInvoiceAmount: String(paidInvoiceAmount || 0),
      walletTransactions,
      confirmedWalletTransactions,
      confirmedWalletAmount: String(confirmedWalletAmount || 0),
      pendingTickets,
      pendingWithdrawals,
      todayActivity: {
        newBrokers: newBrokersToday,
        newCustomers: newCustomersToday,
        newFacilities: newFacilitiesToday,
        newTickets: newTicketsToday
      },
      customerValidations: {
        total: customerValidationsTotal,
        pending: customerValidationsPending,
        approved: customerValidationsApproved,
        rejected: customerValidationsRejected
      },
      pendingWithdrawals,
      deals
    });
  } catch (error) {
    return next(error);
  }
};

export const listBrokers = async (req, res, next) => {
  try {
    const { page, limit, offset } = getPagination(req.query);
    const verifyLevel = req.query.verifyLevel ? Number(req.query.verifyLevel) : null;
    const search = normalizeSearch(req.query.search);

    const where = {};

    if (verifyLevel) {
      where.verifyLevel = verifyLevel;
    }

    if (search) {
      where[Op.or] = [
        { name: { [Op.like]: `%${search}%` } },
        { phone: { [Op.like]: `%${search}%` } },
        { nationalCode: { [Op.like]: `%${search}%` } }
      ];
    }

    const { rows, count } = await Broker.findAndCountAll({
      where,
      order: [['id', 'DESC']],
      limit,
      offset,
      include: [{ model: File, as: 'avatar', required: false }]
    });

    const items = (await attachWallets(rows, Wallet.HOLDER_TYPES.BROKER)).map((item) => ({
      ...item,
      avatarUrl: avatarUrl(item.avatar)
    }));

    return res.status(200).json(createPaginationResult({ items, total: count, page, limit }));
  } catch (error) {
    return next(error);
  }
};

export const updateBrokerVerifyLevel = async (req, res, next) => {
  try {
    const broker = await Broker.findByPk(req.params.id);

    if (!broker) {
      return res.status(404).json({ message: 'کارگزار یافت نشد' });
    }

    broker.verifyLevel = Number(req.body.verifyLevel || 1);
    await broker.save();

    return res.status(200).json({ message: 'سطح احراز هویت کارگزار بروزرسانی شد' });
  } catch (error) {
    return next(error);
  }
};

export const updateBrokerSuspension = async (req, res, next) => {
  try {
    const broker = await Broker.findByPk(req.params.id);

    if (!broker) {
      return res.status(404).json({ message: 'کارگزار یافت نشد' });
    }

    const isSuspended = req.body.isSuspended === true || req.body.isSuspended === 'true';
    const suspendReason = isSuspended ? normalizeSuspendReason(req.body.suspendReason) : null;

    await broker.update({
      isSuspended,
      suspendReason
    });

    return res.status(200).json({
      message: isSuspended ? 'حساب کارگزار معلق شد' : 'تعلیق حساب کارگزار برداشته شد',
      broker: {
        id: broker.id,
        isSuspended: Boolean(broker.isSuspended),
        suspendReason: broker.suspendReason || ''
      }
    });
  } catch (error) {
    return next(error);
  }
};

export const deleteBroker = async (req, res, next) => {
  try {
    const broker = await Broker.findByPk(req.params.id);

    if (!broker) {
      return res.status(404).json({ message: 'کارگزار یافت نشد' });
    }

    await Promise.all([
      Wallet.destroy({ where: { holderType: Wallet.HOLDER_TYPES.BROKER, holderId: broker.id } }),
      broker.destroy()
    ]);
    return res.status(200).json({ message: 'کارگزار حذف شد' });
  } catch (error) {
    return next(error);
  }
};

export const listCustomers = async (req, res, next) => {
  try {
    const { page, limit, offset } = getPagination(req.query);
    const search = normalizeSearch(req.query.search);

    const where = {};

    if (search) {
      where[Op.or] = [
        { name: { [Op.like]: `%${search}%` } },
        { phone: { [Op.like]: `%${search}%` } },
        { nationalCode: { [Op.like]: `%${search}%` } }
      ];
    }

    const { rows, count } = await Customer.findAndCountAll({
      where,
      order: [['id', 'DESC']],
      limit,
      offset,
      include: [{ model: File, as: 'avatar', required: false }]
    });

    const items = (await attachWallets(rows, Wallet.HOLDER_TYPES.CUSTOMER)).map((item) => ({
      ...item,
      avatarUrl: avatarUrl(item.avatar)
    }));

    return res.status(200).json(createPaginationResult({ items, total: count, page, limit }));
  } catch (error) {
    return next(error);
  }
};

export const deleteCustomer = async (req, res, next) => {
  try {
    const customer = await Customer.findByPk(req.params.id);

    if (!customer) {
      return res.status(404).json({ message: 'مشتری یافت نشد' });
    }

    await Promise.all([
      Wallet.destroy({ where: { holderType: Wallet.HOLDER_TYPES.CUSTOMER, holderId: customer.id } }),
      customer.destroy()
    ]);
    return res.status(200).json({ message: 'مشتری حذف شد' });
  } catch (error) {
    return next(error);
  }
};

export const updateCustomerSuspension = async (req, res, next) => {
  try {
    const customer = await Customer.findByPk(req.params.id);

    if (!customer) {
      return res.status(404).json({ message: 'مشتری یافت نشد' });
    }

    const isSuspended = req.body.isSuspended === true || req.body.isSuspended === 'true';
    const suspendReason = isSuspended ? normalizeSuspendReason(req.body.suspendReason) : null;

    await customer.update({
      isSuspended,
      suspendReason
    });

    return res.status(200).json({
      message: isSuspended ? 'حساب مشتری معلق شد' : 'تعلیق حساب مشتری برداشته شد',
      customer: {
        id: customer.id,
        isSuspended: Boolean(customer.isSuspended),
        suspendReason: customer.suspendReason || ''
      }
    });
  } catch (error) {
    return next(error);
  }
};

export const listAdmins = async (req, res, next) => {
  try {
    const { page, limit, offset } = getPagination(req.query);
    const search = normalizeSearch(req.query.search);
    const where = { role: 'admin' };

    if (search) {
      where[Op.or] = [
        { name: { [Op.like]: `%${search}%` } },
        { phone: { [Op.like]: `%${search}%` } },
        { email: { [Op.like]: `%${search}%` } }
      ];
    }

    const { rows, count } = await User.findAndCountAll({
      where,
      order: [['id', 'DESC']],
      attributes: ['id', 'name', 'phone', 'email', 'createdAt'],
      limit,
      offset
    });

    const items = await attachWallets(rows, Wallet.HOLDER_TYPES.ADMIN);

    return res.status(200).json(createPaginationResult({ items, total: count, page, limit }));
  } catch (error) {
    return next(error);
  }
};

export const createAdmin = async (req, res, next) => {
  try {
    const passwordHash = await bcrypt.hash(req.body.password, 10);

    const admin = await User.create({
      name: req.body.name,
      phone: req.body.phone,
      email: req.body.email || null,
      password: passwordHash,
      role: 'admin'
    });

    const wallet = await ensureWallet({
      holderType: Wallet.HOLDER_TYPES.ADMIN,
      holderId: admin.id
    });

    return res.status(201).json({
      message: 'ادمین جدید ایجاد شد',
      admin: {
        id: admin.id,
        name: admin.name,
        phone: admin.phone,
        email: admin.email,
        wallet: serializeWallet(wallet),
        walletBalance: String(wallet.balance || 0)
      }
    });
  } catch (error) {
    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(409).json({ message: 'شماره همراه یا ایمیل تکراری است' });
    }
    return next(error);
  }
};

export const updateAdmin = async (req, res, next) => {
  try {
    const admin = await User.findOne({ where: { id: req.params.id, role: 'admin' } });

    if (!admin) {
      return res.status(404).json({ message: 'ادمین یافت نشد' });
    }

    const payload = {
      name: req.body.name,
      phone: req.body.phone,
      email: req.body.email || null
    };

    if (req.body.password) {
      payload.password = await bcrypt.hash(req.body.password, 10);
    }

    await admin.update(payload);

    return res.status(200).json({ message: 'اطلاعات ادمین بروزرسانی شد' });
  } catch (error) {
    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(409).json({ message: 'شماره همراه یا ایمیل تکراری است' });
    }
    return next(error);
  }
};

export const deleteAdmin = async (req, res, next) => {
  try {
    const admin = await User.findOne({ where: { id: req.params.id, role: 'admin' } });

    if (!admin) {
      return res.status(404).json({ message: 'ادمین یافت نشد' });
    }

    await Promise.all([
      Wallet.destroy({ where: { holderType: Wallet.HOLDER_TYPES.ADMIN, holderId: admin.id } }),
      admin.destroy()
    ]);
    return res.status(200).json({ message: 'ادمین حذف شد' });
  } catch (error) {
    return next(error);
  }
};

export const getPageViews = async (req, res, next) => {
  try {
    const days = Math.min(Math.max(Number(req.query.days) || 10, 1), 365);
    const endDate = req.query.endDate ? new Date(req.query.endDate) : new Date();
    const startDate = new Date(endDate);
    startDate.setDate(startDate.getDate() - days + 1);

    const format = (d) => d.toISOString().slice(0, 10);

    const rows = await PageView.findAll({
      where: { date: { [Op.between]: [format(startDate), format(endDate)] } },
      order: [['date', 'ASC']]
    });

    const map = new Map(rows.map((r) => [r.date, r.count]));
    const items = [];
    const cursor = new Date(startDate);
    while (cursor <= endDate) {
      const key = format(cursor);
      items.push({ date: key, count: map.get(key) || 0 });
      cursor.setDate(cursor.getDate() + 1);
    }

    return res.status(200).json({ items });
  } catch (error) {
    return next(error);
  }
};
