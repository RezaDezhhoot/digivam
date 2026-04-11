import bcrypt from 'bcryptjs';
import { Op } from 'sequelize';
import { Broker } from '../models/broker.model.js';
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
      customerValidationsRejected
    ] = await Promise.all([
      CustomerValidation.count(),
      CustomerValidation.count({ where: { status: CustomerValidation.STATUSES.PENDING } }),
      CustomerValidation.count({ where: { status: CustomerValidation.STATUSES.APPROVED } }),
      CustomerValidation.count({ where: { status: CustomerValidation.STATUSES.REJECTED } })
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
