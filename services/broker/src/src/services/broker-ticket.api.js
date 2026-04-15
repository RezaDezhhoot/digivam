import { API_BASE, brokerAuthHeaders, brokerFetchJson } from './broker-auth.api.js';

export const getBrokerTickets = (query = '') =>
  brokerFetchJson(`${API_BASE}/broker/tickets${query}`, {
    headers: { ...brokerAuthHeaders(), 'Content-Type': 'application/json' }
  });

export const createBrokerTicket = (payload) =>
  brokerFetchJson(`${API_BASE}/broker/tickets`, {
    method: 'POST',
    headers: { ...brokerAuthHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

export const getBrokerTicketThread = (id) =>
  brokerFetchJson(`${API_BASE}/broker/tickets/${id}`, {
    headers: { ...brokerAuthHeaders(), 'Content-Type': 'application/json' }
  });

export const replyBrokerTicket = (id, payload) =>
  brokerFetchJson(`${API_BASE}/broker/tickets/${id}/replies`, {
    method: 'POST',
    headers: { ...brokerAuthHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });