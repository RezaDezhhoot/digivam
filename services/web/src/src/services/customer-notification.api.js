import { API_BASE, customerAuthHeaders, fetchJson } from './customer-auth.api.js';

export const getCustomerNotificationSummary = () =>
  fetchJson(`${API_BASE}/customer/notifications/summary`, {
    headers: customerAuthHeaders()
  });

export const getCustomerNotifications = (query = '') =>
  fetchJson(`${API_BASE}/customer/notifications${query}`, {
    headers: { ...customerAuthHeaders(), 'Content-Type': 'application/json' }
  });

export const markCustomerNotificationRead = (id) =>
  fetchJson(`${API_BASE}/customer/notifications/${id}/read`, {
    method: 'PATCH',
    headers: { ...customerAuthHeaders(), 'Content-Type': 'application/json' }
  });

export const markAllCustomerNotificationsRead = () =>
  fetchJson(`${API_BASE}/customer/notifications/read-all`, {
    method: 'PATCH',
    headers: { ...customerAuthHeaders(), 'Content-Type': 'application/json' }
  });