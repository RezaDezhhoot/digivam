const BACKEND_BASE = import.meta.env.VITE_BACKEND_BASE_URL || 'http://localhost:3000';
export const API_BASE = import.meta.env.VITE_API_BASE_URL || `${BACKEND_BASE}/api`;
export const BROKER_TOKEN_KEY = 'broker_token';
export const BROKER_PROFILE_KEY = 'broker_profile';
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

export const readStoredBrokerProfile = () => {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    const raw = localStorage.getItem(BROKER_PROFILE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

const persistSuspendedBrokerProfile = (reason = '', message = '') => {
  if (typeof window === 'undefined') {
    return;
  }

  const profile = readStoredBrokerProfile() || {};
  localStorage.setItem(
    BROKER_PROFILE_KEY,
    JSON.stringify({
      ...profile,
      isSuspended: true,
      suspendReason: reason || profile.suspendReason || message || ''
    })
  );
};

export const brokerAuthHeaders = () => {
  if (typeof window === 'undefined') {
    return {};
  }

  const token = localStorage.getItem(BROKER_TOKEN_KEY);
  return {
    Authorization: token ? `Bearer ${token}` : ''
  };
};

export const persistBrokerSession = ({ token, broker }) => {
  if (typeof window === 'undefined') {
    return;
  }

  if (token) {
    localStorage.setItem(BROKER_TOKEN_KEY, token);
  }

  if (broker) {
    localStorage.setItem(BROKER_PROFILE_KEY, JSON.stringify(broker));
  }
};

export const clearBrokerSessionStorage = () => {
  if (typeof window === 'undefined') {
    return;
  }

  localStorage.removeItem(BROKER_TOKEN_KEY);
  localStorage.removeItem(BROKER_PROFILE_KEY);
};

export const brokerFetchJson = async (url, options = {}) => {
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
      persistSuspendedBrokerProfile(data.reason, error.message);
      emitAccountSuspendedEvent({ panel: data.panel || 'broker', message: error.message, reason: data.reason || '' });
    } else if (response.status === 503) {
      emitMaintenanceEvent({ panel: data.panel, message: error.message });
    }
    throw error;
  }

  return data;
};

export const requestOtp = async (phone) => {
  return brokerFetchJson(`${API_BASE}/broker/auth/request-otp`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ phone })
  });
};

export const verifyOtp = async (phone, password) => {
  return brokerFetchJson(`${API_BASE}/broker/auth/verify-otp`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ phone, password })
  });
};
