const BACKEND_BASE = import.meta.env.VITE_BACKEND_BASE_URL || 'http://localhost:3000';
export const API_BASE = import.meta.env.VITE_API_BASE_URL || `${BACKEND_BASE}/api`;

export const CUSTOMER_TOKEN_KEY = 'customer_token';
export const CUSTOMER_PROFILE_KEY = 'customer_profile';
export const ACCOUNT_SUSPENDED_EVENT = 'app-account-suspended';

export const emitMaintenanceEvent = (payload = {}) => {
  if (typeof window === 'undefined') {
    return;
  }

  window.dispatchEvent(
    new CustomEvent('app-maintenance', {
      detail: {
        panel: payload.panel || null,
        message: payload.message || 'در حال بروزرسانی هستیم، بعدا مراجعه کنید'
      }
    })
  );
};

export const emitServiceUnavailableEvent = (payload = {}) => {
  if (typeof window === 'undefined') {
    return;
  }

  window.dispatchEvent(
    new CustomEvent('app-service-unavailable', {
      detail: {
        panel: payload.panel || null,
        message: payload.message || 'امکان بارگذاری اطلاعات وجود ندارد. لطفا دوباره تلاش کنید.'
      }
    })
  );
};

export const emitAccountSuspendedEvent = (payload = {}) => {
  if (typeof window === 'undefined') {
    return;
  }

  window.dispatchEvent(
    new CustomEvent(ACCOUNT_SUSPENDED_EVENT, {
      detail: {
        panel: payload.panel || null,
        message: payload.message || 'حساب شما توسط ادمین معلق شده است',
        reason: payload.reason || ''
      }
    })
  );
};

const persistSuspendedCustomerProfile = (reason = '', message = '') => {
  if (typeof window === 'undefined') {
    return;
  }

  const profile = readStoredCustomerProfile() || {};
  localStorage.setItem(
    CUSTOMER_PROFILE_KEY,
    JSON.stringify({
      ...profile,
      isSuspended: true,
      suspendReason: reason || profile.suspendReason || message || ''
    })
  );
};

export const fetchJson = async (url, options = {}) => {
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
    if (response.status === 423 && data.code === 'ACCOUNT_SUSPENDED') {
      persistSuspendedCustomerProfile(data.reason, error.message);
      emitAccountSuspendedEvent({ panel: data.panel || 'customer', message: error.message, reason: data.reason || '' });
    } else if (response.status === 503) {
      emitMaintenanceEvent({ panel: data.panel, message: error.message });
    }
    throw error;
  }

  return data;
};

export const customerAuthHeaders = () => {
  if (typeof window === 'undefined') {
    return {};
  }

  const token = localStorage.getItem(CUSTOMER_TOKEN_KEY);

  return {
    Authorization: token ? `Bearer ${token}` : ''
  };
};

export const readStoredCustomerProfile = () => {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    const raw = localStorage.getItem(CUSTOMER_PROFILE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

export const persistCustomerSession = ({ token, customer }) => {
  if (typeof window === 'undefined') {
    return;
  }

  if (token) {
    localStorage.setItem(CUSTOMER_TOKEN_KEY, token);
  }

  if (customer) {
    localStorage.setItem(CUSTOMER_PROFILE_KEY, JSON.stringify(customer));
  }
};

export const clearCustomerSessionStorage = () => {
  if (typeof window === 'undefined') {
    return;
  }

  localStorage.removeItem(CUSTOMER_TOKEN_KEY);
  localStorage.removeItem(CUSTOMER_PROFILE_KEY);
};

export const requestCustomerOtp = (payload) =>
  fetchJson(`${API_BASE}/customer/auth/request-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

export const verifyCustomerOtp = (payload) =>
  fetchJson(`${API_BASE}/customer/auth/verify-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });