import { API_BASE, emitMaintenanceEvent, emitServiceUnavailableEvent } from './broker-auth.api.js';

const headers = () => {
  const token = localStorage.getItem('broker_token');
  return {
    Authorization: token ? `Bearer ${token}` : ''
  };
};

const fetchJson = async (url, options = {}) => {
  let response;
  try {
    response = await fetch(url, options);
  } catch (error) {
    emitServiceUnavailableEvent({ panel: 'broker' });
    throw error;
  }

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const error = new Error(data.message || 'درخواست با خطا مواجه شد');
    error.status = response.status;
    error.data = data;
    if (response.status === 503) {
      emitMaintenanceEvent({ panel: data.panel, message: error.message });
    } else if (response.status >= 500) {
      emitServiceUnavailableEvent({ panel: data.panel || 'broker', message: error.message });
    }
    throw error;
  }

  return data;
};

export const getBrokerDealSummary = () =>
  fetchJson(`${API_BASE}/broker/deals/summary`, {
    headers: { ...headers(), 'Content-Type': 'application/json' }
  });

export const getBrokerDeals = (query = '') =>
  fetchJson(`${API_BASE}/broker/deals${query}`, {
    headers: { ...headers(), 'Content-Type': 'application/json' }
  });

export const getBrokerDeal = (id) =>
  fetchJson(`${API_BASE}/broker/deals/${id}`, {
    headers: { ...headers(), 'Content-Type': 'application/json' }
  });

export const reviewBrokerDeal = (id, payload) =>
  fetchJson(`${API_BASE}/broker/deals/${id}/review`, {
    method: 'PATCH',
    headers: { ...headers(), 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

export const requestBrokerDealContractOtp = (id) =>
  fetchJson(`${API_BASE}/broker/deals/${id}/contract/request-otp`, {
    method: 'POST',
    headers: { ...headers(), 'Content-Type': 'application/json' }
  });

export const signBrokerDealContract = (id, payload) =>
  fetchJson(`${API_BASE}/broker/deals/${id}/contract/sign`, {
    method: 'POST',
    headers: { ...headers(), 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });