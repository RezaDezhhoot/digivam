const BACKEND_BASE = import.meta.env.VITE_BACKEND_BASE_URL || 'http://localhost:3000';
const API_BASE = import.meta.env.VITE_API_BASE_URL || `${BACKEND_BASE}/api`;
import { emitMaintenanceEvent } from './customer-auth.api.js';

const fetchJson = async (url, options = {}) => {
  let response;
  try {
    response = await fetch(url, options);
  } catch (error) {
    throw error;
  }

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const error = new Error(data.message || 'درخواست با خطا مواجه شد');
    error.status = response.status;
    error.data = data;
    if (response.status === 503) {
      emitMaintenanceEvent({ panel: data.panel, message: error.message });
    }
    throw error;
  }

  return data;
};

const buildQuery = (params = {}) => {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== '' && value !== null && value !== undefined) {
      query.set(key, String(value));
    }
  });
  const str = query.toString();
  return str ? `?${str}` : '';
};

const optionalAuthHeader = () => {
  if (typeof window === 'undefined') return {};
  const token = localStorage.getItem('customer_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

export const getWebHomeData = (filters = {}) =>
  fetchJson(`${API_BASE}/web/home${buildQuery(filters)}`);

export const getWebSiteConfig = () =>
  fetchJson(`${API_BASE}/web/site-config`);

export const getWebFacilities = (params = {}) =>
  fetchJson(`${API_BASE}/web/facilities${buildQuery(params)}`);

export const getWebFacilityBySlug = (slug) =>
  fetchJson(`${API_BASE}/web/facilities/${encodeURIComponent(slug)}`, {
    headers: { ...optionalAuthHeader() }
  });

export const getWebTutorials = () =>
  fetchJson(`${API_BASE}/web/tutorials`);

export const getAboutUs = () =>
  fetchJson(`${API_BASE}/web/about-us`);

export const getLicenses = () =>
  fetchJson(`${API_BASE}/web/licenses`);