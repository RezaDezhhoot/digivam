import { computed, ref } from 'vue';
import {
  clearCustomerSessionStorage,
  CUSTOMER_TOKEN_KEY,
  persistCustomerSession,
  readStoredCustomerProfile
} from '../services/customer-auth.api.js';

const createSummary = () => ({ total: 0, unread: 0, read: 0, info: 0, attention: 0, warning: 0 });

const token = ref('');
const profile = ref(null);
const notificationSummary = ref(createSummary());

const hydrateSession = () => {
  if (typeof window === 'undefined') {
    return;
  }

  token.value = localStorage.getItem(CUSTOMER_TOKEN_KEY) || '';
  profile.value = readStoredCustomerProfile();
};

hydrateSession();

if (typeof window !== 'undefined' && !window.__dgvamCustomerStorageBound) {
  window.addEventListener('storage', hydrateSession);
  window.__dgvamCustomerStorageBound = true;
}

export const openCustomerAuthModal = (detail = {}) => {
  if (typeof window === 'undefined') {
    return;
  }

  window.dispatchEvent(new CustomEvent('open-customer-auth', { detail }));
};

export const useCustomerSession = () => {
  const isAuthenticated = computed(() => Boolean(token.value));
  const hasCompletedProfile = computed(() => Boolean(profile.value?.profile));
  const isSuspended = computed(() => Boolean(profile.value?.isSuspended));
  const unreadNotifications = computed(() => Number(notificationSummary.value.unread || 0));

  const applySession = (payload) => {
    persistCustomerSession(payload);
    token.value = payload.token || token.value;
    profile.value = payload.customer || null;
  };

  const updateProfile = (nextProfile) => {
    if (!nextProfile) {
      return;
    }

    persistCustomerSession({ token: token.value, customer: nextProfile });
    profile.value = nextProfile;
  };

  const clearSession = () => {
    clearCustomerSessionStorage();
    token.value = '';
    profile.value = null;
    notificationSummary.value = createSummary();
  };

  const syncNotificationSummary = (summary = {}) => {
    notificationSummary.value = {
      ...createSummary(),
      ...summary
    };
  };

  return {
    token,
    profile,
    isAuthenticated,
    hasCompletedProfile,
    isSuspended,
    unreadNotifications,
    notificationSummary,
    hydrateSession,
    applySession,
    updateProfile,
    clearSession,
    syncNotificationSummary
  };
};