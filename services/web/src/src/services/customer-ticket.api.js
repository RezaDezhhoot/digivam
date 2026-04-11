import {
  API_BASE,
  customerAuthHeaders,
  CUSTOMER_PROFILE_KEY,
  CUSTOMER_TOKEN_KEY,
  fetchJson
} from './customer-auth.api.js';

export { CUSTOMER_PROFILE_KEY as CUSTOMER_SUPPORT_PROFILE_KEY, CUSTOMER_TOKEN_KEY as CUSTOMER_SUPPORT_TOKEN_KEY };

export const getCustomerTickets = (query = '') =>
  fetchJson(`${API_BASE}/customer/tickets${query}`, {
    headers: { ...customerAuthHeaders(), 'Content-Type': 'application/json' }
  });

export const getCustomerTicketThread = (id) =>
  fetchJson(`${API_BASE}/customer/tickets/${id}`, {
    headers: { ...customerAuthHeaders(), 'Content-Type': 'application/json' }
  });

export const createCustomerTicket = (payload) =>
  fetchJson(`${API_BASE}/customer/tickets`, {
    method: 'POST',
    headers: { ...customerAuthHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

export const replyCustomerTicket = (id, payload) =>
  fetchJson(`${API_BASE}/customer/tickets/${id}/replies`, {
    method: 'POST',
    headers: { ...customerAuthHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });