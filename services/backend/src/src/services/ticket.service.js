import { Op } from 'sequelize';
import { Broker } from '../models/broker.model.js';
import { Customer } from '../models/customer.model.js';
import { Ticket } from '../models/ticket.model.js';
import { User } from '../models/user.model.js';

export const TICKET_STATUS = {
  PENDING: 'pending',
  ANSWERED: 'answered',
  CLOSED: 'closed'
};

export const TICKET_STATUS_LABELS = {
  [TICKET_STATUS.PENDING]: 'در انتظار پاسخ',
  [TICKET_STATUS.ANSWERED]: 'پاسخ داده شده',
  [TICKET_STATUS.CLOSED]: 'بسته شده'
};

export const TICKET_SENDER = {
  BROKER: 'broker',
  CUSTOMER: 'customer',
  ADMIN: 'admin'
};

const senderTypeLabel = {
  [TICKET_SENDER.BROKER]: 'کارگزار',
  [TICKET_SENDER.CUSTOMER]: 'مشتری',
  [TICKET_SENDER.ADMIN]: 'ادمین'
};

const uniqueIds = (items) => [...new Set(items.map((item) => Number(item)).filter(Boolean))];

const buildSenderMaps = async (tickets) => {
  const brokerIds = uniqueIds(
    tickets.filter((ticket) => ticket.senderType === TICKET_SENDER.BROKER).map((ticket) => ticket.senderId)
  );
  const customerIds = uniqueIds(
    tickets.filter((ticket) => ticket.senderType === TICKET_SENDER.CUSTOMER).map((ticket) => ticket.senderId)
  );
  const adminIds = uniqueIds(
    tickets.filter((ticket) => ticket.senderType === TICKET_SENDER.ADMIN).map((ticket) => ticket.senderId)
  );

  const [brokers, customers, admins] = await Promise.all([
    brokerIds.length ? Broker.findAll({ where: { id: brokerIds }, attributes: ['id', 'name', 'phone', 'nationalCode'] }) : [],
    customerIds.length ? Customer.findAll({ where: { id: customerIds }, attributes: ['id', 'name', 'phone', 'nationalCode'] }) : [],
    adminIds.length ? User.findAll({ where: { id: adminIds }, attributes: ['id', 'name', 'phone'] }) : []
  ]);

  return {
    [TICKET_SENDER.BROKER]: new Map(brokers.map((item) => [Number(item.id), item])),
    [TICKET_SENDER.CUSTOMER]: new Map(customers.map((item) => [Number(item.id), item])),
    [TICKET_SENDER.ADMIN]: new Map(admins.map((item) => [Number(item.id), item]))
  };
};

export const serializeTicket = (ticket, senderMaps) => {
  const sender = senderMaps[ticket.senderType]?.get(Number(ticket.senderId));

  return {
    id: ticket.id,
    subject: ticket.subject,
    body: ticket.body,
    parentId: ticket.parentId,
    status: ticket.status,
    statusLabel: TICKET_STATUS_LABELS[ticket.status] || ticket.status,
    senderType: ticket.senderType,
    senderTypeLabel: senderTypeLabel[ticket.senderType] || 'کاربر',
    senderId: ticket.senderId,
    senderName: sender?.name || (ticket.senderType === TICKET_SENDER.ADMIN ? 'ادمین سیستم' : 'بدون نام'),
    senderPhone: sender?.phone || '-',
    senderNationalCode: sender?.nationalCode || '-',
    admin: Boolean(ticket.admin),
    createdAt: ticket.createdAt,
    updatedAt: ticket.updatedAt
  };
};

export const listRootTickets = async (where = {}, options = {}) => {
  const page = Number(options.page || 1);
  const limit = Number(options.limit || 0);
  const query = {
    where: {
      ...where,
      parentId: null
    },
    order: options.order || [
      ['updatedAt', 'DESC'],
      ['id', 'DESC']
    ]
  };

  if (limit > 0) {
    query.limit = limit;
    query.offset = (page - 1) * limit;
  }

  const { rows, count } = await Ticket.findAndCountAll(query);

  const senderMaps = await buildSenderMaps(rows);

  const payload = {
    items: rows.map((ticket) => serializeTicket(ticket, senderMaps)),
    total: count
  };

  if (limit > 0) {
    payload.page = page;
    payload.limit = limit;
    payload.pages = count > 0 ? Math.ceil(count / limit) : 0;
  }

  return payload;
};

export const getTicketThread = async (rootWhere) => {
  const root = await Ticket.findOne({
    where: {
      ...rootWhere,
      parentId: null
    }
  });

  if (!root) {
    return null;
  }

  const messages = await Ticket.findAll({
    where: {
      [Op.or]: [{ id: root.id }, { parentId: root.id }]
    },
    order: [
      ['createdAt', 'ASC'],
      ['id', 'ASC']
    ]
  });

  const senderMaps = await buildSenderMaps(messages);

  return {
    ticket: serializeTicket(root, senderMaps),
    messages: messages.map((item) => serializeTicket(item, senderMaps))
  };
};