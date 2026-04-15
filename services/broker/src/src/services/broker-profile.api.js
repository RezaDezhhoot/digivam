import { API_BASE, brokerAuthHeaders, brokerFetchJson } from './broker-auth.api.js';

const uploadWithProgress = (url, formData, onProgress) =>
  new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('PUT', url, true);

    // const auth = headers().Authorization;
    // if (auth) {
    // }
    xhr.setRequestHeader('Authorization', brokerAuthHeaders().Authorization);

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
  brokerFetchJson(`${API_BASE}/broker/profile`, {
    headers: brokerAuthHeaders()
  });

export const updateBrokerLevel1 = (payload) =>
  brokerFetchJson(`${API_BASE}/broker/profile/level-1`, {
    method: 'PUT',
    headers: { ...brokerAuthHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

export const updateBrokerLevel2 = (formData, onProgress) =>
  uploadWithProgress(`${API_BASE}/broker/profile/level-2`, formData, onProgress);

export const updateBrokerAvatar = (formData, onProgress) =>
  uploadWithProgress(`${API_BASE}/broker/profile/avatar`, formData, onProgress);
