<script setup>
import { computed, onMounted, onUnmounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import CustomerAuthModal from '../components/CustomerAuthModal.vue';
import logoImage from '../assets/images/figma-logo.png';
import { useCustomerSession } from '../composables/useCustomerSession.js';
import { useWebTheme } from '../composables/useWebTheme.js';
import { getCustomerDealSummary } from '../services/customer-panel.api.js';
import { getCustomerNotificationSummary } from '../services/customer-notification.api.js';
import { getCustomerProfile } from '../services/customer-profile.api.js';

const route = useRoute();
const router = useRouter();
const { theme, toggleTheme } = useWebTheme();
const { profile, isAuthenticated, unreadNotifications, clearSession, syncNotificationSummary, updateProfile } = useCustomerSession();

const mobileMenuOpen = ref(false);
const profileMenuOpen = ref(false);
const authModalOpen = ref(false);
const authRedirectTo = ref('/customer/dashboard');
const showBackTop = ref(false);
const customerDealSummary = ref({ waitingCustomer: 0 });

const primaryNavItems = [
  { label: 'صفحه اصلی', to: '/', name: 'home', icon: 'fa-solid fa-house' },
  { label: 'بازار امتیاز وام', to: '/market', name: 'loan-market', icon: 'fa-solid fa-store' },
  { label: 'پشتیبانی', to: '/requests', name: 'requests', icon: 'fa-solid fa-headset' }
];

const secondaryItems = computed(() => [
  { label: 'داشبورد مشتری', to: '/customer/dashboard', requiresAuth: true, icon: 'fa-solid fa-gauge-high' },
  { label: 'پروفایل', to: '/customer/profile', requiresAuth: true, icon: 'fa-solid fa-id-card' },
  { label: 'اعلان‌ها', to: '/customer/notifications', requiresAuth: true, showBadge: true, icon: 'fa-solid fa-bell' },
  { label: 'نشان‌شده‌ها', to: '/customer/bookmarks', requiresAuth: true, icon: 'fa-solid fa-bookmark' },
  { label: 'بازدیدهای اخیر', to: '/customer/recently-viewed', requiresAuth: true, icon: 'fa-solid fa-clock-rotate-left' }
]);

const mobileMenuPrimaryItems = computed(() => primaryNavItems.filter((item) => item.to === '/requests'));
const mobileMenuSecondaryItems = computed(() => secondaryItems.value.filter((item) => ['/customer/profile', '/customer/notifications'].includes(item.to)));
const mobileQuickNavItems = computed(() => [
  { label: 'خانه', to: '/', icon: 'fa-solid fa-house' },
  { label: 'بازار', to: '/market', icon: 'fa-solid fa-store' },
  { label: 'داشبورد', to: '/customer/dashboard', icon: 'fa-solid fa-gauge-high', requiresAuth: true },
  { label: 'معاملات من', to: '/customer/deals', icon: 'fa-solid fa-handshake', requiresAuth: true, badge: 'deals' },
  { label: 'نشان‌شده', to: '/customer/bookmarks', icon: 'fa-solid fa-bookmark', requiresAuth: true }
]);

const isHome = computed(() => route.name === 'home');
const customerDisplayName = computed(() => profile.value?.name || 'حساب مشتری');
const customerPhone = computed(() => profile.value?.phone || '');
const customerInitial = computed(() => String(profile.value?.name || 'م').trim().charAt(0) || 'م');
const customerAvatar = computed(() => profile.value?.avatar || '');
const unreadText = computed(() => (unreadNotifications.value > 99 ? '99+' : new Intl.NumberFormat('fa-IR').format(unreadNotifications.value)));
const waitingDealsCount = computed(() => Number(customerDealSummary.value.waitingCustomer || 0));
const waitingDealsText = computed(() => new Intl.NumberFormat('fa-IR').format(waitingDealsCount.value));
const floatingDealsSubtitle = computed(() => (waitingDealsCount.value ? `${waitingDealsText.value} معامله نیازمند اقدام` : 'بدون اقدام معلق'));
const isCustomerPanelRoute = computed(() => route.path.startsWith('/customer/'));
const pageTransitionKey = computed(() => (isCustomerPanelRoute.value ? route.path : `${route.path}?${new URLSearchParams(route.query).toString()}`));

const syncScrollState = () => {
  showBackTop.value = window.scrollY > 280;
};

const closeMenus = () => {
  mobileMenuOpen.value = false;
  profileMenuOpen.value = false;
};

const scrollToTop = () => {
  window.scrollTo({ top: 0, behavior: 'smooth' });
};

const isMenuActive = (item) => route.path === item.to || (item.to !== '/' && route.path.startsWith(`${item.to}/`));

const openAuthModal = (redirectTo = '/customer/dashboard') => {
  authRedirectTo.value = String(redirectTo || '/customer/dashboard');
  authModalOpen.value = true;
  closeMenus();
};

const cleanAuthQuery = async () => {
  if (!route.query.auth && !route.query.redirect) {
    return;
  }

  const nextQuery = { ...route.query };
  delete nextQuery.auth;
  delete nextQuery.redirect;

  await router.replace({ path: route.path, query: nextQuery });
};

const handleAuthClose = async () => {
  authModalOpen.value = false;
  await cleanAuthQuery();
};

const navigateSecondaryItem = async (item) => {
  if (item.requiresAuth && !isAuthenticated.value) {
    openAuthModal(item.to);
    return;
  }

  closeMenus();
  await router.push(item.to);
};

const navigateQuickNavItem = async (item) => {
  if (item.requiresAuth && !isAuthenticated.value) {
    openAuthModal(item.to);
    return;
  }

  closeMenus();
  await router.push(item.to);
};

const navigateToNotifications = async () => {
  if (!isAuthenticated.value) {
    openAuthModal('/customer/notifications');
    return;
  }

  closeMenus();
  await router.push('/customer/notifications');
};

const logout = async () => {
  clearSession();
  customerDealSummary.value = { waitingCustomer: 0 };
  closeMenus();
  await router.push('/');
};

const navigateToDeals = async () => {
  if (!isAuthenticated.value) {
    openAuthModal('/customer/deals');
    return;
  }

  closeMenus();
  await router.push('/customer/deals');
};

const loadCustomerContext = async () => {
  if (!isAuthenticated.value) {
    syncNotificationSummary();
    customerDealSummary.value = { waitingCustomer: 0 };
    return;
  }

  const [profileResult, notificationsResult, dealSummaryResult] = await Promise.allSettled([
    getCustomerProfile(),
    getCustomerNotificationSummary(),
    getCustomerDealSummary()
  ]);

  if (profileResult.status === 'fulfilled') {
    updateProfile(profileResult.value.profile);
  } else if (/توکن|دسترسی|معتبر/.test(profileResult.reason?.message || '')) {
    clearSession();
    return;
  }

  if (notificationsResult.status === 'fulfilled') {
    syncNotificationSummary(notificationsResult.value.summary);
  }

  if (dealSummaryResult.status === 'fulfilled') {
    customerDealSummary.value = dealSummaryResult.value.summary || customerDealSummary.value;
  }
};

const handleOpenAuthEvent = (event) => {
  openAuthModal(event.detail?.redirectTo || route.query.redirect || '/customer/dashboard');
};

const handleCustomerDealUpdated = () => {
  if (!isAuthenticated.value) {
    customerDealSummary.value = { waitingCustomer: 0 };
    return;
  }

  getCustomerDealSummary()
    .then((data) => {
      customerDealSummary.value = data.summary || customerDealSummary.value;
    })
    .catch(() => {
      customerDealSummary.value = { waitingCustomer: 0 };
    });
};

watch(
  () => route.fullPath,
  () => {
    closeMenus();
  }
);

watch(
  () => route.query.auth,
  (value) => {
    if (value) {
      openAuthModal(route.query.redirect || '/customer/dashboard');
    }
  },
  { immediate: true }
);

watch(
  () => isAuthenticated.value,
  () => {
    loadCustomerContext();
  },
  { immediate: true }
);

onMounted(() => {
  syncScrollState();
  window.addEventListener('scroll', syncScrollState, { passive: true });
  window.addEventListener('open-customer-auth', handleOpenAuthEvent);
  window.addEventListener('customer-deal-updated', handleCustomerDealUpdated);
});

onUnmounted(() => {
  window.removeEventListener('scroll', syncScrollState);
  window.removeEventListener('open-customer-auth', handleOpenAuthEvent);
  window.removeEventListener('customer-deal-updated', handleCustomerDealUpdated);
});
</script>

<template>
  <div class="web-app-shell">
    <header class="site-header" :class="{ elevated: showBackTop }">
      <div class="page-shell site-header-inner">
        <router-link class="site-brand" to="/" aria-label="دیجی وام">
          <img :src="logoImage" alt="دیجی وام" class="site-brand-image" />
        </router-link>

        <nav class="site-nav d-none d-lg-flex">
          <router-link
            v-for="item in primaryNavItems"
            :key="item.to"
            :to="item.to"
            class="site-nav-link"
            :class="{ active: isMenuActive(item) }"
          >
            {{ item.label }}
          </router-link>
        </nav>

        <div class="site-header-actions">
          <button v-if="isAuthenticated" type="button" class="header-bell-button d-none d-lg-inline-flex" @click="navigateToNotifications">
            <span class="header-bell-icon">🔔</span>
            <span v-if="unreadNotifications" class="header-count-badge">{{ unreadText }}</span>
          </button>

          <button type="button" class="theme-toggle d-none d-lg-inline-flex" @click="toggleTheme" :title="theme === 'dark' ? 'حالت روشن' : 'حالت تاریک'">
            <span v-if="theme === 'dark'">☀️</span>
            <span v-else>🌙</span>
          </button>

          <div v-if="isAuthenticated" class="customer-account-wrap d-none d-lg-block">
            <button type="button" class="customer-account-button" @click="profileMenuOpen = !profileMenuOpen">
              <span class="customer-account-avatar">
                <img v-if="customerAvatar" :src="customerAvatar" alt="آواتار مشتری" />
                <span v-else>{{ customerInitial }}</span>
              </span>
              <span class="customer-account-copy">
                <strong>{{ customerDisplayName }}</strong>
                <small>{{ customerPhone }}</small>
              </span>
            </button>

            <transition name="menu-fade">
              <div v-if="profileMenuOpen" class="customer-account-menu">
                <button type="button" class="desktop-menu-link" @click="navigateSecondaryItem({ to: '/customer/dashboard', requiresAuth: true })">داشبورد مشتری</button>
                <button type="button" class="desktop-menu-link" @click="navigateSecondaryItem({ to: '/customer/profile', requiresAuth: true })">پروفایل</button>
                <button type="button" class="desktop-menu-link" @click="navigateSecondaryItem({ to: '/customer/bookmarks', requiresAuth: true })">نشان‌شده‌ها</button>
                <button type="button" class="desktop-menu-link" @click="navigateSecondaryItem({ to: '/customer/recently-viewed', requiresAuth: true })">بازدیدهای اخیر</button>
                <button type="button" class="desktop-menu-link" @click="navigateSecondaryItem({ to: '/customer/notifications', requiresAuth: true })">
                  <span>اعلان‌ها</span>
                  <span v-if="unreadNotifications" class="desktop-menu-badge">{{ unreadText }}</span>
                </button>
                <button type="button" class="desktop-menu-link danger" @click="logout">خروج</button>
              </div>
            </transition>
          </div>

          <button v-else type="button" class="auth-button d-none d-lg-inline-flex" @click="openAuthModal()">ورود / عضویت</button>

          <button type="button" class="menu-button d-lg-none" :aria-expanded="mobileMenuOpen" @click="mobileMenuOpen = !mobileMenuOpen">
            <span></span>
            <span></span>
            <span></span>
          </button>
        </div>
      </div>

      <transition name="menu-fade">
        <div v-if="mobileMenuOpen" class="page-shell mobile-menu-shell d-lg-none">
          <div class="mobile-menu">
            <router-link
              v-for="item in mobileMenuPrimaryItems"
              :key="item.to"
              :to="item.to"
              class="mobile-menu-link"
              :class="{ active: isMenuActive(item) }"
            >
              <span class="mobile-menu-link-main">
                <i :class="item.icon"></i>
                <span>{{ item.label }}</span>
              </span>
            </router-link>

            <button
              v-for="item in mobileMenuSecondaryItems"
              :key="item.to"
              type="button"
              class="mobile-menu-link secondary"
              :class="{ active: isMenuActive(item) }"
              @click="navigateSecondaryItem(item)"
            >
              <span class="mobile-menu-link-main">
                <i :class="item.icon"></i>
                <span>{{ item.label }}</span>
              </span>
              <span v-if="item.showBadge && unreadNotifications" class="mobile-link-badge">{{ unreadText }}</span>
            </button>

            <button v-if="!isAuthenticated" type="button" class="auth-button auth-button-mobile" @click="openAuthModal()">ورود / عضویت</button>
            <button v-else type="button" class="mobile-menu-link secondary" @click="logout">
              <span class="mobile-menu-link-main">
                <i class="fa-solid fa-arrow-right-from-bracket"></i>
                <span>خروج از حساب</span>
              </span>
            </button>

            <button type="button" class="theme-toggle mobile-theme-toggle" @click="toggleTheme">
              <span v-if="theme === 'dark'">☀️ حالت روشن</span>
              <span v-else>🌙 حالت تاریک</span>
            </button>
          </div>
        </div>
      </transition>
    </header>

    <main class="web-main" :class="{ 'web-main-home': isHome }">
      <router-view v-slot="{ Component }">
        <transition :name="isCustomerPanelRoute ? 'panel-slide' : 'route-float'" mode="out-in" appear>
          <div :key="pageTransitionKey" class="route-stage">
            <div v-if="isHome">
              <component :is="Component" />
            </div>
            <div v-else class="page-shell route-shell">
              <component :is="Component" />
            </div>
          </div>
        </transition>
      </router-view>
    </main>

    <button v-if="isAuthenticated" type="button" class="floating-deals-cta" :class="{ active: route.path.startsWith('/customer/deals') }" @click="navigateToDeals">
      <span class="floating-deals-live" aria-hidden="true">
        <span></span>
      </span>
      <span class="floating-deals-copy">
        <strong>معاملات من</strong>
        <small>{{ floatingDealsSubtitle }}</small>
      </span>
      <span class="floating-deals-count">{{ waitingDealsText }}</span>
    </button>

    <nav class="mobile-quick-nav d-lg-none" aria-label="ناوبری سریع موبایل">
      <button
        v-for="item in mobileQuickNavItems"
        :key="item.to"
        type="button"
        class="mobile-quick-nav-item"
        :class="{ active: isMenuActive(item) }"
        @click="navigateQuickNavItem(item)"
      >
        <i :class="item.icon"></i>
        <span>{{ item.label }}</span>
        <span v-if="item.badge === 'deals' && waitingDealsCount" class="mobile-quick-nav-badge">{{ waitingDealsText }}</span>
      </button>
    </nav>

    <button type="button" class="back-top-button" :class="{ visible: showBackTop }" @click="scrollToTop">
      <span>↑</span>
    </button>

    <CustomerAuthModal :open="authModalOpen" :redirect-to="authRedirectTo" @close="handleAuthClose" />
  </div>
</template>

<style scoped>
.desktop-menu-wrap,
.customer-account-wrap {
  position: relative;
}

.desktop-menu-button,
.header-bell-button,
.customer-account-button,
.mobile-theme-toggle {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  min-height: 46px;
  border-radius: 18px;
}

.desktop-menu-button,
.header-bell-button,
.customer-account-button {
  border: 1px solid var(--web-border-strong);
  background: var(--web-surface);
  color: var(--web-text);
}

.desktop-menu-button,
.customer-account-button {
  padding: 0 14px;
}

.desktop-menu-icon {
  display: inline-flex;
  flex-direction: column;
  gap: 3px;
}

.desktop-menu-icon span {
  width: 14px;
  height: 2px;
  border-radius: 999px;
  background: var(--web-primary);
}

.header-bell-button {
  position: relative;
  width: 46px;
}

.header-bell-icon {
  font-size: 18px;
}

.header-count-badge,
.desktop-menu-badge,
.mobile-link-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 24px;
  height: 24px;
  padding: 0 7px;
  border-radius: 999px;
  background: var(--web-primary);
  color: #fff;
  font-size: 11px;
  font-weight: 800;
}

.header-count-badge {
  position: absolute;
  top: -6px;
  left: -6px;
}

.customer-account-button {
  min-width: 230px;
  justify-content: flex-start;
}

.customer-account-avatar {
  width: 34px;
  height: 34px;
  border-radius: 999px;
  background: linear-gradient(135deg, var(--web-primary) 0%, #c11212 100%);
  color: #fff;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  font-weight: 900;
  flex-shrink: 0;
  overflow: hidden;
}

.customer-account-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.customer-account-copy {
  display: grid;
  text-align: right;
}

.customer-account-copy strong {
  font-size: 13px;
}

.customer-account-copy small {
  color: var(--web-muted);
}

.desktop-menu-panel,
.customer-account-menu {
  position: absolute;
  top: calc(100% + 12px);
  left: 0;
  width: 250px;
  display: grid;
  gap: 8px;
  padding: 12px;
  border-radius: 24px;
  border: 1px solid var(--web-border);
  background: var(--web-surface);
  box-shadow: var(--web-shadow-lg);
  z-index: 80;
}

.desktop-menu-link {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  min-height: 48px;
  padding: 0 14px;
  border: 1px solid transparent;
  border-radius: 16px;
  background: var(--web-surface-soft);
  color: var(--web-text);
  font-size: 13px;
  font-weight: 800;
  text-align: right;
}

.desktop-menu-link.active {
  border-color: var(--web-border-strong);
  background: var(--web-primary-soft);
  color: var(--web-primary);
}

.desktop-menu-link.danger {
  color: #b91c1c;
}

.mobile-menu-link-main {
  display: inline-flex;
  align-items: center;
  gap: 10px;
}

.mobile-menu-link-main i {
  width: 18px;
  text-align: center;
}

.mobile-menu-link.secondary {
  justify-content: space-between;
}

.mobile-theme-toggle {
  width: 100%;
  border-radius: 18px;
  min-height: 48px;
}

.web-main {
  position: relative;
}

.route-stage {
  min-width: 0;
}

.route-float-enter-active,
.route-float-leave-active {
  transition: opacity 0.32s ease, transform 0.32s ease;
}

.route-float-enter-from,
.route-float-leave-to {
  opacity: 0;
  transform: translateY(22px) scale(0.985);
}

.panel-slide-enter-active,
.panel-slide-leave-active {
  transition: opacity 0.28s ease, transform 0.28s ease;
}

.panel-slide-enter-from {
  opacity: 0;
  transform: translateX(-16px);
}

.panel-slide-leave-to {
  opacity: 0;
  transform: translateX(16px);
}

.route-shell {
  will-change: transform, opacity;
}

.floating-deals-cta {
  position: fixed;
  right: 14px;
  bottom: 0;
  transform: translateY(-50%);
  z-index: 84;
  min-width: 232px;
  display: inline-flex;
  align-items: center;
  gap: 12px;
  padding: 13px 15px;
  border: 1px solid rgba(193, 18, 18, 0.16);
  border-radius: 24px;
  background: linear-gradient(135deg, rgba(193, 18, 18, 0.96) 0%, rgba(231, 76, 60, 0.94) 100%);
  color: #fff;
  box-shadow: 0 20px 46px rgba(193, 18, 18, 0.26);
  text-align: right;
}

.floating-deals-cta.active {
  box-shadow: 0 22px 54px rgba(193, 18, 18, 0.34);
}

.floating-deals-live {
  width: 38px;
  height: 38px;
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.16);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.floating-deals-live span {
  width: 11px;
  height: 11px;
  border-radius: 999px;
  background: #fff;
  box-shadow: 0 0 0 0 rgba(255, 255, 255, 0.7);
  animation: dealsLivePulse 1.8s ease-out infinite;
}

.floating-deals-copy {
  display: grid;
  gap: 3px;
  flex: 1;
}

.floating-deals-copy strong {
  font-size: 14px;
  font-weight: 900;
}

.floating-deals-copy small {
  font-size: 11px;
  opacity: 0.94;
}

.floating-deals-count {
  min-width: 42px;
  height: 42px;
  padding: 0 10px;
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.2);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 15px;
  font-weight: 900;
  flex-shrink: 0;
}

@keyframes dealsLivePulse {
  0% {
    transform: scale(0.92);
    box-shadow: 0 0 0 0 rgba(255, 255, 255, 0.72);
  }

  70% {
    transform: scale(1);
    box-shadow: 0 0 0 12px rgba(255, 255, 255, 0);
  }

  100% {
    transform: scale(0.92);
    box-shadow: 0 0 0 0 rgba(255, 255, 255, 0);
  }
}

.mobile-quick-nav {
  position: fixed;
  right: 10px;
  left: 10px;
  bottom: 10px;
  z-index: 85;
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 8px;
  padding: 8px;
  border-radius: 24px;
  border: 1px solid var(--web-border);
  background: var(--web-surface-soft);
  box-shadow: 0 18px 44px rgba(15, 23, 42, 0.12);
  backdrop-filter: blur(18px);
}

.mobile-quick-nav-item {
  position: relative;
  min-height: 58px;
  border-radius: 16px;
  border: 1px solid transparent;
  background: transparent;
  color: var(--web-muted);
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 5px;
  font-size: 10px;
  font-weight: 800;
}

.mobile-quick-nav-item i {
  font-size: 15px;
}

.mobile-quick-nav-item.active {
  background: rgba(193, 18, 18, 0.08);
  border-color: rgba(193, 18, 18, 0.12);
  color: var(--web-primary);
}

.mobile-quick-nav-badge {
  position: absolute;
  top: 6px;
  left: 10px;
  min-width: 18px;
  height: 18px;
  padding: 0 5px;
  border-radius: 999px;
  background: var(--web-primary);
  color: #fff;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 9px;
  font-weight: 900;
}

:global([data-theme='dark']) .desktop-menu-button,
:global([data-theme='dark']) .header-bell-button,
:global([data-theme='dark']) .customer-account-button,
:global([data-theme='dark']) .desktop-menu-panel,
:global([data-theme='dark']) .customer-account-menu {
  background: linear-gradient(180deg, rgba(17, 24, 33, 0.98) 0%, rgba(12, 18, 27, 0.99) 100%);
  border-color: rgba(151, 176, 214, 0.16);
  color: #f5f8ff;
}

:global([data-theme='dark']) .desktop-menu-link {
  background: rgba(255, 255, 255, 0.06);
  border-color: rgba(151, 176, 214, 0.12);
  color: #f5f8ff;
}

:global([data-theme='dark']) .desktop-menu-link.active {
  background: linear-gradient(135deg, rgba(255, 106, 99, 0.22) 0%, rgba(255, 106, 99, 0.12) 100%);
  border-color: rgba(255, 106, 99, 0.26);
  color: #ffd2cf;
}

:global([data-theme='dark']) .desktop-menu-link.danger {
  background: rgba(248, 113, 113, 0.08);
  color: #fecaca;
}

:global([data-theme='dark']) .customer-account-copy small {
  color: #becbdd;
}

:global([data-theme='dark']) .desktop-menu-button:hover,
:global([data-theme='dark']) .header-bell-button:hover,
:global([data-theme='dark']) .customer-account-button:hover {
  background: linear-gradient(180deg, rgba(22, 31, 43, 0.98) 0%, rgba(15, 22, 31, 0.99) 100%);
}

:global([data-theme='dark']) .mobile-menu {
  background: linear-gradient(180deg, rgba(17, 24, 33, 0.98) 0%, rgba(12, 18, 27, 0.99) 100%);
  border-color: rgba(151, 176, 214, 0.16);
}

:global([data-theme='dark']) .mobile-menu-link,
:global([data-theme='dark']) .mobile-theme-toggle {
  background: rgba(255, 255, 255, 0.06);
  border-color: rgba(151, 176, 214, 0.12);
  color: #f5f8ff;
}

:global([data-theme='dark']) .mobile-menu-link.active {
  background: linear-gradient(135deg, rgba(255, 106, 99, 0.22) 0%, rgba(255, 106, 99, 0.12) 100%);
  border-color: rgba(255, 106, 99, 0.26);
  color: #ffd2cf;
}

:global([data-theme='dark']) .mobile-quick-nav {
  background: rgba(12, 18, 27, 0.92);
  border-color: rgba(151, 176, 214, 0.16);
  box-shadow: 0 24px 52px rgba(0, 0, 0, 0.42);
}

:global([data-theme='dark']) .floating-deals-cta {
  border-color: rgba(255, 120, 120, 0.22);
  background: linear-gradient(135deg, rgba(193, 18, 18, 0.94) 0%, rgba(255, 120, 120, 0.82) 100%);
  box-shadow: 0 20px 46px rgba(0, 0, 0, 0.34);
}

:global([data-theme='dark']) .mobile-quick-nav-item {
  color: #b8c4d6;
}

:global([data-theme='dark']) .mobile-quick-nav-item.active {
  background: linear-gradient(135deg, rgba(255, 106, 99, 0.2) 0%, rgba(255, 106, 99, 0.1) 100%);
  border-color: rgba(255, 106, 99, 0.22);
  color: #ffd2cf;
}

@media (max-width: 991px) {
  .floating-deals-cta {
    display: none;
  }
}

@media (max-width: 767px) {
  .web-main {
    padding-bottom: 96px;
  }

  .mobile-menu-shell {
    padding-bottom: 96px;
  }

  .floating-deals-cta {
    display: none;
  }

  .mobile-link-badge {
    min-width: 22px;
    height: 22px;
  }

  .mobile-quick-nav {
    right: 8px;
    left: 8px;
    bottom: 8px;
    gap: 6px;
    padding: 7px;
    border-radius: 20px;
  }

  .mobile-quick-nav-item {
    min-height: 54px;
    font-size: 9px;
  }
}
</style>
