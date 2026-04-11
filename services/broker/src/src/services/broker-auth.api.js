const BACKEND_BASE = import.meta.env.VITE_BACKEND_BASE_URL || 'http://localhost:3000';
export const API_BASE = import.meta.env.VITE_API_BASE_URL || `${BACKEND_BASE}/api`;

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

export const requestOtp = async (phone) => {
  let response;
  try {
    response = await fetch(`${API_BASE}/broker/auth/request-otp`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ phone })
    });
  } catch (error) {
    emitServiceUnavailableEvent({ panel: 'broker' });
    throw error;
  }

  const data = await response.json();
  if (!response.ok) {
    const error = new Error(data.message || 'خطا در ارسال کد تایید');
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

export const verifyOtp = async (phone, password) => {
  let response;
  try {
    response = await fetch(`${API_BASE}/broker/auth/verify-otp`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ phone, password })
    });
  } catch (error) {
    emitServiceUnavailableEvent({ panel: 'broker' });
    throw error;
  }

  const data = await response.json();
  if (!response.ok) {
    const error = new Error(data.message || 'خطا در تایید کد');
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
