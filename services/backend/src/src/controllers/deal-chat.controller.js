import { DealMessage } from '../models/deal-message.model.js';
import { DealMessageRead } from '../models/deal-message-read.model.js';
import { Deal } from '../models/deal.model.js';
import { Broker } from '../models/broker.model.js';
import { Customer } from '../models/customer.model.js';
import { User } from '../models/user.model.js';
import { Op } from 'sequelize';

const resolveSenderName = async (senderType, senderId) => {
  try {
    if (senderType === DealMessage.SENDER_TYPES.CUSTOMER) {
      const customer = await Customer.findByPk(senderId, { attributes: ['name'] });
      return customer?.name || 'مشتری';
    }

    if (senderType === DealMessage.SENDER_TYPES.BROKER) {
      const broker = await Broker.findByPk(senderId, { attributes: ['name'] });
      return broker?.name || 'کارگزار';
    }

    if (senderType === DealMessage.SENDER_TYPES.ADMIN) {
      const admin = await User.findByPk(senderId, { attributes: ['name'] });
      return admin?.name || 'مدیر';
    }
  } catch {
    // fallback
  }

  return DealMessage.SENDER_TYPE_LABELS[senderType] || senderType;
};

const serializeMessage = (item, senderName) => ({
  id: Number(item.id),
  dealId: Number(item.dealId),
  senderType: item.senderType,
  senderTypeLabel: DealMessage.SENDER_TYPE_LABELS[item.senderType] || item.senderType,
  senderId: Number(item.senderId),
  senderName: senderName || DealMessage.SENDER_TYPE_LABELS[item.senderType] || item.senderType,
  body: item.body,
  createdAt: item.createdAt,
  createdAtLabel: item.createdAt ? new Date(item.createdAt).toLocaleString('fa-IR') : null
});

const loadDealMessages = async (dealId) => {
  const messages = await DealMessage.findAll({
    where: { dealId: Number(dealId) },
    order: [['created_at', 'ASC']],
    limit: 500
  });

  const senderKeys = [...new Set(messages.map((m) => `${m.senderType}:${m.senderId}`))];
  const nameMap = new Map();

  await Promise.all(
    senderKeys.map(async (key) => {
      const [type, id] = key.split(':');
      nameMap.set(key, await resolveSenderName(type, Number(id)));
    })
  );

  return messages.map((item) => serializeMessage(item, nameMap.get(`${item.senderType}:${item.senderId}`)));
};

const markAsRead = async (dealId, readerType, readerId) => {
  const [record] = await DealMessageRead.findOrCreate({
    where: { dealId: Number(dealId), readerType, readerId: Number(readerId) },
    defaults: { lastReadAt: new Date() }
  });
  record.lastReadAt = new Date();
  await record.save();
};

const countUnread = async (dealId, readerType, readerId) => {
  const readRecord = await DealMessageRead.findOne({
    where: { dealId: Number(dealId), readerType, readerId: Number(readerId) }
  });

  const where = {
    dealId: Number(dealId),
    senderType: { [Op.ne]: readerType }
  };

  if (readRecord?.lastReadAt) {
    where.createdAt = { [Op.gt]: readRecord.lastReadAt };
  }

  return DealMessage.count({ where });
};

export const getCustomerDealMessages = async (req, res, next) => {
  try {
    const deal = await Deal.findOne({
      where: { id: Number(req.params.id), customer_id: Number(req.auth.sub) },
      attributes: ['id']
    });

    if (!deal) {
      return res.status(404).json({ message: 'معامله یافت نشد' });
    }

    await markAsRead(deal.id, DealMessage.SENDER_TYPES.CUSTOMER, req.auth.sub);
    return res.status(200).json({ messages: await loadDealMessages(deal.id) });
  } catch (error) {
    return next(error);
  }
};

export const sendCustomerDealMessage = async (req, res, next) => {
  try {
    const deal = await Deal.findOne({
      where: { id: Number(req.params.id), customer_id: Number(req.auth.sub) },
      attributes: ['id']
    });

    if (!deal) {
      return res.status(404).json({ message: 'معامله یافت نشد' });
    }

    const body = String(req.body.body || '').trim();
    if (!body || body.length > 2000) {
      return res.status(422).json({ message: 'متن پیام معتبر نیست (حداکثر ۲۰۰۰ کاراکتر)' });
    }

    const message = await DealMessage.create({
      dealId: Number(deal.id),
      senderType: DealMessage.SENDER_TYPES.CUSTOMER,
      senderId: Number(req.auth.sub),
      body
    });

    const senderName = await resolveSenderName(DealMessage.SENDER_TYPES.CUSTOMER, Number(req.auth.sub));
    return res.status(201).json({ message: serializeMessage(message, senderName) });
  } catch (error) {
    return next(error);
  }
};

export const getBrokerDealMessages = async (req, res, next) => {
  try {
    const deal = await Deal.findOne({
      where: { id: Number(req.params.id), broker_id: Number(req.auth.sub) },
      attributes: ['id']
    });

    if (!deal) {
      return res.status(404).json({ message: 'معامله یافت نشد' });
    }

    await markAsRead(deal.id, DealMessage.SENDER_TYPES.BROKER, req.auth.sub);
    return res.status(200).json({ messages: await loadDealMessages(deal.id) });
  } catch (error) {
    return next(error);
  }
};

export const sendBrokerDealMessage = async (req, res, next) => {
  try {
    const deal = await Deal.findOne({
      where: { id: Number(req.params.id), broker_id: Number(req.auth.sub) },
      attributes: ['id']
    });

    if (!deal) {
      return res.status(404).json({ message: 'معامله یافت نشد' });
    }

    const body = String(req.body.body || '').trim();
    if (!body || body.length > 2000) {
      return res.status(422).json({ message: 'متن پیام معتبر نیست (حداکثر ۲۰۰۰ کاراکتر)' });
    }

    const message = await DealMessage.create({
      dealId: Number(deal.id),
      senderType: DealMessage.SENDER_TYPES.BROKER,
      senderId: Number(req.auth.sub),
      body
    });

    const senderName = await resolveSenderName(DealMessage.SENDER_TYPES.BROKER, Number(req.auth.sub));
    return res.status(201).json({ message: serializeMessage(message, senderName) });
  } catch (error) {
    return next(error);
  }
};

export const getAdminDealMessages = async (req, res, next) => {
  try {
    const deal = await Deal.findByPk(Number(req.params.id), { attributes: ['id'] });

    if (!deal) {
      return res.status(404).json({ message: 'معامله یافت نشد' });
    }

    await markAsRead(deal.id, DealMessage.SENDER_TYPES.ADMIN, req.auth.sub);
    return res.status(200).json({ messages: await loadDealMessages(deal.id) });
  } catch (error) {
    return next(error);
  }
};

export const sendAdminDealMessage = async (req, res, next) => {
  try {
    const deal = await Deal.findByPk(Number(req.params.id), { attributes: ['id'] });

    if (!deal) {
      return res.status(404).json({ message: 'معامله یافت نشد' });
    }

    const body = String(req.body.body || '').trim();
    if (!body || body.length > 2000) {
      return res.status(422).json({ message: 'متن پیام معتبر نیست (حداکثر ۲۰۰۰ کاراکتر)' });
    }

    const message = await DealMessage.create({
      dealId: Number(deal.id),
      senderType: DealMessage.SENDER_TYPES.ADMIN,
      senderId: Number(req.auth.sub),
      body
    });

    const senderName = await resolveSenderName(DealMessage.SENDER_TYPES.ADMIN, Number(req.auth.sub));
    return res.status(201).json({ message: serializeMessage(message, senderName) });
  } catch (error) {
    return next(error);
  }
};

export const getCustomerUnreadCount = async (req, res, next) => {
  try {
    const deal = await Deal.findOne({
      where: { id: Number(req.params.id), customer_id: Number(req.auth.sub) },
      attributes: ['id']
    });
    if (!deal) return res.status(404).json({ message: 'معامله یافت نشد' });
    const unreadCount = await countUnread(deal.id, DealMessage.SENDER_TYPES.CUSTOMER, req.auth.sub);
    return res.status(200).json({ unreadCount });
  } catch (error) {
    return next(error);
  }
};

export const getBrokerUnreadCount = async (req, res, next) => {
  try {
    const deal = await Deal.findOne({
      where: { id: Number(req.params.id), broker_id: Number(req.auth.sub) },
      attributes: ['id']
    });
    if (!deal) return res.status(404).json({ message: 'معامله یافت نشد' });
    const unreadCount = await countUnread(deal.id, DealMessage.SENDER_TYPES.BROKER, req.auth.sub);
    return res.status(200).json({ unreadCount });
  } catch (error) {
    return next(error);
  }
};

export const getAdminUnreadCount = async (req, res, next) => {
  try {
    const deal = await Deal.findByPk(Number(req.params.id), { attributes: ['id'] });
    if (!deal) return res.status(404).json({ message: 'معامله یافت نشد' });
    const unreadCount = await countUnread(deal.id, DealMessage.SENDER_TYPES.ADMIN, req.auth.sub);
    return res.status(200).json({ unreadCount });
  } catch (error) {
    return next(error);
  }
};
