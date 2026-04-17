<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useCustomerSession } from '../composables/useCustomerSession.js';
import { useSiteConfig } from '../composables/useSiteConfig.js';
import { ACCOUNT_SUSPENDED_EVENT } from '../services/customer-auth.api.js';
import { getCustomerConversations, getCustomerDealSummary } from '../services/customer-panel.api.js';
import logoFallback from '../assets/images/figma-logo.png';

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
const router = useRouter();
const { profile, isSuspended, unreadNotifications, updateProfile } = useCustomerSession();
const { siteLogoUrl } = useSiteConfig();
const activeLogo = computed(() => siteLogoUrl.value || logoFallback);
const dealSummary = ref({ waitingCustomer: 0 });
const conversationSummary = ref({ totalUnreadCount: 0 });
const isCompactSidebar = ref(false);
const isMobileNavOpen = ref(false);

const navItems = [
  { to: '/customer/dashboard', label: 'داشبورد', icon: 'fa-solid fa-house', name: 'customer-dashboard', activeNames: ['customer-dashboard'], mobileHidden: true },
  { to: '/customer/deals', label: 'معامله‌ها', icon: 'fa-solid fa-handshake', name: 'customer-deals', activeNames: ['customer-deals', 'customer-deal-start', 'customer-deal-detail'], badge: 'deals' },
  { to: '/customer/conversations', label: 'گفتگوها', icon: 'fa-solid fa-comments', name: 'customer-conversations', activeNames: ['customer-conversations'], badge: 'conversations' },
  { to: '/customer/profile', label: 'پروفایل', icon: 'fa-solid fa-id-card', name: 'customer-profile' },
  { to: '/customer/notifications', label: 'اعلان‌ها', icon: 'fa-solid fa-bell', name: 'customer-notifications', badge: 'notifications' },
  { to: '/customer/validations', label: 'اعتبارسنجی‌ها', icon: 'fa-solid fa-clipboard-check', name: 'customer-validations' },
  { to: '/customer/bookmarks', label: 'نشان‌شده‌ها', icon: 'fa-solid fa-bookmark', name: 'customer-bookmarks', mobileHidden: true },
  { to: '/customer/recently-viewed', label: 'بازدیدهای اخیر', icon: 'fa-solid fa-clock-rotate-left', name: 'customer-recently-viewed', mobileHidden: true },
  { to: '/customer/academy', label: 'آموزشگاه', icon: 'fa-solid fa-graduation-cap', name: 'customer-academy' }
];

const customerName = computed(() => profile.value?.name || 'حساب مشتری');
const customerPhone = computed(() => profile.value?.phone || '-');
const customerAvatar = computed(() => profile.value?.avatar || '');
const profileStatusText = computed(() => (profile.value?.profile ? 'پروفایل تکمیل شده' : 'تکمیل اطلاعات حساب'));
const profileStatusClass = computed(() => (profile.value?.profile ? 'done' : 'pending'));
const unreadText = computed(() => new Intl.NumberFormat('fa-IR').format(Number(unreadNotifications.value || 0)));
const dealAwaitingText = computed(() => new Intl.NumberFormat('fa-IR').format(Number(dealSummary.value.waitingCustomer || 0)));
const conversationUnreadText = computed(() => new Intl.NumberFormat('fa-IR').format(Number(conversationSummary.value.totalUnreadCount || 0)));
const normalizedStats = computed(() => (Array.isArray(props.stats) ? props.stats.filter(Boolean).slice(0, 4) : []));
const isNavExpanded = computed(() => !isCompactSidebar.value || isMobileNavOpen.value);
const suspensionReason = computed(() => profile.value?.suspendReason || 'حساب شما توسط ادمین معلق شده است. تنها بخش پشتیبانی در دسترس است.');

const isActive = (item) => (Array.isArray(item.activeNames) ? item.activeNames.includes(route.name) : route.name === item.name);
const isDealNavItem = (item) => item.to.startsWith('/customer/deal');
const isNavItemDisabled = (item) => isSuspended.value && isDealNavItem(item);

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
  if (isSuspended.value) {
    dealSummary.value = { waitingCustomer: 0 };
    conversationSummary.value = { totalUnreadCount: 0 };
    return;
  }

  try {
    const [dealData, conversationData] = await Promise.all([getCustomerDealSummary(), getCustomerConversations()]);
    dealSummary.value = dealData.summary || dealSummary.value;
    conversationSummary.value = {
      totalUnreadCount: Number(conversationData.totalUnreadCount || 0)
    };
  } catch {
    dealSummary.value = { waitingCustomer: 0 };
    conversationSummary.value = { totalUnreadCount: 0 };
  }
};

const handleDealUpdate = () => {
  loadDealSummary();
};

const handleNavClick = (event, item) => {
  if (!isNavItemDisabled(item)) {
    if (isCompactSidebar.value) {
      isMobileNavOpen.value = false;
    }
    return;
  }

  event.preventDefault();
  isMobileNavOpen.value = false;
};

const handleAccountSuspended = (event) => {
  if (event.detail?.panel !== 'customer') {
    return;
  }

  updateProfile({
    ...(profile.value || {}),
    isSuspended: true,
    suspendReason: event.detail?.reason || profile.value?.suspendReason || ''
  });

  if (route.name !== 'customer-dashboard') {
    router.push({ name: 'customer-dashboard', query: { suspended: '1' } });
  }
};

onMounted(() => {
  syncViewportState();
  loadDealSummary();
  window.addEventListener('customer-deal-updated', handleDealUpdate);
  window.addEventListener(ACCOUNT_SUSPENDED_EVENT, handleAccountSuspended);
  window.addEventListener('resize', syncViewportState);
});

onBeforeUnmount(() => {
  window.removeEventListener('customer-deal-updated', handleDealUpdate);
  window.removeEventListener(ACCOUNT_SUSPENDED_EVENT, handleAccountSuspended);
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
            :class="{ active: isActive(item), disabled: isNavItemDisabled(item), 'mobile-hidden': item.mobileHidden }"
            @click="(e) => handleNavClick(e, item)"
          >
            <span class="customer-shell-nav-icon"><i :class="item.icon"></i></span>
            <span>{{ item.label }}</span>
            <span v-if="item.badge === 'notifications' && unreadNotifications" class="customer-shell-nav-badge">{{ unreadText }}</span>
            <span v-if="item.badge === 'deals' && dealSummary.waitingCustomer" class="customer-shell-nav-badge">{{ dealAwaitingText }}</span>
            <span v-if="item.badge === 'conversations' && conversationSummary.totalUnreadCount" class="customer-shell-nav-badge">{{ conversationUnreadText }}</span>
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
        <div v-if="isSuspended" class="customer-shell-suspension-alert">
          <div class="customer-shell-suspension-icon"><i class="fa-solid fa-ban"></i></div>
          <div>
            <strong>حساب شما معلق است</strong>
            <p>{{ suspensionReason }}</p>
          </div>
        </div>

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

<style scoped src="./styles/CustomerPanelShell.css"></style>