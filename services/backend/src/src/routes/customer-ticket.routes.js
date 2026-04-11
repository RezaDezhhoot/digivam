import { Router } from 'express';
import { listCustomerTickets, createCustomerTicket, getCustomerTicketThread, replyCustomerTicket } from '../controllers/customer-ticket.controller.js';
import { requireAuth } from '../middlewares/auth.js';
import { validateRequest } from '../middlewares/validate-request.js';
import {
  createCustomerTicketValidator,
  customerTicketIdValidator,
  replyCustomerTicketValidator
} from '../validators/customer-ticket.validator.js';

export const customerTicketRouter = Router();

customerTicketRouter.use('/tickets', requireAuth('customer'));
customerTicketRouter.get('/tickets', listCustomerTickets);
customerTicketRouter.post('/tickets', createCustomerTicketValidator, validateRequest, createCustomerTicket);
customerTicketRouter.get('/tickets/:id', customerTicketIdValidator, validateRequest, getCustomerTicketThread);
customerTicketRouter.post('/tickets/:id/replies', replyCustomerTicketValidator, validateRequest, replyCustomerTicket);