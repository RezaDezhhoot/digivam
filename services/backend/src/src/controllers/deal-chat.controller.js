import { DealMessage } from '../models/deal-message.model.js';
import { DealMessageRead } from '../models/deal-message-read.model.js';
import { Deal } from '../models/deal.model.js';
import { Broker } from '../models/broker.model.js';
import { Customer } from '../models/customer.model.js';
import { Facility } from '../models/facility.model.js';
import { User } from '../models/user.model.js';
import { Type } from '../models/type.model.js';
import { Op } from 'sequelize';

const resolveSenderInfo = async (senderType, senderId) => {
  try {
    if (senderType === DealMessage.SENDER_TYPES.CUSTOMER) {
      const customer = await Customer.findByPk(senderId, { attributes: ['name'] });
      return {
        name: customer?.name || 'مشتری'
      };
    }

    if (senderType === DealMessage.SENDER_TYPES.BROKER) {
      const broker = await Broker.findByPk(senderId, { attributes: ['name'] });
      return {
        name: broker?.name || 'کارگزار'
      };
    }

    if (senderType === DealMessage.SENDER_TYPES.ADMIN) {
      const admin = await User.findByPk(senderId, { attributes: ['name'] });
      return {
        name: admin?.name || 'مدیر'
      };
    }
  } catch {
    // fallback
  }

  return {
    name: DealMessage.SENDER_TYPE_LABELS[senderType] || senderType
  };
};

const serializeMessage = (item, senderInfo) => ({
  id: Number(item.id),
  dealId: Number(item.dealId),
  senderType: item.senderType,
  senderTypeLabel: DealMessage.SENDER_TYPE_LABELS[item.senderType] || item.senderType,
  senderId: Number(item.senderId),
  senderName: senderInfo?.name || DealMessage.SENDER_TYPE_LABELS[item.senderType] || item.senderType,
  body: item.body,
  createdAt: item.createdAt,
  createdAtLabel: item.createdAt ? new Date(item.createdAt).toLocaleString('fa-IR') : null
});

const serializeConversationSummary = ({ deal, lastMessage, unreadCount, detailPath }) => ({
  dealId: Number(deal.id),
  dealCode: `DG-${deal.id}`,
  unreadCount: Number(unreadCount || 0),
  facilityTitle: deal.facility?.title || deal.facilityTitle || 'بدون عنوان',
  loanTypeTitle: deal.facility?.subTypeModel?.title || deal.loanTypeTitle || null,
  customer: deal.customer
    ? {
        id: Number(deal.customer.id),
        name: deal.customer.name || `مشتری #${deal.customer.id}`,
        phone: deal.customer.phone || '-'
      }
    : null,
  broker: deal.broker
    ? {
        id: Number(deal.broker.id),
        name: deal.broker.name || `کارگزار #${deal.broker.id}`,
        phone: deal.broker.phone || '-'
      }
    : null,
  lastMessage: lastMessage
    ? {
        id: Number(lastMessage.id),
        body: lastMessage.body,
        senderType: lastMessage.senderType,
        senderTypeLabel: DealMessage.SENDER_TYPE_LABELS[lastMessage.senderType] || lastMessage.senderType,
        senderId: Number(lastMessage.senderId),
        senderName: lastMessage.senderName,
        createdAt: lastMessage.createdAt,
        createdAtLabel: lastMessage.createdAt ? new Date(lastMessage.createdAt).toLocaleString('fa-IR') : null
      }
    : null,
  lastActivityAt: lastMessage?.createdAt || deal.updatedAt,
  lastActivityAtLabel: lastMessage?.createdAt
    ? new Date(lastMessage.createdAt).toLocaleString('fa-IR')
    : deal.updatedAt
      ? new Date(deal.updatedAt).toLocaleString('fa-IR')
      : null,
  detailPath
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
      nameMap.set(key, await resolveSenderInfo(type, Number(id)));
    })
  );

  return messages.map((item) => serializeMessage(item, nameMap.get(`${item.senderType}:${item.senderId}`)));
};

const loadConversationDeals = async (where = {}) =>
  Deal.findAll({
    where,
    attributes: ['id', 'updatedAt'],
    include: [
      {
        model: Customer,
        as: 'customer',
        required: false,
        attributes: ['id', 'name', 'phone']
      },
      {
        model: Broker,
        as: 'broker',
        required: false,
        attributes: ['id', 'name', 'phone']
      },
      {
        model: Facility,
        as: 'facility',
        required: false,
        attributes: ['id', 'title', 'subType'],
        include: [
          {
            model: Type,
            as: 'subTypeModel',
            required: false,
            attributes: ['id', 'title']
          }
        ]
      }
    ],
    order: [['updatedAt', 'DESC'], ['id', 'DESC']]
  });

const buildConversationList = async ({ where = {}, readerType, readerId, detailPathBuilder }) => {
  const deals = await loadConversationDeals(where);
  const dealIds = deals.map((item) => Number(item.id)).filter(Boolean);

  if (!dealIds.length) {
    return { items: [], totalUnreadCount: 0 };
  }

  const [messages, reads] = await Promise.all([
    DealMessage.findAll({
      where: { dealId: { [Op.in]: dealIds } },
      order: [['created_at', 'DESC'], ['id', 'DESC']]
    }),
    DealMessageRead.findAll({
      where: {
        dealId: { [Op.in]: dealIds },
        readerType,
        readerId: Number(readerId)
      }
    })
  ]);

  const senderKeys = [...new Set(messages.map((item) => `${item.senderType}:${item.senderId}`))];
  const senderInfoMap = new Map();
  await Promise.all(
    senderKeys.map(async (key) => {
      const [type, id] = key.split(':');
      senderInfoMap.set(key, await resolveSenderInfo(type, Number(id)));
    })
  );

  const readMap = new Map(reads.map((item) => [Number(item.dealId), item.lastReadAt]));
  const messagesByDeal = new Map();

  messages.forEach((item) => {
    const dealId = Number(item.dealId);
    if (!messagesByDeal.has(dealId)) {
      messagesByDeal.set(dealId, []);
    }
    messagesByDeal.get(dealId).push(item);
  });

  const items = deals
    .map((deal) => {
      const dealId = Number(deal.id);
      const dealMessages = messagesByDeal.get(dealId) || [];
      const lastMessage = dealMessages[0]
        ? {
            ...dealMessages[0].toJSON(),
            senderName: senderInfoMap.get(`${dealMessages[0].senderType}:${dealMessages[0].senderId}`)?.name
          }
        : null;
      const lastReadAt = readMap.get(dealId);
      const unreadCount = dealMessages.filter((item) => {
        if (item.senderType === readerType) {
          return false;
        }

        if (!lastReadAt) {
          return true;
        }

        return new Date(item.createdAt).getTime() > new Date(lastReadAt).getTime();
      }).length;

      return serializeConversationSummary({
        deal,
        lastMessage,
        unreadCount,
        detailPath: detailPathBuilder(dealId)
      });
    })
    .sort((left, right) => new Date(right.lastActivityAt || 0) - new Date(left.lastActivityAt || 0));

  return {
    items,
    totalUnreadCount: items.reduce((sum, item) => sum + Number(item.unreadCount || 0), 0)
  };
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

    const senderInfo = await resolveSenderInfo(DealMessage.SENDER_TYPES.CUSTOMER, Number(req.auth.sub));
    return res.status(201).json({ message: serializeMessage(message, senderInfo) });
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

    const senderInfo = await resolveSenderInfo(DealMessage.SENDER_TYPES.BROKER, Number(req.auth.sub));
    return res.status(201).json({ message: serializeMessage(message, senderInfo) });
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

    const senderInfo = await resolveSenderInfo(DealMessage.SENDER_TYPES.ADMIN, Number(req.auth.sub));
    return res.status(201).json({ message: serializeMessage(message, senderInfo) });
  } catch (error) {
    return next(error);
  }
};

export const getCustomerConversations = async (req, res, next) => {
  try {
    const payload = await buildConversationList({
      where: { customer_id: Number(req.auth.sub) },
      readerType: DealMessage.SENDER_TYPES.CUSTOMER,
      readerId: Number(req.auth.sub),
      detailPathBuilder: (dealId) => `/customer/deals/${dealId}`
    });

    return res.status(200).json(payload);
  } catch (error) {
    return next(error);
  }
};

export const getBrokerConversations = async (req, res, next) => {
  try {
    const payload = await buildConversationList({
      where: { broker_id: Number(req.auth.sub) },
      readerType: DealMessage.SENDER_TYPES.BROKER,
      readerId: Number(req.auth.sub),
      detailPathBuilder: (dealId) => `/deals/${dealId}`
    });

    return res.status(200).json(payload);
  } catch (error) {
    return next(error);
  }
};

export const getAdminConversations = async (_req, res, next) => {
  try {
    const payload = await buildConversationList({
      where: {},
      readerType: DealMessage.SENDER_TYPES.ADMIN,
      readerId: Number(_req.auth.sub),
      detailPathBuilder: (dealId) => `/deals/${dealId}`
    });

    return res.status(200).json(payload);
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
