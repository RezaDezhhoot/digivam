import { API_BASE, brokerAuthHeaders, brokerFetchJson } from './broker-auth.api.js';

export const getBrokerFacilityOptions = () =>
  brokerFetchJson(`${API_BASE}/broker/facilities/options`, {
    headers: brokerAuthHeaders()
  });

export const getBrokerFacilitySummary = () =>
  brokerFetchJson(`${API_BASE}/broker/facilities/summary`, {
    headers: brokerAuthHeaders()
  });

export const getBrokerFacilityDailyViews = (query = '') =>
  brokerFetchJson(`${API_BASE}/broker/facilities/daily-views${query}`, {
    headers: brokerAuthHeaders()
  });

export const getBrokerFacilities = (query = '') =>
  brokerFetchJson(`${API_BASE}/broker/facilities${query}`, {
    headers: { ...brokerAuthHeaders(), 'Content-Type': 'application/json' }
  });

export const createBrokerFacility = (payload) =>
  brokerFetchJson(`${API_BASE}/broker/facilities`, {
    method: 'POST',
    headers: { ...brokerAuthHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

export const updateBrokerFacility = (id, payload) =>
  brokerFetchJson(`${API_BASE}/broker/facilities/${id}`, {
    method: 'PUT',
    headers: { ...brokerAuthHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });