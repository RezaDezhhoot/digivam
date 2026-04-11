import { API_BASE, customerAuthHeaders, fetchJson } from './customer-auth.api.js';

export const getCustomerProfile = () =>
  fetchJson(`${API_BASE}/customer/profile`, {
    headers: { ...customerAuthHeaders(), 'Content-Type': 'application/json' }
  });

export const updateCustomerProfile = (payload) =>
  fetchJson(`${API_BASE}/customer/profile`, {
    method: 'PUT',
    headers: { ...customerAuthHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

export const updateCustomerAvatar = (formData) =>
  fetchJson(`${API_BASE}/customer/profile/avatar`, {
    method: 'PUT',
    headers: customerAuthHeaders(),
    body: formData
  });