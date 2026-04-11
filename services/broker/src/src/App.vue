<script setup>
import { onBeforeUnmount, onMounted, ref } from 'vue';
import { API_BASE } from './services/broker-auth.api.js';

const initialized = ref(false);
const serviceState = ref({
  active: false,
  mode: 'maintenance',
  message: 'در حال بروزرسانی هستیم، بعدا مراجعه کنید'
});

const applyState = (mode, payload = {}) => {
  serviceState.value = {
    active: true,
    mode,
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
    message: 'در حال بروزرسانی هستیم، بعدا مراجعه کنید'
  };
};

const checkServiceState = async () => {
  try {
    const response = await fetch(`${API_BASE}/status?panel=broker`);
    const data = await response.json().catch(() => ({}));

    if (response.status === 503) {
      applyMaintenance({ message: data.message });
    } else if (!response.ok) {
      applyUnavailable({ message: data.message || 'امکان بارگذاری اطلاعات وجود ندارد. لطفا دوباره تلاش کنید.' });
    } else {
      clearServiceState();
    }
  } catch {
    applyUnavailable({ message: 'امکان بارگذاری اطلاعات وجود ندارد. لطفا دوباره تلاش کنید.' });
  } finally {
    initialized.value = true;
  }
};

const handleMaintenanceEvent = (event) => {
  const panel = String(event.detail?.panel || '').trim().toLowerCase();
  if (panel && panel !== 'broker') {
    return;
  }

  applyMaintenance({ message: event.detail?.message });
};

const handleUnavailableEvent = (event) => {
  const panel = String(event.detail?.panel || '').trim().toLowerCase();
  if (panel && panel !== 'broker') {
    return;
  }

  applyUnavailable({ message: event.detail?.message });
};

const retryLoading = () => {
  window.location.reload();
};

onMounted(() => {
  window.addEventListener('app-maintenance', handleMaintenanceEvent);
  window.addEventListener('app-service-unavailable', handleUnavailableEvent);
  void checkServiceState();
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
            <linearGradient id="brokerServiceGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stop-color="#b91c1c" />
              <stop offset="100%" stop-color="#7f1d1d" />
            </linearGradient>
          </defs>
          <circle cx="120" cy="120" r="96" fill="url(#brokerServiceGrad)" opacity="0.12" />
          <path d="M70 142h100" stroke="url(#brokerServiceGrad)" stroke-width="14" stroke-linecap="round" />
          <path d="M92 84h56l24 24v42a18 18 0 0 1-18 18H86a18 18 0 0 1-18-18v-48a18 18 0 0 1 18-18Z" fill="#ffffff" stroke="url(#brokerServiceGrad)" stroke-width="10" />
          <path d="M148 84v28h28" fill="none" stroke="url(#brokerServiceGrad)" stroke-width="10" stroke-linejoin="round" />
          <circle cx="120" cy="186" r="10" fill="#b91c1c" />
        </svg>
      </div>
      <span class="maintenance-kicker">{{ serviceState.mode === 'maintenance' ? '503 Service Unavailable' : 'Service Unavailable' }}</span>
      <h1>سرویس هم اکنون در دسترس نیست</h1>
      <p>{{ serviceState.message }}</p>
      <button type="button" class="maintenance-retry" @click="retryLoading">تلاش مجدد</button>
    </div>
  </section>
  <router-view v-else v-slot="{ Component }">
    <transition name="fade-slide" mode="out-in">
      <component :is="Component" />
    </transition>
  </router-view>
</template>

<style>
.maintenance-shell,
.maintenance-loader {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  background:
    radial-gradient(circle at top, rgba(185, 28, 28, 0.12), transparent 32%),
    linear-gradient(180deg, #fff7f7, #fff1f2);
}

.maintenance-card {
  width: min(100%, 560px);
  padding: 34px 28px;
  border-radius: 28px;
  background: rgba(255, 255, 255, 0.92);
  border: 1px solid rgba(185, 28, 28, 0.12);
  box-shadow: 0 24px 60px rgba(127, 29, 29, 0.12);
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
  background: rgba(185, 28, 28, 0.08);
  color: #b91c1c;
  font-size: 11px;
  font-weight: 900;
}

.maintenance-card h1 {
  margin: 18px 0 10px;
  font-size: 28px;
  font-weight: 900;
  color: #111827;
}

.maintenance-card p,
.maintenance-loader span:last-child {
  margin: 0;
  font-size: 15px;
  line-height: 2;
  color: #4b5563;
}

.maintenance-retry {
  margin-top: 18px;
  min-height: 46px;
  padding: 0 18px;
  border-radius: 16px;
  border: 1px solid #b91c1c;
  background: linear-gradient(135deg, #b91c1c, #7f1d1d);
  color: #fff;
  font-size: 13px;
  font-weight: 900;
}

.maintenance-loader {
  gap: 10px;
  color: #b91c1c;
  font-weight: 800;
}

.maintenance-loader__dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: currentColor;
  animation: maintenance-pulse 0.8s ease-in-out infinite alternate;
}

.fade-slide-enter-active,
.fade-slide-leave-active {
  transition: opacity 0.25s ease, transform 0.25s ease;
}
.fade-slide-enter-from {
  opacity: 0;
  transform: translateY(12px);
}
.fade-slide-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}

.swal-rtl {
  direction: rtl;
  font-family: 'Vazirmatn', Tahoma, sans-serif;
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
