import { API_BASE, brokerAuthHeaders, brokerFetchJson } from './broker-auth.api.js';

export const getBrokerDealSummary = () =>
  brokerFetchJson(`${API_BASE}/broker/deals/summary`, {
    headers: { ...brokerAuthHeaders(), 'Content-Type': 'application/json' }
  });

export const getBrokerDeals = (query = '') =>
  brokerFetchJson(`${API_BASE}/broker/deals${query}`, {
    headers: { ...brokerAuthHeaders(), 'Content-Type': 'application/json' }
  });

export const getBrokerDeal = (id) =>
  brokerFetchJson(`${API_BASE}/broker/deals/${id}`, {
    headers: { ...brokerAuthHeaders(), 'Content-Type': 'application/json' }
  });

export const reviewBrokerDeal = (id, payload) =>
  brokerFetchJson(`${API_BASE}/broker/deals/${id}/review`, {
    method: 'PATCH',
    headers: { ...brokerAuthHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

export const submitBrokerDealTransfer = (id, formData) =>
  brokerFetchJson(`${API_BASE}/broker/deals/${id}/transfer`, {
    method: 'POST',
    headers: { ...brokerAuthHeaders() },
    body: formData
  });

export const requestBrokerDealContractOtp = (id) =>
  brokerFetchJson(`${API_BASE}/broker/deals/${id}/contract/request-otp`, {
    method: 'POST',
    headers: { ...brokerAuthHeaders(), 'Content-Type': 'application/json' }
  });

export const signBrokerDealContract = (id, payload) =>
  brokerFetchJson(`${API_BASE}/broker/deals/${id}/contract/sign`, {
    method: 'POST',
    headers: { ...brokerAuthHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

export const getBrokerDealMessages = (id) =>
  brokerFetchJson(`${API_BASE}/broker/deals/${id}/messages`, {
    headers: { ...brokerAuthHeaders(), 'Content-Type': 'application/json' }
  });

export const sendBrokerDealMessage = (id, payload) =>
  brokerFetchJson(`${API_BASE}/broker/deals/${id}/messages`, {
    method: 'POST',
    headers: { ...brokerAuthHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

export const getBrokerDealUnreadCount = (id) =>
  brokerFetchJson(`${API_BASE}/broker/deals/${id}/messages/unread`, {
    headers: { ...brokerAuthHeaders(), 'Content-Type': 'application/json' }
  });