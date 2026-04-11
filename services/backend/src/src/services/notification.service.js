import { Op } from 'sequelize';
import { Broker } from '../models/broker.model.js';
import { Customer } from '../models/customer.model.js';
import { Notification } from '../models/notification.model.js';
import { User } from '../models/user.model.js';

const uniqueIds = (items) => [...new Set(items.map((item) => Number(item)).filter(Boolean))];

const formatActorName = (item, fallbackPrefix) => item?.name || `${fallbackPrefix} #${item?.id || '-'}`;

const formatActorDisplayLabel = (item, modelType) => {
  const parts = [formatActorName(item, Notification.MODEL_LABELS[modelType] || 'کاربر')];

  if (item?.phone) {
    parts.push(`موبایل: ${item.phone}`);
  }

  if (item?.nationalCode) {
    parts.push(`کد ملی: ${item.nationalCode}`);
  }

  if (item?.email) {
    parts.push(`ایمیل: ${item.email}`);
  }

  if (modelType === Notification.MODEL_TYPES.BROKER && Number(item?.verifyLevel || 0)) {
    parts.push(`سطح احراز: ${item.verifyLevel}`);
  }

  return parts.join(' | ');
};

const loadActors = async (modelType, ids) => {
  if (!ids.length) {
    return [];
  }

  if (modelType === Notification.MODEL_TYPES.BROKER) {
    return Broker.findAll({
      where: { id: ids },
      attributes: ['id', 'name', 'phone', 'nationalCode', 'birthdate', 'sheba', 'postalCode', 'address', 'verifyLevel']
    });
  }

  if (modelType === Notification.MODEL_TYPES.CUSTOMER) {
    return Customer.findAll({
      where: { id: ids },
      attributes: ['id', 'name', 'phone', 'email', 'nationalCode', 'birthdate']
    });
  }

  return User.findAll({ where: { id: ids }, attributes: ['id', 'name', 'phone', 'email', 'role'] });
};

const buildActorMaps = async (rows = []) => {
  const recipientIds = {
    [Notification.MODEL_TYPES.ADMIN]: uniqueIds(rows.filter((item) => item.modelType === Notification.MODEL_TYPES.ADMIN).map((item) => item.modelId)),
    [Notification.MODEL_TYPES.BROKER]: uniqueIds(rows.filter((item) => item.modelType === Notification.MODEL_TYPES.BROKER).map((item) => item.modelId)),
    [Notification.MODEL_TYPES.CUSTOMER]: uniqueIds(rows.filter((item) => item.modelType === Notification.MODEL_TYPES.CUSTOMER).map((item) => item.modelId))
  };
  const senderIds = {
    [Notification.MODEL_TYPES.ADMIN]: uniqueIds(rows.filter((item) => item.senderType === Notification.MODEL_TYPES.ADMIN).map((item) => item.senderId)),
    [Notification.MODEL_TYPES.BROKER]: uniqueIds(rows.filter((item) => item.senderType === Notification.MODEL_TYPES.BROKER).map((item) => item.senderId)),
    [Notification.MODEL_TYPES.CUSTOMER]: uniqueIds(rows.filter((item) => item.senderType === Notification.MODEL_TYPES.CUSTOMER).map((item) => item.senderId))
  };

  const [recipientAdmins, recipientBrokers, recipientCustomers, senderAdmins, senderBrokers, senderCustomers] = await Promise.all([
    loadActors(Notification.MODEL_TYPES.ADMIN, recipientIds[Notification.MODEL_TYPES.ADMIN]),
    loadActors(Notification.MODEL_TYPES.BROKER, recipientIds[Notification.MODEL_TYPES.BROKER]),
    loadActors(Notification.MODEL_TYPES.CUSTOMER, recipientIds[Notification.MODEL_TYPES.CUSTOMER]),
    loadActors(Notification.MODEL_TYPES.ADMIN, senderIds[Notification.MODEL_TYPES.ADMIN]),
    loadActors(Notification.MODEL_TYPES.BROKER, senderIds[Notification.MODEL_TYPES.BROKER]),
    loadActors(Notification.MODEL_TYPES.CUSTOMER, senderIds[Notification.MODEL_TYPES.CUSTOMER])
  ]);

  return {
    recipients: {
      [Notification.MODEL_TYPES.ADMIN]: new Map(recipientAdmins.map((item) => [Number(item.id), item])),
      [Notification.MODEL_TYPES.BROKER]: new Map(recipientBrokers.map((item) => [Number(item.id), item])),
      [Notification.MODEL_TYPES.CUSTOMER]: new Map(recipientCustomers.map((item) => [Number(item.id), item]))
    },
    senders: {
      [Notification.MODEL_TYPES.ADMIN]: new Map(senderAdmins.map((item) => [Number(item.id), item])),
      [Notification.MODEL_TYPES.BROKER]: new Map(senderBrokers.map((item) => [Number(item.id), item])),
      [Notification.MODEL_TYPES.CUSTOMER]: new Map(senderCustomers.map((item) => [Number(item.id), item]))
    }
  };
};

export const serializeNotification = (item, actorMaps = { recipients: {}, senders: {} }) => {
  const raw = typeof item?.toJSON === 'function' ? item.toJSON() : item;
  const recipient = actorMaps.recipients?.[raw.modelType]?.get(Number(raw.modelId));
  const sender = actorMaps.senders?.[raw.senderType]?.get(Number(raw.senderId));

  return {
    id: raw.id,
    category: raw.category,
    categoryLabel: Notification.CATEGORY_LABELS[raw.category] || raw.category || '-',
    categoryColor: Notification.CATEGORY_COLORS[raw.category] || '#6b7280',
    title: raw.title,
    body: raw.body,
    isRead: Boolean(raw.isRead),
    readAt: raw.readAt,
    modelType: raw.modelType,
    modelTypeLabel: Notification.MODEL_LABELS[raw.modelType] || raw.modelType || '-',
    modelId: Number(raw.modelId || 0),
    recipientName: recipient?.name || `${Notification.MODEL_LABELS[raw.modelType] || 'کاربر'} #${raw.modelId}`,
    recipientPhone: recipient?.phone || '-',
    recipientNationalCode: recipient?.nationalCode || '-',
    recipientEmail: recipient?.email || '-',
    senderType: raw.senderType,
    senderTypeLabel: Notification.MODEL_LABELS[raw.senderType] || raw.senderType || '-',
    senderId: Number(raw.senderId || 0),
    senderName: sender?.name || `${Notification.MODEL_LABELS[raw.senderType] || 'کاربر'} #${raw.senderId}`,
    senderPhone: sender?.phone || '-',
    metadata: raw.metadata || null,
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt
  };
};

const ensureModelExists = async ({ modelType, modelId, transaction }) => {
  const numericId = Number(modelId || 0);

  if (!numericId) {
    throw Object.assign(new Error('کاربر هدف نامعتبر است'), { status: 422 });
  }

  const model =
    modelType === Notification.MODEL_TYPES.BROKER
      ? Broker
      : modelType === Notification.MODEL_TYPES.CUSTOMER
        ? Customer
        : User;

  const item = await model.findByPk(numericId, {
    transaction,
    attributes: ['id', 'name', 'phone']
  });

  if (!item) {
    throw Object.assign(new Error('کاربر هدف یافت نشد'), { status: 404 });
  }

  return item;
};

export const createNotification = async ({
  category,
  title,
  body,
  modelType,
  modelId,
  senderType,
  senderId,
  metadata = null,
  transaction
}) => {
  if (!Object.values(Notification.CATEGORIES).includes(category)) {
    throw Object.assign(new Error('دسته بندی نوتیفیکیشن نامعتبر است'), { status: 422 });
  }

  if (!Object.values(Notification.MODEL_TYPES).includes(modelType)) {
    throw Object.assign(new Error('نوع گیرنده نوتیفیکیشن نامعتبر است'), { status: 422 });
  }

  if (!Object.values(Notification.MODEL_TYPES).includes(senderType)) {
    throw Object.assign(new Error('نوع فرستنده نوتیفیکیشن نامعتبر است'), { status: 422 });
  }

  await Promise.all([
    ensureModelExists({ modelType, modelId, transaction }),
    ensureModelExists({ modelType: senderType, modelId: senderId, transaction })
  ]);

  return Notification.create(
    {
      category,
      title: String(title || '').trim(),
      body: String(body || '').trim(),
      modelType,
      modelId: Number(modelId),
      senderType,
      senderId: Number(senderId),
      metadata
    },
    { transaction }
  );
};

export const createNotificationSummary = async (where = {}) => {
  const [total, unread, info, attention, warning] = await Promise.all([
    Notification.count({ where }),
    Notification.count({ where: { ...where, isRead: false } }),
    Notification.count({ where: { ...where, category: Notification.CATEGORIES.INFO } }),
    Notification.count({ where: { ...where, category: Notification.CATEGORIES.ATTENTION } }),
    Notification.count({ where: { ...where, category: Notification.CATEGORIES.WARNING } })
  ]);

  return {
    total,
    unread,
    read: Math.max(total - unread, 0),
    info,
    attention,
    warning
  };
};

export const listNotifications = async ({ where = {}, page = 1, limit = 10, order } = {}) => {
  const { rows, count } = await Notification.findAndCountAll({
    where,
    order: order || [['createdAt', 'DESC'], ['id', 'DESC']],
    limit,
    offset: (page - 1) * limit
  });

  const actorMaps = await buildActorMaps(rows);

  return {
    items: rows.map((item) => serializeNotification(item, actorMaps)),
    total: count,
    page,
    limit,
    pages: count > 0 ? Math.ceil(count / limit) : 0
  };
};

export const listNotificationActors = async () => {
  const [brokers, customers] = await Promise.all([
    Broker.findAll({
      order: [['name', 'ASC'], ['id', 'ASC']],
      attributes: ['id', 'name', 'phone', 'nationalCode', 'birthdate', 'sheba', 'postalCode', 'address', 'verifyLevel']
    }),
    Customer.findAll({
      order: [['name', 'ASC'], ['id', 'ASC']],
      attributes: ['id', 'name', 'phone', 'email', 'nationalCode', 'birthdate']
    })
  ]);

  return {
    recipientTypes: [
      { value: Notification.MODEL_TYPES.BROKER, label: Notification.MODEL_LABELS[Notification.MODEL_TYPES.BROKER] },
      { value: Notification.MODEL_TYPES.CUSTOMER, label: Notification.MODEL_LABELS[Notification.MODEL_TYPES.CUSTOMER] }
    ],
    categories: Object.values(Notification.CATEGORIES).map((value) => ({
      value,
      label: Notification.CATEGORY_LABELS[value] || value,
      color: Notification.CATEGORY_COLORS[value] || '#6b7280'
    })),
    brokers: brokers.map((item) => ({
      id: item.id,
      name: item.name || `کارگزار #${item.id}`,
      phone: item.phone,
      nationalCode: item.nationalCode || '',
      birthdate: item.birthdate || null,
      sheba: item.sheba || '',
      postalCode: item.postalCode || '',
      address: item.address || '',
      verifyLevel: Number(item.verifyLevel || 0),
      displayLabel: formatActorDisplayLabel(item, Notification.MODEL_TYPES.BROKER)
    })),
    customers: customers.map((item) => ({
      id: item.id,
      name: item.name || `مشتری #${item.id}`,
      phone: item.phone,
      email: item.email || '',
      nationalCode: item.nationalCode || '',
      birthdate: item.birthdate || null,
      displayLabel: formatActorDisplayLabel(item, Notification.MODEL_TYPES.CUSTOMER)
    }))
  };
};

export const markNotificationRead = async (notification) => {
  if (notification.isRead) {
    return notification;
  }

  await notification.update({
    isRead: true,
    readAt: new Date()
  });

  return notification;
};

export const buildNotificationSearchWhere = (search) => {
  if (!search) {
    return {};
  }

  return {
    [Op.or]: [
      { title: { [Op.like]: `%${search}%` } },
      { body: { [Op.like]: `%${search}%` } }
    ]
  };
};