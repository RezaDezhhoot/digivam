import { Ticket } from '../models/ticket.model.js';
import { getTicketThread, listRootTickets, TICKET_SENDER, TICKET_STATUS } from '../services/ticket.service.js';

export const listCustomerTickets = async (req, res, next) => {
  try {
    const where = {
      senderType: TICKET_SENDER.CUSTOMER,
      senderId: req.auth.sub
    };

    if (req.query.status) {
      where.status = String(req.query.status);
    }

    const data = await listRootTickets(where);
    return res.status(200).json(data);
  } catch (error) {
    return next(error);
  }
};

export const createCustomerTicket = async (req, res, next) => {
  try {
    const ticket = await Ticket.create({
      subject: String(req.body.subject || '').trim(),
      body: String(req.body.body || '').trim(),
      status: TICKET_STATUS.PENDING,
      senderType: TICKET_SENDER.CUSTOMER,
      senderId: req.auth.sub,
      admin: false
    });

    const thread = await getTicketThread({ id: ticket.id, senderType: TICKET_SENDER.CUSTOMER, senderId: req.auth.sub });
    return res.status(201).json({ message: 'تیکت شما ثبت شد', ...thread });
  } catch (error) {
    return next(error);
  }
};

export const getCustomerTicketThread = async (req, res, next) => {
  try {
    const thread = await getTicketThread({
      id: req.params.id,
      senderType: TICKET_SENDER.CUSTOMER,
      senderId: req.auth.sub
    });

    if (!thread) {
      return res.status(404).json({ message: 'تیکت یافت نشد' });
    }

    return res.status(200).json(thread);
  } catch (error) {
    return next(error);
  }
};

export const replyCustomerTicket = async (req, res, next) => {
  try {
    const rootTicket = await Ticket.findOne({
      where: {
        id: req.params.id,
        parentId: null,
        senderType: TICKET_SENDER.CUSTOMER,
        senderId: req.auth.sub
      }
    });

    if (!rootTicket) {
      return res.status(404).json({ message: 'تیکت یافت نشد' });
    }

    await Ticket.create({
      subject: null,
      body: String(req.body.body || '').trim(),
      parentId: rootTicket.id,
      status: TICKET_STATUS.PENDING,
      senderType: TICKET_SENDER.CUSTOMER,
      senderId: req.auth.sub,
      admin: false
    });

    await rootTicket.update({ status: TICKET_STATUS.PENDING });

    const thread = await getTicketThread({ id: rootTicket.id, senderType: TICKET_SENDER.CUSTOMER, senderId: req.auth.sub });
    return res.status(200).json({ message: 'پاسخ شما ثبت شد', ...thread });
  } catch (error) {
    return next(error);
  }
};