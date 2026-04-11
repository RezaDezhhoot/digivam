<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { useRoute } from 'vue-router';
import { useCustomerSession } from '../composables/useCustomerSession.js';
import { getCustomerDealSummary } from '../services/customer-panel.api.js';

const props = defineProps({
  kicker: {
    type: String,
    default: 'پنل مشتری'
  },
  title: {
    type: String,
    required: true
  },
  description: {
    type: String,
    default: ''
  },
  stats: {
    type: Array,
    default: () => []
  }
});

const route = useRoute();
const { profile, unreadNotifications } = useCustomerSession();
const dealSummary = ref({ waitingCustomer: 0 });
const isCompactSidebar = ref(false);
const isMobileNavOpen = ref(false);

const navItems = [
  { to: '/customer/dashboard', label: 'داشبورد', icon: 'fa-solid fa-house', name: 'customer-dashboard', activeNames: ['customer-dashboard'], mobileHidden: true },
  { to: '/customer/deals', label: 'معامله‌ها', icon: 'fa-solid fa-handshake', name: 'customer-deals', activeNames: ['customer-deals', 'customer-deal-start', 'customer-deal-detail'], badge: 'deals' },
  { to: '/customer/profile', label: 'پروفایل', icon: 'fa-solid fa-id-card', name: 'customer-profile' },
  { to: '/customer/notifications', label: 'اعلان‌ها', icon: 'fa-solid fa-bell', name: 'customer-notifications', badge: 'notifications' },
  { to: '/customer/validations', label: 'اعتبارسنجی‌ها', icon: 'fa-solid fa-clipboard-check', name: 'customer-validations' },
  { to: '/customer/bookmarks', label: 'نشان‌شده‌ها', icon: 'fa-solid fa-bookmark', name: 'customer-bookmarks', mobileHidden: true },
  { to: '/customer/recently-viewed', label: 'بازدیدهای اخیر', icon: 'fa-solid fa-clock-rotate-left', name: 'customer-recently-viewed', mobileHidden: true }
];

const customerName = computed(() => profile.value?.name || 'حساب مشتری');
const customerPhone = computed(() => profile.value?.phone || '-');
const customerAvatar = computed(() => profile.value?.avatar || '');
const profileStatusText = computed(() => (profile.value?.profile ? 'پروفایل تکمیل شده' : 'تکمیل اطلاعات حساب'));
const profileStatusClass = computed(() => (profile.value?.profile ? 'done' : 'pending'));
const unreadText = computed(() => new Intl.NumberFormat('fa-IR').format(Number(unreadNotifications.value || 0)));
const dealAwaitingText = computed(() => new Intl.NumberFormat('fa-IR').format(Number(dealSummary.value.waitingCustomer || 0)));
const normalizedStats = computed(() => (Array.isArray(props.stats) ? props.stats.filter(Boolean).slice(0, 4) : []));
const isNavExpanded = computed(() => !isCompactSidebar.value || isMobileNavOpen.value);

const isActive = (item) => (Array.isArray(item.activeNames) ? item.activeNames.includes(route.name) : route.name === item.name);

const syncViewportState = () => {
  const nextCompactState = window.innerWidth <= 991;
  const didModeChange = nextCompactState !== isCompactSidebar.value;

  isCompactSidebar.value = nextCompactState;

  if (didModeChange) {
    isMobileNavOpen.value = !nextCompactState;
  }
};

const toggleMobileNav = () => {
  if (!isCompactSidebar.value) {
    return;
  }

  isMobileNavOpen.value = !isMobileNavOpen.value;
};

const loadDealSummary = async () => {
  try {
    const data = await getCustomerDealSummary();
    dealSummary.value = data.summary || dealSummary.value;
  } catch {
    dealSummary.value = { waitingCustomer: 0 };
  }
};

const handleDealUpdate = () => {
  loadDealSummary();
};

onMounted(() => {
  syncViewportState();
  loadDealSummary();
  window.addEventListener('customer-deal-updated', handleDealUpdate);
  window.addEventListener('resize', syncViewportState);
});

onBeforeUnmount(() => {
  window.removeEventListener('customer-deal-updated', handleDealUpdate);
  window.removeEventListener('resize', syncViewportState);
});

</script>

<template>
  <section class="customer-shell">
    <div class="customer-shell-bg" aria-hidden="true">
      <span class="customer-shell-orb orb-1"></span>
      <span class="customer-shell-orb orb-2"></span>
      <span class="customer-shell-grid"></span>
    </div>

    <div class="customer-shell-layout">
      <aside class="customer-shell-sidebar">
        <div class="customer-shell-profile-card">
          <div class="customer-shell-profile-top">
            <span class="customer-shell-avatar d-flex">
              <img v-if="customerAvatar" :src="customerAvatar" alt="آواتار مشتری" />
              <i v-else class="fa-solid fa-user" aria-hidden="true"></i>
            </span>
            <div>
              <strong>{{ customerName }}</strong>
              <span>{{ customerPhone }}</span>
            </div>
          </div>

          <div class="customer-shell-status" :class="profileStatusClass">
            <i :class="profileStatusClass === 'done' ? 'fa-solid fa-circle-check' : 'fa-solid fa-user-pen'"></i>
            <span>{{ profileStatusText }}</span>
          </div>
        </div>

        <button type="button" class="customer-shell-mobile-toggle" :class="{ open: isNavExpanded }" @click="toggleMobileNav">
          <span>بخش‌های پنل مشتری</span>
          <i :class="isNavExpanded ? 'fa-solid fa-chevron-up' : 'fa-solid fa-chevron-down'"></i>
        </button>

        <nav class="customer-shell-nav" :class="{ collapsed: !isNavExpanded }">
          <RouterLink
            v-for="item in navItems"
            :key="item.to"
            :to="item.to"
            class="customer-shell-nav-item"
            :class="{ active: isActive(item), 'mobile-hidden': item.mobileHidden }"
          >
            <span class="customer-shell-nav-icon"><i :class="item.icon"></i></span>
            <span>{{ item.label }}</span>
            <span v-if="item.badge === 'notifications' && unreadNotifications" class="customer-shell-nav-badge">{{ unreadText }}</span>
            <span v-if="item.badge === 'deals' && dealSummary.waitingCustomer" class="customer-shell-nav-badge">{{ dealAwaitingText }}</span>
          </RouterLink>
        </nav>

        <div v-show="isNavExpanded" class="customer-shell-shortcuts">
          <RouterLink to="/requests" class="customer-shell-shortcut muted">
            <i class="fa-solid fa-headset"></i>
            <span>پشتیبانی</span>
          </RouterLink>
        </div>
      </aside>

      <div class="customer-shell-main">
        <header class="customer-shell-hero">
          <div class="customer-shell-hero-copy">
            <span class="customer-shell-kicker">{{ kicker }}</span>
            <h1>{{ title }}</h1>
            <p>{{ description }}</p>

            <div v-if="normalizedStats.length" class="customer-shell-stats">
              <article v-for="(stat, index) in normalizedStats" :key="`${stat.label}-${index}`" class="customer-shell-stat">
                <span>{{ stat.label }}</span>
                <strong>{{ stat.value }}</strong>
              </article>
            </div>
          </div>

          <div v-if="$slots.actions" class="customer-shell-actions">
            <slot name="actions"></slot>
          </div>
        </header>

        <div class="customer-shell-content">
          <slot></slot>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.customer-shell {
  position: relative;
  min-height: calc(100vh - 140px);
  padding: 10px 0 42px;
}

.customer-shell-bg {
  position: absolute;
  inset: 0;
  overflow: hidden;
  pointer-events: none;
}

.customer-shell-orb {
  position: absolute;
  border-radius: 999px;
  filter: blur(10px);
  opacity: 0.35;
}

.customer-shell-orb.orb-1 {
  width: 320px;
  height: 320px;
  top: -90px;
  right: -80px;
  background: radial-gradient(circle, rgba(211, 90, 90, 0.18) 0%, transparent 72%);
}

.customer-shell-orb.orb-2 {
  width: 260px;
  height: 260px;
  bottom: -80px;
  left: -60px;
  background: radial-gradient(circle, rgba(14, 165, 233, 0.12) 0%, transparent 72%);
}

.customer-shell-grid {
  position: absolute;
  inset: 0;
  background-image:
    linear-gradient(rgba(148, 163, 184, 0.08) 1px, transparent 1px),
    linear-gradient(90deg, rgba(148, 163, 184, 0.08) 1px, transparent 1px);
  background-size: 38px 38px;
  mask-image: radial-gradient(circle at center, rgba(0, 0, 0, 0.8), transparent 80%);
}

.customer-shell-layout {
  position: relative;
  z-index: 1;
  display: grid;
  grid-template-columns: 268px minmax(0, 1fr);
  gap: 18px;
  align-items: start;
}

.customer-shell-sidebar {
  position: sticky;
  top: 96px;
  display: grid;
  gap: 12px;
}

.customer-shell-profile-card,
.customer-shell-shortcuts,
.customer-shell-nav,
.customer-shell-hero {
  border: 1px solid var(--web-border);
  box-shadow: var(--web-shadow);
}

.customer-shell-profile-card,
.customer-shell-nav,
.customer-shell-shortcuts {
  padding: 14px;
  border-radius: 24px;
  background: linear-gradient(180deg, var(--web-surface) 0%, var(--web-surface-soft) 100%);
}

.customer-shell-profile-top {
  display: flex;
  align-items: center;
  gap: 12px;
}

.customer-shell-profile-top strong,
.customer-shell-profile-top span {
  display: block;
}

.customer-shell-profile-top strong {
  font-size: 15px;
  font-weight: 900;
}

.customer-shell-profile-top span {
  margin-top: 3px;
  color: var(--web-muted);
  font-size: 11px;
}

.customer-shell-avatar {
  width: 46px;
  height: 46px;
  border-radius: 16px;
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, var(--web-primary) 0%, #d35a5a 100%);
  color: #fff;
  font-size: 19px;
  font-weight: 900;
  overflow: hidden;
}

.customer-shell-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.customer-shell-avatar i {
  font-size: 18px;
}

.customer-shell-status {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  margin-top: 12px;
  min-height: 36px;
  padding: 0 12px;
  border-radius: 14px;
  font-size: 11px;
  font-weight: 800;
}

.customer-shell-status.done {
  background: rgba(34, 160, 107, 0.12);
  color: #15803d;
}

.customer-shell-status.pending {
  background: rgba(217, 119, 6, 0.14);
  color: #b45309;
}

.customer-shell-nav {
  display: grid;
  gap: 6px;
}

.customer-shell-mobile-toggle {
  display: none;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  min-height: 46px;
  padding: 0 14px;
  border: 1px solid var(--web-border);
  border-radius: 18px;
  background: linear-gradient(180deg, var(--web-surface) 0%, var(--web-surface-soft) 100%);
  color: var(--web-text);
  font-size: 12px;
  font-weight: 900;
  box-shadow: var(--web-shadow);
}

.customer-shell-mobile-toggle i {
  color: var(--web-primary);
  transition: transform 0.18s ease;
}

.customer-shell-mobile-toggle.open i {
  transform: rotate(180deg);
}

.customer-shell-nav-item,
.customer-shell-shortcut {
  display: flex;
  align-items: center;
  gap: 10px;
  min-height: 42px;
  padding: 0 12px;
  border-radius: 15px;
  color: var(--web-text);
  font-size: 12px;
  font-weight: 800;
  transition: transform 0.18s ease, background 0.18s ease, border-color 0.18s ease;
}

.customer-shell-nav-item:hover,
.customer-shell-shortcut:hover {
  transform: translateX(-2px);
  background: rgba(211, 90, 90, 0.08);
}

.customer-shell-nav-item.active {
  background: linear-gradient(135deg, rgba(211, 90, 90, 0.14) 0%, rgba(193, 18, 18, 0.06) 100%);
  color: var(--web-primary);
}

.customer-shell-nav-icon {
  width: 30px;
  height: 30px;
  border-radius: 10px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: var(--web-surface-soft);
  flex-shrink: 0;
}

.customer-shell-nav-badge {
  margin-right: auto;
  min-width: 20px;
  height: 20px;
  padding: 0 6px;
  border-radius: 999px;
  background: #ef4444;
  color: #fff;
  font-size: 10px;
  font-weight: 900;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.customer-shell-shortcuts {
  display: grid;
  gap: 8px;
}

.customer-shell-shortcut {
  justify-content: center;
  background: linear-gradient(135deg, var(--web-primary) 0%, #c11212 100%);
  color: #fff;
}

.customer-shell-shortcut.muted {
  background: var(--web-surface-soft);
  color: var(--web-text);
}

.customer-shell-main {
  display: grid;
  gap: 16px;
}

.customer-shell-hero {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  padding: 22px;
  border-radius: 28px;
  background:
    radial-gradient(circle at top left, rgba(255, 255, 255, 0.18), transparent 24%),
    linear-gradient(135deg, #8d0000 0%, #c11212 100%);
  color: #fff;
  box-shadow: 0 28px 70px rgba(155, 0, 0, 0.2);
}

.customer-shell-hero-copy {
  max-width: 760px;
}

.customer-shell-kicker {
  display: inline-flex;
  align-items: center;
  min-height: 30px;
  padding: 0 12px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.14);
  font-size: 11px;
  font-weight: 800;
}

.customer-shell-hero h1 {
  margin: 12px 0 8px;
  font-size: 31px;
  font-weight: 900;
}

.customer-shell-hero p {
  margin: 0;
  line-height: 1.8;
  color: rgba(255, 255, 255, 0.86);
  font-size: 13px;
}

.customer-shell-stats {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 8px;
  margin-top: 14px;
}

.customer-shell-stat {
  min-height: 72px;
  padding: 12px;
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.12);
  border: 1px solid rgba(255, 255, 255, 0.12);
}

.customer-shell-stat span {
  display: block;
  font-size: 11px;
  color: rgba(255, 255, 255, 0.76);
}

.customer-shell-stat strong {
  display: block;
  margin-top: 6px;
  font-size: 14px;
  font-weight: 900;
}

.customer-shell-actions {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.customer-shell-actions:deep(a),
.customer-shell-actions:deep(button) {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 42px;
  padding: 0 15px;
  border-radius: 14px;
  font-size: 12px;
  font-weight: 800;
}

.customer-shell-content {
  display: grid;
  gap: 14px;
}

@media (max-width: 1199px) {
  .customer-shell-layout {
    grid-template-columns: 1fr;
  }

  .customer-shell-sidebar {
    position: static;
  }
}

@media (max-width: 991px) {
  .customer-shell-sidebar {
    gap: 10px;
  }

  .customer-shell-mobile-toggle {
    display: inline-flex;
  }

  .customer-shell-nav.collapsed {
    display: none;
  }

  .customer-shell-nav-item.mobile-hidden,
  .mobile-hidden-shortcut {
    display: none;
  }

  .customer-shell-hero {
    padding: 18px;
    border-radius: 24px;
  }

  .customer-shell-hero h1 {
    font-size: 27px;
  }

  .customer-shell-kicker {
    min-height: 28px;
    padding: 0 10px;
  }
}

@media (max-width: 767px) {
  .customer-shell {
    padding-bottom: 14px;
  }

  .customer-shell-profile-card,
  .customer-shell-nav,
  .customer-shell-shortcuts {
    border-radius: 20px;
  }

  .customer-shell-shortcuts {
    display: block;
  }

  .customer-shell-hero {
    padding: 16px 14px;
    border-radius: 20px;
    flex-direction: column;
  }

  .customer-shell-hero h1 {
    margin-top: 10px;
    font-size: 22px;
    line-height: 1.35;
  }

  .customer-shell-hero p {
    font-size: 12px;
    line-height: 1.75;
  }

  .customer-shell-kicker {
    min-height: 26px;
    font-size: 10px;
  }

  .customer-shell-stats {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .customer-shell-stat {
    min-height: 62px;
    padding: 10px;
  }

  .customer-shell-actions {
    width: 100%;
    justify-content: stretch;
  }

  .customer-shell-actions:deep(a),
  .customer-shell-actions:deep(button) {
    flex: 1 1 100%;
  }
}

:global([data-theme='dark']) .customer-shell-profile-card,
:global([data-theme='dark']) .customer-shell-nav,
:global([data-theme='dark']) .customer-shell-shortcuts {
  border-color: rgba(151, 176, 214, 0.14);
  box-shadow: 0 22px 52px rgba(0, 0, 0, 0.28);
}

:global([data-theme='dark']) .customer-shell-nav-item:hover,
:global([data-theme='dark']) .customer-shell-shortcut.muted:hover {
  background: rgba(255, 255, 255, 0.05);
}

:global([data-theme='dark']) .customer-shell-nav-item.active {
  background: linear-gradient(135deg, rgba(255, 106, 99, 0.18) 0%, rgba(255, 255, 255, 0.04) 100%);
}

:global([data-theme='dark']) .customer-shell-nav-icon,
:global([data-theme='dark']) .customer-shell-shortcut.muted {
  background: rgba(255, 255, 255, 0.05);
}

:global([data-theme='dark']) .customer-shell-mobile-toggle {
  border-color: rgba(151, 176, 214, 0.14);
  box-shadow: 0 22px 52px rgba(0, 0, 0, 0.28);
}

:global([data-theme='dark']) .customer-shell-hero {
  box-shadow: 0 30px 70px rgba(0, 0, 0, 0.42);
}

:global([data-theme='dark']) .customer-shell-stat {
  background: rgba(255, 255, 255, 0.08);
  border-color: rgba(255, 255, 255, 0.1);
}
</style>