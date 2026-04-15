import { API_BASE, brokerAuthHeaders, brokerFetchJson } from './broker-auth.api.js';

export const getBrokerWalletOverview = () =>
  brokerFetchJson(`${API_BASE}/broker/wallet`, {
    headers: brokerAuthHeaders()
  });

export const createBrokerWalletCharge = (payload) =>
  brokerFetchJson(`${API_BASE}/broker/wallet/charge`, {
    method: 'POST',
    headers: { ...brokerAuthHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

export const verifyBrokerWalletCharge = (payload) =>
  brokerFetchJson(`${API_BASE}/broker/wallet/verify`, {
    method: 'POST',
    headers: { ...brokerAuthHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

export const getBrokerWithdrawals = () =>
  brokerFetchJson(`${API_BASE}/broker/wallet/withdrawals`, {
    headers: brokerAuthHeaders()
  });

export const createBrokerWithdrawal = (payload) =>
  brokerFetchJson(`${API_BASE}/broker/wallet/withdrawals`, {
    method: 'POST',
    headers: { ...brokerAuthHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });