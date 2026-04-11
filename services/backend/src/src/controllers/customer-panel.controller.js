import { Ticket } from '../models/ticket.model.js';
import { ensureCustomerWithWallet, serializeCustomerProfile } from '../services/customer-profile.service.js';
import { createDealSummary, listDeals } from '../services/deal.service.js';
import { createNotificationSummary, listNotifications } from '../services/notification.service.js';
import { listRootTickets, TICKET_SENDER, TICKET_STATUS } from '../services/ticket.service.js';
import { Notification } from '../models/notification.model.js';

const customerTicketWhere = (customerId) => ({
  senderType: TICKET_SENDER.CUSTOMER,
  senderId: Number(customerId),
  parentId: null
});

const customerNotificationWhere = (customerId) => ({
  modelType: Notification.MODEL_TYPES.CUSTOMER,
  modelId: Number(customerId)
});

export const getCustomerDashboard = async (req, res, next) => {
  try {
    const customer = await ensureCustomerWithWallet(req.auth.sub);

    if (!customer) {
      return res.status(404).json({ message: 'مشتری یافت نشد' });
    }

    const ticketWhere = customerTicketWhere(req.auth.sub);
    const notificationWhere = customerNotificationWhere(req.auth.sub);

    const [
      ticketTotal,
      ticketPending,
      ticketAnswered,
      ticketClosed,
      latestTickets,
      dealSummary,
      latestDeals,
      notificationSummary,
      latestNotifications
    ] = await Promise.all([
      Ticket.count({ where: ticketWhere }),
      Ticket.count({ where: { ...ticketWhere, status: TICKET_STATUS.PENDING } }),
      Ticket.count({ where: { ...ticketWhere, status: TICKET_STATUS.ANSWERED } }),
      Ticket.count({ where: { ...ticketWhere, status: TICKET_STATUS.CLOSED } }),
      listRootTickets(
        {
          senderType: TICKET_SENDER.CUSTOMER,
          senderId: Number(req.auth.sub)
        },
        { limit: 4 }
      ),
      createDealSummary({ customerId: Number(req.auth.sub) }),
      listDeals({ where: { customerId: Number(req.auth.sub) }, page: 1, limit: 4 }),
      createNotificationSummary(notificationWhere),
      listNotifications({ where: notificationWhere, page: 1, limit: 5 })
    ]);

    return res.status(200).json({
      profile: serializeCustomerProfile(customer),
      ticketSummary: {
        total: ticketTotal,
        pending: ticketPending,
        answered: ticketAnswered,
        closed: ticketClosed
      },
      dealSummary,
      latestDeals: latestDeals.items,
      notificationSummary,
      latestTickets: latestTickets.items,
      latestNotifications: latestNotifications.items
    });
  } catch (error) {
    return next(error);
  }
};