import { Op } from 'sequelize';
import { Broker } from '../models/broker.model.js';
import { Customer } from '../models/customer.model.js';
import { Ticket } from '../models/ticket.model.js';
import { getTicketThread, listRootTickets, TICKET_SENDER, TICKET_STATUS } from '../services/ticket.service.js';
import { createPaginationResult, getPagination } from '../utils/pagination.js';
import { toEnglishDigits } from '../utils/digits.js';

const buildSenderFilters = async ({ phone, nationalCode }) => {
  const brokerWhere = {};
  const customerWhere = {};

  if (phone) {
    brokerWhere.phone = { [Op.like]: `%${phone}%` };
    customerWhere.phone = { [Op.like]: `%${phone}%` };
  }

  if (nationalCode) {
    brokerWhere.nationalCode = { [Op.like]: `%${nationalCode}%` };
    customerWhere.nationalCode = { [Op.like]: `%${nationalCode}%` };
  }

  const [brokers, customers] = await Promise.all([
    Broker.findAll({ where: brokerWhere, attributes: ['id'] }),
    Customer.findAll({ where: customerWhere, attributes: ['id'] })
  ]);

  const filters = [];

  if (brokers.length) {
    filters.push({
      senderType: TICKET_SENDER.BROKER,
      senderId: { [Op.in]: brokers.map((item) => Number(item.id)) }
    });
  }

  if (customers.length) {
    filters.push({
      senderType: TICKET_SENDER.CUSTOMER,
      senderId: { [Op.in]: customers.map((item) => Number(item.id)) }
    });
  }

  return filters;
};

export const listAdminTickets = async (req, res, next) => {
  try {
    const where = {};
    const statsWhere = {};
    const { page, limit } = getPagination(req.query);

    if (req.query.status) {
      where.status = String(req.query.status);
    }

    const phone = toEnglishDigits(String(req.query.phone || '').trim());
    const nationalCode = toEnglishDigits(String(req.query.nationalCode || '').trim());

    if (phone || nationalCode) {
      const senderFilters = await buildSenderFilters({ phone, nationalCode });

      if (!senderFilters.length) {
        return res.status(200).json(createPaginationResult({
          items: [],
          total: 0,
          page,
          limit,
          extra: {
            stats: {
              total: 0,
              pending: 0,
              answered: 0,
              closed: 0
            }
          }
        }));
      }

      where[Op.or] = senderFilters;
      statsWhere[Op.or] = senderFilters;
    }

    const [data, stats] = await Promise.all([
      listRootTickets(where, { page, limit }),
      Promise.all([
        Ticket.count({ where: { ...statsWhere, parentId: null } }),
        Ticket.count({ where: { ...statsWhere, parentId: null, status: TICKET_STATUS.PENDING } }),
        Ticket.count({ where: { ...statsWhere, parentId: null, status: TICKET_STATUS.ANSWERED } }),
        Ticket.count({ where: { ...statsWhere, parentId: null, status: TICKET_STATUS.CLOSED } })
      ])
    ]);

    return res.status(200).json({
      ...data,
      stats: {
        total: stats[0],
        pending: stats[1],
        answered: stats[2],
        closed: stats[3]
      }
    });
  } catch (error) {
    return next(error);
  }
};

export const getAdminTicketThread = async (req, res, next) => {
  try {
    const thread = await getTicketThread({ id: req.params.id });
    if (!thread) {
      return res.status(404).json({ message: 'تیکت یافت نشد' });
    }

    return res.status(200).json(thread);
  } catch (error) {
    return next(error);
  }
};

export const replyAdminTicket = async (req, res, next) => {
  try {
    const rootTicket = await Ticket.findOne({ where: { id: req.params.id, parentId: null } });
    if (!rootTicket) {
      return res.status(404).json({ message: 'تیکت یافت نشد' });
    }

    const nextStatus = String(req.body.status || TICKET_STATUS.ANSWERED);

    await Ticket.create({
      subject: null,
      body: String(req.body.body || '').trim(),
      parentId: rootTicket.id,
      status: nextStatus,
      senderType: TICKET_SENDER.ADMIN,
      senderId: req.auth.sub,
      admin: true
    });

    await rootTicket.update({ status: nextStatus });

    const thread = await getTicketThread({ id: rootTicket.id });
    return res.status(200).json({
      message: 'پاسخ تیکت ثبت شد',
      ...thread
    });
  } catch (error) {
    return next(error);
  }
};