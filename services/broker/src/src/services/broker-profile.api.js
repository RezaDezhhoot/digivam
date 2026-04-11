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

const uploadWithProgress = (url, formData, onProgress) =>
  new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('PUT', url, true);

    const auth = headers().Authorization;
    if (auth) {
      xhr.setRequestHeader('Authorization', auth);
    }

    xhr.upload.onprogress = (event) => {
      if (!event.lengthComputable || typeof onProgress !== 'function') {
        return;
      }

      onProgress(Math.round((event.loaded / event.total) * 100));
    };

    xhr.onload = () => {
      const data = JSON.parse(xhr.responseText || '{}');
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(data);
        return;
      }

      reject(new Error(data.message || 'درخواست با خطا مواجه شد'));
    };

    xhr.onerror = () => reject(new Error('ارتباط با سرور برقرار نشد'));
    xhr.send(formData);
  });

export const getBrokerProfile = () =>
  fetchJson(`${API_BASE}/broker/profile`, {
    headers: headers()
  });

export const updateBrokerLevel1 = (payload) =>
  fetchJson(`${API_BASE}/broker/profile/level-1`, {
    method: 'PUT',
    headers: { ...headers(), 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

export const updateBrokerLevel2 = (formData, onProgress) =>
  uploadWithProgress(`${API_BASE}/broker/profile/level-2`, formData, onProgress);

export const updateBrokerAvatar = (formData, onProgress) =>
  uploadWithProgress(`${API_BASE}/broker/profile/avatar`, formData, onProgress);
