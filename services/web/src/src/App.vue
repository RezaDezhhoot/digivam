<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import { API_BASE } from './services/customer-auth.api.js';

const route = useRoute();
const initialized = ref(false);
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
    } else if (!response.ok) {
      applyUnavailable({ panel: data.panel || panel, message: data.message || 'امکان بارگذاری اطلاعات وجود ندارد. لطفا دوباره تلاش کنید.' });
    } else if (currentPanel.value === panel) {
      clearServiceState();
    }
  } catch {
    if (currentPanel.value === panel) {
      applyUnavailable({ panel, message: 'امکان بارگذاری اطلاعات وجود ندارد. لطفا دوباره تلاش کنید.' });
    }
  } finally {
    initialized.value = true;
  }
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
      <div class="maintenance-illustration" aria-hidden="true">
        <svg viewBox="0 0 240 240" role="presentation">
          <defs>
            <linearGradient id="webServiceGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stop-color="#0f766e" />
              <stop offset="100%" stop-color="#0f172a" />
            </linearGradient>
          </defs>
          <circle cx="120" cy="120" r="96" fill="url(#webServiceGrad)" opacity="0.12" />
          <path d="M68 132h104" stroke="url(#webServiceGrad)" stroke-width="14" stroke-linecap="round" />
          <path d="M86 96h68a18 18 0 0 1 18 18v36a18 18 0 0 1-18 18H86a18 18 0 0 1-18-18v-36a18 18 0 0 1 18-18Z" fill="#ffffff" stroke="url(#webServiceGrad)" stroke-width="10" />
          <path d="M120 56v22" stroke="url(#webServiceGrad)" stroke-width="12" stroke-linecap="round" />
          <circle cx="120" cy="188" r="10" fill="#0f766e" />
        </svg>
      </div>
      <span class="maintenance-kicker">{{ serviceState.mode === 'maintenance' ? '503 Service Unavailable' : 'Service Unavailable' }}</span>
      <h1>سرویس هم اکنون در دسترس نیست</h1>
      <p>{{ serviceState.message }}</p>
      <button type="button" class="maintenance-retry" @click="retryLoading">تلاش مجدد</button>
    </div>
  </section>
  <router-view v-else />
</template>

<style scoped>
.maintenance-shell,
.maintenance-loader {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  background:
    radial-gradient(circle at top, rgba(15, 118, 110, 0.12), transparent 34%),
    linear-gradient(180deg, #f8fafc, #eef6f4);
}

.maintenance-card {
  width: min(100%, 560px);
  padding: 32px 28px;
  border-radius: 28px;
  background: rgba(255, 255, 255, 0.9);
  border: 1px solid rgba(15, 118, 110, 0.12);
  box-shadow: 0 24px 60px rgba(15, 23, 42, 0.08);
  text-align: center;
}

.maintenance-illustration {
  display: flex;
  justify-content: center;
  margin-bottom: 10px;
}

.maintenance-illustration svg {
  width: 176px;
  height: 176px;
}

.maintenance-kicker {
  display: inline-flex;
  align-items: center;
  min-height: 30px;
  padding: 0 12px;
  border-radius: 999px;
  background: rgba(15, 118, 110, 0.1);
  color: #0f766e;
  font-size: 11px;
  font-weight: 900;
}

.maintenance-card h1 {
  margin: 18px 0 10px;
  font-size: 28px;
  font-weight: 900;
  color: #0f172a;
}

.maintenance-card p,
.maintenance-loader span:last-child {
  margin: 0;
  font-size: 15px;
  line-height: 2;
  color: #475569;
}

.maintenance-retry {
  margin-top: 18px;
  min-height: 46px;
  padding: 0 18px;
  border-radius: 16px;
  border: 1px solid #0f766e;
  background: linear-gradient(135deg, #0f766e, #0f172a);
  color: #fff;
  font-size: 13px;
  font-weight: 900;
}

.maintenance-loader {
  gap: 10px;
  color: #0f766e;
  font-weight: 800;
}

.maintenance-loader__dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: currentColor;
  animation: maintenance-pulse 0.8s ease-in-out infinite alternate;
}

@keyframes maintenance-pulse {
  from {
    transform: scale(0.8);
    opacity: 0.45;
  }
  to {
    transform: scale(1.25);
    opacity: 1;
  }
}
</style>
