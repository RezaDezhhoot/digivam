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

export const getBrokerFacilityOptions = () =>
  fetchJson(`${API_BASE}/broker/facilities/options`, {
    headers: headers()
  });

export const getBrokerFacilitySummary = () =>
  fetchJson(`${API_BASE}/broker/facilities/summary`, {
    headers: headers()
  });

export const getBrokerFacilityDailyViews = (query = '') =>
  fetchJson(`${API_BASE}/broker/facilities/daily-views${query}`, {
    headers: headers()
  });

export const getBrokerFacilities = (query = '') =>
  fetchJson(`${API_BASE}/broker/facilities${query}`, {
    headers: { ...headers(), 'Content-Type': 'application/json' }
  });

export const createBrokerFacility = (payload) =>
  fetchJson(`${API_BASE}/broker/facilities`, {
    method: 'POST',
    headers: { ...headers(), 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

export const updateBrokerFacility = (id, payload) =>
  fetchJson(`${API_BASE}/broker/facilities/${id}`, {
    method: 'PUT',
    headers: { ...headers(), 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });