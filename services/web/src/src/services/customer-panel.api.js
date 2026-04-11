import { API_BASE, customerAuthHeaders, fetchJson } from './customer-auth.api.js';

const buildQueryString = (query = '') => {
  if (!query) {
    return '';
  }

  if (typeof query === 'string') {
    return query.startsWith('?') ? query : `?${query}`;
  }

  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null || value === '') {
      continue;
    }

    params.set(key, String(value));
  }

  const serialized = params.toString();
  return serialized ? `?${serialized}` : '';
};

export const getCustomerDashboard = () =>
  fetchJson(`${API_BASE}/customer/panel/dashboard`, {
    headers: { ...customerAuthHeaders(), 'Content-Type': 'application/json' }
  });

export const getMyValidations = (query = '') =>
  fetchJson(`${API_BASE}/customer/validations${buildQueryString(query)}`, {
    headers: { ...customerAuthHeaders(), 'Content-Type': 'application/json' }
  });

export const getMyValidation = (id) =>
  fetchJson(`${API_BASE}/customer/validations/${id}`, {
    headers: { ...customerAuthHeaders(), 'Content-Type': 'application/json' }
  });

export const getValidationStatus = (validationId) =>
  fetchJson(`${API_BASE}/customer/validations/status/${validationId}`, {
    headers: { ...customerAuthHeaders(), 'Content-Type': 'application/json' }
  });

export const getValidationStages = (validationId) =>
  fetchJson(`${API_BASE}/customer/validations/stages/${validationId}`, {
    headers: { ...customerAuthHeaders() }
  });

export const startValidationPayment = (payload) =>
  fetchJson(`${API_BASE}/customer/validations/payment/start`, {
    method: 'POST',
    headers: { ...customerAuthHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

export const verifyValidationPayment = (payload) =>
  fetchJson(`${API_BASE}/customer/validations/payment/verify`, {
    method: 'POST',
    headers: { ...customerAuthHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

export const submitValidation = (formData) =>
  fetchJson(`${API_BASE}/customer/validations`, {
    method: 'POST',
    headers: { ...customerAuthHeaders() },
    body: formData
  });

export const resubmitValidation = (id, formData) =>
  fetchJson(`${API_BASE}/customer/validations/${id}/resubmit`, {
    method: 'PUT',
    headers: { ...customerAuthHeaders() },
    body: formData
  });

export const initValidation = (payload) =>
  fetchJson(`${API_BASE}/customer/validations/init`, {
    method: 'POST',
    headers: { ...customerAuthHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

export const saveValidationStage = (id, formData) =>
  fetchJson(`${API_BASE}/customer/validations/${id}/save-stage`, {
    method: 'POST',
    headers: { ...customerAuthHeaders() },
    body: formData
  });

export const finalizeValidation = (id) =>
  fetchJson(`${API_BASE}/customer/validations/${id}/finalize`, {
    method: 'POST',
    headers: { ...customerAuthHeaders(), 'Content-Type': 'application/json' }
  });

export const submitSelfValidation = (formData) =>
  fetchJson(`${API_BASE}/customer/validations/self-validation`, {
    method: 'POST',
    headers: { ...customerAuthHeaders() },
    body: formData
  });

/* ─── Bookmarks ─── */

export const getMyBookmarks = (query = '') =>
  fetchJson(`${API_BASE}/customer/panel/bookmarks${buildQueryString(query)}`, {
    headers: { ...customerAuthHeaders(), 'Content-Type': 'application/json' }
  });

export const toggleBookmark = (facilityId) =>
  fetchJson(`${API_BASE}/customer/panel/bookmarks/${facilityId}`, {
    method: 'POST',
    headers: { ...customerAuthHeaders(), 'Content-Type': 'application/json' }
  });

export const getBookmarkStatus = (facilityId) =>
  fetchJson(`${API_BASE}/customer/panel/bookmarks/${facilityId}/status`, {
    headers: { ...customerAuthHeaders(), 'Content-Type': 'application/json' }
  });

/* ─── Recently Viewed ─── */

export const getMyRecentlyViewed = (query = '') =>
  fetchJson(`${API_BASE}/customer/panel/recently-viewed${buildQueryString(query)}`, {
    headers: { ...customerAuthHeaders(), 'Content-Type': 'application/json' }
  });

/* ─── Deals ─── */

export const getCustomerDealSummary = () =>
  fetchJson(`${API_BASE}/customer/deals/summary`, {
    headers: { ...customerAuthHeaders(), 'Content-Type': 'application/json' }
  });

export const getCustomerDeals = (query = '') =>
  fetchJson(`${API_BASE}/customer/deals${buildQueryString(query)}`, {
    headers: { ...customerAuthHeaders(), 'Content-Type': 'application/json' }
  });

export const getCustomerDeal = (id) =>
  fetchJson(`${API_BASE}/customer/deals/${id}`, {
    headers: { ...customerAuthHeaders(), 'Content-Type': 'application/json' }
  });

export const createCustomerDeal = (payload) =>
  fetchJson(`${API_BASE}/customer/deals`, {
    method: 'POST',
    headers: { ...customerAuthHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

export const saveCustomerDealDocuments = (id, formData) =>
  fetchJson(`${API_BASE}/customer/deals/${id}/documents`, {
    method: 'POST',
    headers: { ...customerAuthHeaders() },
    body: formData
  });

export const requestCustomerDealContractOtp = (id) =>
  fetchJson(`${API_BASE}/customer/deals/${id}/contract/request-otp`, {
    method: 'POST',
    headers: { ...customerAuthHeaders(), 'Content-Type': 'application/json' }
  });

export const signCustomerDealContract = (id, payload) =>
  fetchJson(`${API_BASE}/customer/deals/${id}/contract/sign`, {
    method: 'POST',
    headers: { ...customerAuthHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

export const startDealCashPayment = (dealId, paymentTypeId) =>
  fetchJson(`${API_BASE}/customer/deals/${dealId}/payment/${paymentTypeId}/cash-start`, {
    method: 'POST',
    headers: { ...customerAuthHeaders(), 'Content-Type': 'application/json' }
  });

export const verifyDealCashPayment = (dealId, paymentTypeId, payload) =>
  fetchJson(`${API_BASE}/customer/deals/${dealId}/payment/${paymentTypeId}/cash-verify`, {
    method: 'POST',
    headers: { ...customerAuthHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

export const uploadDealCheckPaymentFile = (dealId, paymentTypeId, formData) =>
  fetchJson(`${API_BASE}/customer/deals/${dealId}/payment/${paymentTypeId}/check-upload`, {
    method: 'POST',
    headers: { ...customerAuthHeaders() },
    body: formData
  });

export const advanceDealPaymentStage = (dealId) =>
  fetchJson(`${API_BASE}/customer/deals/${dealId}/payment/advance`, {
    method: 'POST',
    headers: { ...customerAuthHeaders(), 'Content-Type': 'application/json' }
  });