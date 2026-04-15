<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import { API_BASE } from './services/customer-auth.api.js';

const route = useRoute();
const initialized = ref(false);
const siteLogoUrl = ref('');
const serviceState = ref({
  active: false,
  mode: 'maintenance',
  panel: null,
  message: 'در حال بروزرسانی هستیم، بعدا مراجعه کنید'
});

const currentPanel = computed(() => (route.path.startsWith('/customer') ? 'customer' : 'web'));

const applyState = (mode, payload = {}) => {
  serviceState.value = {
    active: true,
    mode,
    panel: payload.panel || currentPanel.value,
    message: payload.message || (mode === 'maintenance' ? 'در حال بروزرسانی هستیم، بعدا مراجعه کنید' : 'امکان بارگذاری اطلاعات وجود ندارد. لطفا دوباره تلاش کنید.')
  };
};

const applyMaintenance = (payload = {}) => {
  applyState('maintenance', payload);
};

const applyUnavailable = (payload = {}) => {
  applyState('unavailable', payload);
};

const clearServiceState = () => {
  serviceState.value = {
    active: false,
    mode: 'maintenance',
    panel: null,
    message: 'در حال بروزرسانی هستیم، بعدا مراجعه کنید'
  };
};

const checkServiceState = async (panel) => {
  try {
    const response = await fetch(`${API_BASE}/status?panel=${panel}`);
    const data = await response.json().catch(() => ({}));

    if (response.status === 503) {
      applyMaintenance({ panel: data.panel || panel, message: data.message });
      fetchSiteLogo();
    } else if (!response.ok) {
      applyUnavailable({ panel: data.panel || panel, message: data.message || 'امکان بارگذاری اطلاعات وجود ندارد. لطفا دوباره تلاش کنید.' });
      fetchSiteLogo();
    } else if (currentPanel.value === panel) {
      clearServiceState();
    }
  } catch {
    if (currentPanel.value === panel) {
      applyUnavailable({ panel, message: 'امکان بارگذاری اطلاعات وجود ندارد. لطفا دوباره تلاش کنید.' });
      fetchSiteLogo();
    }
  } finally {
    initialized.value = true;
  }
};

const fetchSiteLogo = async () => {
  try {
    const res = await fetch(`${API_BASE}/web/site-config`);
    if (res.ok) {
      const data = await res.json();
      siteLogoUrl.value = data.siteLogoUrl || '';
    }
  } catch { /* ignore */ }
};

const handleMaintenanceEvent = (event) => {
  const panel = String(event.detail?.panel || '').trim().toLowerCase();
  if (panel && panel !== currentPanel.value) {
    return;
  }

  applyMaintenance({ panel: panel || currentPanel.value, message: event.detail?.message });
};

const handleUnavailableEvent = (event) => {
  const panel = String(event.detail?.panel || '').trim().toLowerCase();
  if (panel && panel !== currentPanel.value) {
    return;
  }

  applyUnavailable({ panel: panel || currentPanel.value, message: event.detail?.message });
};

const retryLoading = () => {
  window.location.reload();
};

watch(currentPanel, (panel) => {
  void checkServiceState(panel);
}, { immediate: true });

onMounted(() => {
  window.addEventListener('app-maintenance', handleMaintenanceEvent);
  window.addEventListener('app-service-unavailable', handleUnavailableEvent);
});

onBeforeUnmount(() => {
  window.removeEventListener('app-maintenance', handleMaintenanceEvent);
  window.removeEventListener('app-service-unavailable', handleUnavailableEvent);
});
</script>

<template>
  <div v-if="!initialized" class="maintenance-loader">
    <span class="maintenance-loader__dot"></span>
    <span>در حال بررسی دسترسی سرویس...</span>
  </div>
  <section v-else-if="serviceState.active" class="maintenance-shell">
    <div class="maintenance-card">
      <img v-if="siteLogoUrl" :src="siteLogoUrl" alt="لوگو" class="maintenance-logo" />
      <div class="maintenance-illustration" aria-hidden="true">
        <svg viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="100" cy="100" r="90" fill="url(#webGrad)" opacity="0.08" />
          <circle cx="100" cy="100" r="60" stroke="url(#webGrad)" stroke-width="3" stroke-dasharray="8 6" opacity="0.25" />
          <rect x="72" y="62" width="56" height="68" rx="8" fill="#fff" stroke="url(#webGrad)" stroke-width="4" />
          <path d="M100 48v14" stroke="url(#webGrad)" stroke-width="4" stroke-linecap="round" />
          <circle cx="100" cy="44" r="6" fill="url(#webGrad)" opacity="0.5" />
          <path d="M86 90h28" stroke="url(#webGrad)" stroke-width="3.5" stroke-linecap="round" />
          <path d="M86 100h20" stroke="url(#webGrad)" stroke-width="3.5" stroke-linecap="round" opacity="0.5" />
          <path d="M86 110h24" stroke="url(#webGrad)" stroke-width="3.5" stroke-linecap="round" opacity="0.3" />
          <circle cx="100" cy="150" r="10" fill="url(#webGrad)" opacity="0.18" />
          <path d="M96 148l3 3 5-6" stroke="url(#webGrad)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" opacity="0.6" />
          <defs>
            <linearGradient id="webGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stop-color="#0f766e" />
              <stop offset="100%" stop-color="#0f172a" />
            </linearGradient>
          </defs>
        </svg>
      </div>
      <span class="maintenance-kicker">
        <i class="maintenance-kicker-icon">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
        </i>
        {{ serviceState.mode === 'maintenance' ? 'در حال بروزرسانی' : 'عدم دسترسی' }}
      </span>
      <h1>سرویس هم اکنون در دسترس نیست</h1>
      <p>{{ serviceState.message }}</p>
      <button type="button" class="maintenance-retry" @click="retryLoading">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>
        تلاش مجدد
      </button>
    </div>
  </section>
  <router-view v-else />
</template>

<style scoped src="./styles/App.css"></style>
