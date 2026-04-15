<script setup>
import { computed, onMounted, onUnmounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import CustomerAuthModal from '../components/CustomerAuthModal.vue';
import logoImage from '../assets/images/figma-logo.png';
import { useCustomerSession } from '../composables/useCustomerSession.js';
import { useSiteConfig } from '../composables/useSiteConfig.js';
import { useWebTheme } from '../composables/useWebTheme.js';
import { getCustomerDealSummary } from '../services/customer-panel.api.js';
import { getCustomerNotificationSummary } from '../services/customer-notification.api.js';
import { getCustomerProfile } from '../services/customer-profile.api.js';

const route = useRoute();
const router = useRouter();
const { theme, toggleTheme } = useWebTheme();
const { profile, isAuthenticated, unreadNotifications, clearSession, syncNotificationSummary, updateProfile } = useCustomerSession();
const { siteLogoUrl, ensureSiteConfig } = useSiteConfig();

const activeLogo = computed(() => siteLogoUrl.value || logoImage);

const mobileMenuOpen = ref(false);
const profileMenuOpen = ref(false);
const authModalOpen = ref(false);
const authRedirectTo = ref('/customer/dashboard');
const showBackTop = ref(false);
const customerDealSummary = ref({ waitingCustomer: 0 });

const primaryNavItems = [
  { label: 'صفحه اصلی', to: '/', name: 'home', icon: 'fa-solid fa-house' },
  { label: 'بازار امتیاز وام', to: '/market', name: 'loan-market', icon: 'fa-solid fa-store' },
  { label: 'مجوزها', to: '/licenses', name: 'licenses', icon: 'fa-solid fa-certificate' },
  { label: 'درباره ما', to: '/about-us', name: 'about-us', icon: 'fa-solid fa-circle-info' },
  { label: 'پشتیبانی', to: '/requests', name: 'requests', icon: 'fa-solid fa-headset' }
];

const secondaryItems = computed(() => [
  { label: 'داشبورد مشتری', to: '/customer/dashboard', requiresAuth: true, icon: 'fa-solid fa-gauge-high' },
  { label: 'پروفایل', to: '/customer/profile', requiresAuth: true, icon: 'fa-solid fa-id-card' },
  { label: 'اعلان‌ها', to: '/customer/notifications', requiresAuth: true, showBadge: true, icon: 'fa-solid fa-bell' },
  { label: 'نشان‌شده‌ها', to: '/customer/bookmarks', requiresAuth: true, icon: 'fa-solid fa-bookmark' },
  { label: 'بازدیدهای اخیر', to: '/customer/recently-viewed', requiresAuth: true, icon: 'fa-solid fa-clock-rotate-left' },
  { label: 'آموزشگاه', to: '/customer/academy', requiresAuth: true, icon: 'fa-solid fa-graduation-cap' }
]);

const mobileMenuPrimaryItems = computed(() => primaryNavItems.filter((item) => ['/about-us', '/licenses'].includes(item.to)));
const mobileMenuSecondaryItems = computed(() => secondaryItems.value.filter((item) => ['/customer/notifications'].includes(item.to)));
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
  ensureSiteConfig();
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
          <img :src="activeLogo" alt="دیجی وام" class="site-brand-image" />
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
                <button type="button" class="desktop-menu-link" @click="navigateSecondaryItem({ to: '/customer/academy', requiresAuth: true })">آموزشگاه</button>
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

    <button type="button" class="back-top-button d-none d-md-block" :class="{ visible: showBackTop }" @click="scrollToTop">
      <span>↑</span>
    </button>

    <CustomerAuthModal :open="authModalOpen" :redirect-to="authRedirectTo" @close="handleAuthClose" />
  </div>
</template>

<style scoped src="./styles/WebLayout.css"></style>
