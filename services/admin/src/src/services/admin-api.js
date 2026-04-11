const BACKEND_BASE = import.meta.env.VITE_BACKEND_BASE_URL || 'http://localhost:3000';
const API_BASE = import.meta.env.VITE_API_BASE_URL || `${BACKEND_BASE}/api`;

const tokenHeaders = () => {
  const token = localStorage.getItem('admin_token');
  return {
    Authorization: token ? `Bearer ${token}` : ''
  };
};

const authHeaders = () => ({
  'Content-Type': 'application/json',
  ...tokenHeaders()
});

const fetchJson = async (url, options = {}) => {
  const response = await fetch(url, options);
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const error = new Error(data.message || 'درخواست با خطا مواجه شد');
    error.status = response.status;
    error.data = data;
    throw error;
  }

  return data;
};

export const adminLogin = (payload) =>
  fetchJson(`${API_BASE}/admin/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

export const getSummary = () =>
  fetchJson(`${API_BASE}/admin/panel/summary`, {
    headers: authHeaders()
  });

export const getAdminDealSummary = () =>
  fetchJson(`${API_BASE}/admin/panel/deals/summary`, {
    headers: authHeaders()
  });

export const getAdminDeals = (query = '') =>
  fetchJson(`${API_BASE}/admin/panel/deals${query}`, {
    headers: authHeaders()
  });

export const getAdminDeal = (id) =>
  fetchJson(`${API_BASE}/admin/panel/deals/${id}`, {
    headers: authHeaders()
  });

export const updateAdminDeal = (id, payload) =>
  fetchJson(`${API_BASE}/admin/panel/deals/${id}`, {
    method: 'PATCH',
    headers: authHeaders(),
    body: JSON.stringify(payload)
  });

export const refreshAdminDealContract = (id) =>
  fetchJson(`${API_BASE}/admin/panel/deals/${id}/refresh-contract`, {
    method: 'POST',
    headers: authHeaders()
  });

export const removeAdminDealSignature = (id, role) =>
  fetchJson(`${API_BASE}/admin/panel/deals/${id}/signature/${role}`, {
    method: 'DELETE',
    headers: authHeaders()
  });

export const getPageViews = (query = '') =>
  fetchJson(`${API_BASE}/admin/panel/page-views${query}`, {
    headers: authHeaders()
  });

export const getNotificationOptions = () =>
  fetchJson(`${API_BASE}/admin/panel/notifications/options`, {
    headers: authHeaders()
  });

export const getNotifications = (query = '') =>
  fetchJson(`${API_BASE}/admin/panel/notifications${query}`, {
    headers: authHeaders()
  });

export const createNotification = (payload) =>
  fetchJson(`${API_BASE}/admin/panel/notifications`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(payload)
  });

export const getBrokers = (query = '') =>
  fetchJson(`${API_BASE}/admin/panel/brokers${query}`, {
    headers: authHeaders()
  });

export const updateBrokerLevel = (id, verifyLevel) =>
  fetchJson(`${API_BASE}/admin/panel/brokers/${id}/verify-level`, {
    method: 'PATCH',
    headers: authHeaders(),
    body: JSON.stringify({ verifyLevel })
  });

export const deleteBroker = (id) =>
  fetchJson(`${API_BASE}/admin/panel/brokers/${id}`, {
    method: 'DELETE',
    headers: authHeaders()
  });

export const getCustomers = (query = '') =>
  fetchJson(`${API_BASE}/admin/panel/customers${query}`, {
    headers: authHeaders()
  });

export const deleteCustomer = (id) =>
  fetchJson(`${API_BASE}/admin/panel/customers/${id}`, {
    method: 'DELETE',
    headers: authHeaders()
  });

export const getAdmins = (query = '') =>
  fetchJson(`${API_BASE}/admin/panel/admins${query}`, {
    headers: authHeaders()
  });

export const createAdmin = (payload) =>
  fetchJson(`${API_BASE}/admin/panel/admins`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(payload)
  });

export const updateAdmin = (id, payload) =>
  fetchJson(`${API_BASE}/admin/panel/admins/${id}`, {
    method: 'PUT',
    headers: authHeaders(),
    body: JSON.stringify(payload)
  });

export const deleteAdmin = (id) =>
  fetchJson(`${API_BASE}/admin/panel/admins/${id}`, {
    method: 'DELETE',
    headers: authHeaders()
  });

export const getSettings = () =>
  fetchJson(`${API_BASE}/admin/panel/settings`, {
    headers: tokenHeaders()
  });

export const updateSettings = (formData) =>
  fetchJson(`${API_BASE}/admin/panel/settings`, {
    method: 'PUT',
    headers: tokenHeaders(),
    body: formData
  });

export const getGuarantees = (query = '') =>
  fetchJson(`${API_BASE}/admin/panel/guarantees${query}`, {
    headers: authHeaders()
  });

export const createGuarantee = (payload) =>
  fetchJson(`${API_BASE}/admin/panel/guarantees`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(payload)
  });

export const updateGuarantee = (id, payload) =>
  fetchJson(`${API_BASE}/admin/panel/guarantees/${id}`, {
    method: 'PUT',
    headers: authHeaders(),
    body: JSON.stringify(payload)
  });

export const deleteGuarantee = (id) =>
  fetchJson(`${API_BASE}/admin/panel/guarantees/${id}`, {
    method: 'DELETE',
    headers: authHeaders()
  });

export const getDocuments = (query = '') =>
  fetchJson(`${API_BASE}/admin/panel/documents${query}`, {
    headers: authHeaders()
  });

export const getDocumentOptions = (query = '') =>
  fetchJson(`${API_BASE}/admin/panel/documents/options${query}`, {
    headers: authHeaders()
  });

export const createDocument = (payload) =>
  fetchJson(`${API_BASE}/admin/panel/documents`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(payload)
  });

export const updateDocument = (id, payload) =>
  fetchJson(`${API_BASE}/admin/panel/documents/${id}`, {
    method: 'PUT',
    headers: authHeaders(),
    body: JSON.stringify(payload)
  });

export const deleteDocument = (id) =>
  fetchJson(`${API_BASE}/admin/panel/documents/${id}`, {
    method: 'DELETE',
    headers: authHeaders()
  });

export const getFacilityOptions = () =>
  fetchJson(`${API_BASE}/admin/panel/facilities/options`, {
    headers: authHeaders()
  });

export const getFacilities = (query = '') =>
  fetchJson(`${API_BASE}/admin/panel/facilities${query}`, {
    headers: authHeaders()
  });

export const createFacility = (payload) =>
  fetchJson(`${API_BASE}/admin/panel/facilities`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(payload)
  });

export const updateFacility = (id, payload) =>
  fetchJson(`${API_BASE}/admin/panel/facilities/${id}`, {
    method: 'PUT',
    headers: authHeaders(),
    body: JSON.stringify(payload)
  });

export const reviewFacility = (id, payload) =>
  fetchJson(`${API_BASE}/admin/panel/facilities/${id}/review`, {
    method: 'PATCH',
    headers: authHeaders(),
    body: JSON.stringify(payload)
  });

export const deleteFacility = (id) =>
  fetchJson(`${API_BASE}/admin/panel/facilities/${id}`, {
    method: 'DELETE',
    headers: authHeaders()
  });

export const getValidations = (query = '') =>
  fetchJson(`${API_BASE}/admin/panel/validations${query}`, {
    headers: authHeaders()
  });

export const createValidation = (payload) =>
  fetchJson(`${API_BASE}/admin/panel/validations`, {
    method: 'POST',
    headers: tokenHeaders(),
    body: payload
  });

export const updateValidation = (id, payload) =>
  fetchJson(`${API_BASE}/admin/panel/validations/${id}`, {
    method: 'PUT',
    headers: tokenHeaders(),
    body: payload
  });

export const deleteValidation = (id) =>
  fetchJson(`${API_BASE}/admin/panel/validations/${id}`, {
    method: 'DELETE',
    headers: authHeaders()
  });

export const getLoanTypes = (query = '') =>
  fetchJson(`${API_BASE}/admin/panel/loan-types${query}`, {
    headers: authHeaders()
  });

export const createLoanType = (formData) =>
  fetchJson(`${API_BASE}/admin/panel/loan-types`, {
    method: 'POST',
    headers: tokenHeaders(),
    body: formData
  });

export const updateLoanType = (id, formData) =>
  fetchJson(`${API_BASE}/admin/panel/loan-types/${id}`, {
    method: 'PUT',
    headers: tokenHeaders(),
    body: formData
  });

export const deleteLoanType = (id) =>
  fetchJson(`${API_BASE}/admin/panel/loan-types/${id}`, {
    method: 'DELETE',
    headers: authHeaders()
  });

export const getTickets = (query = '') =>
  fetchJson(`${API_BASE}/admin/panel/tickets${query}`, {
    headers: authHeaders()
  });

export const getInvoiceTransactions = (query = '') =>
  fetchJson(`${API_BASE}/admin/panel/transactions/invoices${query}`, {
    headers: authHeaders()
  });

export const getWalletTransactions = (query = '') =>
  fetchJson(`${API_BASE}/admin/panel/transactions/wallets${query}`, {
    headers: authHeaders()
  });

export const getTicketThread = (id) =>
  fetchJson(`${API_BASE}/admin/panel/tickets/${id}`, {
    headers: authHeaders()
  });

export const replyTicket = (id, payload) =>
  fetchJson(`${API_BASE}/admin/panel/tickets/${id}/replies`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(payload)
  });

export const getCustomerValidationSummary = () =>
  fetchJson(`${API_BASE}/admin/panel/customer-validations/summary`, {
    headers: authHeaders()
  });

export const getCustomerValidations = (query = '') =>
  fetchJson(`${API_BASE}/admin/panel/customer-validations${query}`, {
    headers: authHeaders()
  });

export const getCustomerValidation = (id) =>
  fetchJson(`${API_BASE}/admin/panel/customer-validations/${id}`, {
    headers: authHeaders()
  });

export const updateCustomerValidation = (id, payload) =>
  fetchJson(`${API_BASE}/admin/panel/customer-validations/${id}`, {
    method: 'PUT',
    headers: payload instanceof FormData ? tokenHeaders() : authHeaders(),
    body: payload instanceof FormData ? payload : JSON.stringify(payload)
  });

export const deleteCustomerValidation = (id) =>
  fetchJson(`${API_BASE}/admin/panel/customer-validations/${id}`, {
    method: 'DELETE',
    headers: authHeaders()
  });
