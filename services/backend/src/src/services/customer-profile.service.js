import path from 'node:path';
import { env } from '../config/env.js';
import { Customer } from '../models/customer.model.js';
import { File } from '../models/file.model.js';
import { Wallet } from '../models/wallet.model.js';
import { ensureWallet, serializeWallet } from './wallet.service.js';

export const customerProfileInclude = [
  { model: File, as: 'avatar', required: false },
  { model: Wallet, as: 'wallet', required: false }
];

const fileUrl = (file) => {
  if (!file) {
    return null;
  }

  const rawPath = String(file.path || '').replace(/\\/g, '/');

  if (/^https?:\/\//i.test(rawPath)) {
    return rawPath;
  }

  const uploadsRoot = path.resolve(process.cwd(), 'src', 'uploads').replace(/\\/g, '/');
  const relativePath = rawPath.startsWith(uploadsRoot)
    ? rawPath.slice(uploadsRoot.length).replace(/^\/+/, '')
    : rawPath.replace(/^\/+/, '');

  return `${env.backendBaseUrl}/uploads/${relativePath}`;
};

export const serializeCustomerProfile = (customer) => ({
  id: customer.id,
  name: customer.name || '',
  phone: customer.phone,
  email: customer.email || '',
  nationalCode: customer.nationalCode || '',
  birthdate: customer.birthdate,
  verifiedAt: customer.verifiedAt,
  profile: Boolean(customer.profile),
  isSuspended: Boolean(customer.isSuspended),
  suspendReason: customer.suspendReason || '',
  avatar: fileUrl(customer.avatar),
  wallet: serializeWallet(customer.wallet),
  walletBalance: String(customer.wallet?.balance || 0)
});

export const ensureCustomerWithWallet = async (customerId) => {
  await ensureWallet({
    holderType: Wallet.HOLDER_TYPES.CUSTOMER,
    holderId: customerId
  });

  return Customer.findByPk(customerId, {
    include: customerProfileInclude
  });
};

export const upsertCustomerAvatar = async ({ customerId, file }) => {
  const uploadsRoot = path.resolve(process.cwd(), 'src', 'uploads');
  const relativePath = path.relative(uploadsRoot, file.path).replace(/\\/g, '/');

  const payload = {
    fileableType: 'customer',
    fileableId: customerId,
    subject: Customer.AVATAR_SUBJECT,
    path: relativePath,
    mimeType: file.mimetype,
    size: file.size,
    disk: 'local',
    status: 'processed'
  };

  const found = await File.findOne({
    where: {
      fileableType: 'customer',
      fileableId: customerId,
      subject: Customer.AVATAR_SUBJECT
    }
  });

  if (found) {
    await found.update(payload);
    return found;
  }

  return File.create(payload);
};