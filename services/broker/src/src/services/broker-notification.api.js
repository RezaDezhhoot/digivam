import { API_BASE, brokerAuthHeaders, brokerFetchJson } from './broker-auth.api.js';

export const getBrokerNotificationSummary = () =>
  brokerFetchJson(`${API_BASE}/broker/notifications/summary`, {
    headers: brokerAuthHeaders()
  });

export const getBrokerNotifications = (query = '') =>
  brokerFetchJson(`${API_BASE}/broker/notifications${query}`, {
    headers: { ...brokerAuthHeaders(), 'Content-Type': 'application/json' }
  });

export const markBrokerNotificationRead = (id) =>
  brokerFetchJson(`${API_BASE}/broker/notifications/${id}/read`, {
    method: 'PATCH',
    headers: { ...brokerAuthHeaders(), 'Content-Type': 'application/json' }
  });

export const markAllBrokerNotificationsRead = () =>
  brokerFetchJson(`${API_BASE}/broker/notifications/read-all`, {
    method: 'PATCH',
    headers: { ...brokerAuthHeaders(), 'Content-Type': 'application/json' }
  });
