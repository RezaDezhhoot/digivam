import path from 'node:path';
import { Op } from 'sequelize';
import { env } from '../config/env.js';
import { BrokerWithdrawal } from '../models/broker-withdrawal.model.js';
import { Broker } from '../models/broker.model.js';
import { File } from '../models/file.model.js';
import { Wallet } from '../models/wallet.model.js';
import { creditWallet, ensureWallet } from '../services/wallet.service.js';
import { getPagination, createPaginationResult } from '../utils/pagination.js';

const uploadsRoot = path.resolve(process.cwd(), 'src', 'uploads');

const buildFileUrl = (file) => {
  if (!file?.path) return null;
  return `${String(env.backendBaseUrl || '').replace(/\/+$/, '')}/uploads/${file.path}`;
};

const serializeAdminWithdrawal = (item) => {
  const raw = typeof item?.toJSON === 'function' ? item.toJSON() : item;
  return {
    id: raw.id,
    brokerId: raw.brokerId,
    brokerName: raw.broker?.name || null,
    brokerPhone: raw.broker?.phone || null,
    brokerNationalCode: raw.broker?.nationalCode || null,
    brokerBirthdate: raw.broker?.birthdate || null,
    brokerSheba: raw.broker?.sheba || null,
    brokerPostalCode: raw.broker?.postalCode || null,
    brokerAddress: raw.broker?.address || null,
    amount: String(raw.amount || 0),
    status: raw.status,
    statusLabel: BrokerWithdrawal.STATUS_LABELS[raw.status] || raw.status,
    adminMessage: raw.adminMessage || null,
    adminFileUrl: raw.adminFile ? buildFileUrl(raw.adminFile) : null,
    resolvedAt: raw.resolvedAt || null,
    resolvedBy: raw.resolvedBy || null,
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt
  };
};

export const listAdminWithdrawals = async (req, res, next) => {
  try {
    const { page, limit, offset } = getPagination(req.query);
    const where = {};

    const status = String(req.query.status || '').trim();
    if (status && Object.values(BrokerWithdrawal.STATUSES).includes(status)) {
      where.status = status;
    }

    const search = String(req.query.search || '').trim();

    const include = [
      {
        model: Broker,
        as: 'broker',
        required: !!search,
        attributes: ['id', 'name', 'phone', 'nationalCode', 'birthdate', 'sheba', 'postalCode', 'address'],
        ...(search ? {
          where: {
            [Op.or]: [
              { name: { [Op.like]: `%${search}%` } },
              { phone: { [Op.like]: `%${search}%` } }
            ]
          }
        } : {})
      },
      {
        model: File,
        as: 'adminFile',
        required: false,
        attributes: ['id', 'path']
      }
    ];

    const { count, rows } = await BrokerWithdrawal.findAndCountAll({
      where,
      include,
      order: [['id', 'DESC']],
      limit,
      offset,
      distinct: true
    });

    return res.status(200).json(
      createPaginationResult({ items: rows.map(serializeAdminWithdrawal), total: count, page, limit })
    );
  } catch (error) {
    return next(error);
  }
};

export const updateAdminWithdrawal = async (req, res, next) => {
  try {
    const withdrawal = await BrokerWithdrawal.findByPk(req.params.id, {
      include: [
        { model: Broker, as: 'broker', attributes: ['id', 'name', 'phone', 'nationalCode', 'birthdate', 'sheba', 'postalCode', 'address'] },
        { model: File, as: 'adminFile', required: false, attributes: ['id', 'path'] }
      ]
    });

    if (!withdrawal) {
      return res.status(404).json({ message: 'درخواست برداشت یافت نشد' });
    }

    const nextStatus = String(req.body.status || '').trim();
    if (!nextStatus || !Object.values(BrokerWithdrawal.STATUSES).includes(nextStatus)) {
      return res.status(422).json({ message: 'وضعیت نامعتبر است' });
    }

    const updates = {
      status: nextStatus,
      adminMessage: (req.body.adminMessage || '').trim().slice(0, 2000) || null,
      resolvedAt: new Date(),
      resolvedBy: Number(req.auth.sub)
    };

    if (req.file) {
      const fileRecord = await File.create({
        fileableType: 'broker_withdrawal',
        fileableId: withdrawal.id,
        subject: 'admin_file',
        path: req.file.path.replace(uploadsRoot, '').replace(/^[\\/]+/, '').replace(/\\/g, '/'),
        mimeType: req.file.mimetype,
        size: req.file.size,
        disk: 'local',
        data: { originalName: req.file.originalname }
      });
      updates.adminFileId = fileRecord.id;
    }

    if (nextStatus === BrokerWithdrawal.STATUSES.FAILED && withdrawal.status === BrokerWithdrawal.STATUSES.PENDING) {
      const wallet = await ensureWallet({
        holderType: Wallet.HOLDER_TYPES.BROKER,
        holderId: withdrawal.brokerId
      });

      await creditWallet({
        walletId: wallet.id,
        amount: Number(withdrawal.amount),
        payableType: 'withdrawal_refund',
        payableId: withdrawal.id,
        meta: { withdrawalId: withdrawal.id, description: 'بازگشت وجه درخواست برداشت رد شده' }
      });
    }

    await withdrawal.update(updates);
    await withdrawal.reload({
      include: [
        { model: Broker, as: 'broker', attributes: ['id', 'name', 'phone'] },
        { model: File, as: 'adminFile', required: false, attributes: ['id', 'path'] }
      ]
    });

    return res.status(200).json({
      message: 'درخواست برداشت با موفقیت بروزرسانی شد',
      item: serializeAdminWithdrawal(withdrawal)
    });
  } catch (error) {
    return next(error);
  }
};
