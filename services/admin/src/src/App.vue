<script setup>
import { onBeforeUnmount, onMounted, ref } from 'vue';

const BACKEND_BASE = import.meta.env.VITE_BACKEND_BASE_URL || 'http://localhost:3000';
const API_BASE = import.meta.env.VITE_API_BASE_URL || `${BACKEND_BASE}/api`;

const initialized = ref(false);
const siteLogoUrl = ref('');
const serviceState = ref({
  active: false,
  mode: 'maintenance',
  message: 'در حال بروزرسانی هستیم، بعدا مراجعه کنید'
});

const applyUnavailable = (payload = {}) => {
  serviceState.value = {
    active: true,
    mode: payload.mode || 'unavailable',
    message: payload.message || 'امکان بارگذاری اطلاعات وجود ندارد. لطفا دوباره تلاش کنید.'
  };
};

const checkServiceState = async () => {
  try {
    const [response, configRes] = await Promise.all([
      fetch(`${API_BASE}/status?panel=admin`),
      !siteLogoUrl.value ? fetch(`${API_BASE}/web/site-config`).catch(() => null) : Promise.resolve(null)
    ]);

    if (configRes?.ok) {
      const configData = await configRes.json().catch(() => ({}));
      if (configData.siteLogoUrl) siteLogoUrl.value = configData.siteLogoUrl;
    }

    if (!response.ok) {
      applyUnavailable();
    } else {
      serviceState.value = { active: false, mode: 'maintenance', message: '' };
    }
  } catch {
    applyUnavailable();
  } finally {
    initialized.value = true;
  }
};

const retryLoading = () => {
  window.location.reload();
};

const handleUnavailableEvent = () => {
  applyUnavailable();
};

onMounted(() => {
  window.addEventListener('app-service-unavailable', handleUnavailableEvent);
  void checkServiceState();
});

onBeforeUnmount(() => {
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
          <circle cx="100" cy="100" r="90" fill="url(#adminGrad)" opacity="0.08" />
          <circle cx="100" cy="100" r="60" stroke="url(#adminGrad)" stroke-width="3" stroke-dasharray="8 6" opacity="0.25" />
          <rect x="72" y="62" width="56" height="68" rx="8" fill="#fff" stroke="url(#adminGrad)" stroke-width="4" />
          <path d="M100 48v14" stroke="url(#adminGrad)" stroke-width="4" stroke-linecap="round" />
          <circle cx="100" cy="44" r="6" fill="url(#adminGrad)" opacity="0.5" />
          <path d="M86 90h28" stroke="url(#adminGrad)" stroke-width="3.5" stroke-linecap="round" />
          <path d="M86 100h20" stroke="url(#adminGrad)" stroke-width="3.5" stroke-linecap="round" opacity="0.5" />
          <path d="M86 110h24" stroke="url(#adminGrad)" stroke-width="3.5" stroke-linecap="round" opacity="0.3" />
          <circle cx="100" cy="150" r="10" fill="url(#adminGrad)" opacity="0.18" />
          <path d="M96 148l3 3 5-6" stroke="url(#adminGrad)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" opacity="0.6" />
          <defs>
            <linearGradient id="adminGrad" x1="0%" y1="0%" x2="100%" y2="100%">
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
        عدم دسترسی
      </span>
      <h1>سرویس هم اکنون در دسترس نیست</h1>
      <p>{{ serviceState.message }}</p>
      <button type="button" class="maintenance-retry" @click="retryLoading">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>
        تلاش مجدد
      </button>
    </div>
  </section>
  <router-view v-else v-slot="{ Component }">
    <transition name="fade-slide" mode="out-in">
      <component :is="Component" />
    </transition>
  </router-view>
</template>

<style src="./styles/App.css"></style>
