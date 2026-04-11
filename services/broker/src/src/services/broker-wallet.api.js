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

export const getBrokerWalletOverview = () =>
  fetchJson(`${API_BASE}/broker/wallet`, {
    headers: headers()
  });

export const createBrokerWalletCharge = (payload) =>
  fetchJson(`${API_BASE}/broker/wallet/charge`, {
    method: 'POST',
    headers: { ...headers(), 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

export const verifyBrokerWalletCharge = (payload) =>
  fetchJson(`${API_BASE}/broker/wallet/verify`, {
    method: 'POST',
    headers: { ...headers(), 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });