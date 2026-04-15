import { Router } from 'express';
import { requireAuth } from '../middlewares/auth.js';
import { validateRequest } from '../middlewares/validate-request.js';
import {
  createBrokerTicket,
  getBrokerTicketThread,
  listBrokerTickets,
  replyBrokerTicket
} from '../controllers/broker-ticket.controller.js';
import {
  brokerTicketIdValidator,
  createBrokerTicketValidator,
  replyBrokerTicketValidator
} from '../validators/broker-ticket.validator.js';

export const brokerTicketRouter = Router();

brokerTicketRouter.use(requireAuth('broker', { allowSuspended: true }));

brokerTicketRouter.get('/', listBrokerTickets);
brokerTicketRouter.post('/', createBrokerTicketValidator, validateRequest, createBrokerTicket);
brokerTicketRouter.get('/:id', brokerTicketIdValidator, validateRequest, getBrokerTicketThread);
brokerTicketRouter.post('/:id/replies', replyBrokerTicketValidator, validateRequest, replyBrokerTicket);