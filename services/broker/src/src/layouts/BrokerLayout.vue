<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { getBrokerDealSummary } from '../services/broker-deal.api.js';
import {
  getBrokerNotificationSummary,
  markAllBrokerNotificationsRead,
  markBrokerNotificationRead
} from '../services/broker-notification.api.js';
import { getBrokerProfile } from '../services/broker-profile.api.js';
import { ACCOUNT_SUSPENDED_EVENT, clearBrokerSessionStorage, persistBrokerSession, readStoredBrokerProfile } from '../services/broker-auth.api.js';
import { useTheme } from '../composables/useTheme.js';

const route = useRoute();
const router = useRouter();
const profile = ref(null);
const { isDark, toggleTheme } = useTheme();
const sidebarOpen = ref(false);
const notificationDrawerOpen = ref(false);
const notificationLoading = ref(false);
const notificationActionLoading = ref(false);
const notificationActionId = ref(null);
const notificationSummary = ref({ total: 0, unread: 0, read: 0, info: 0, attention: 0, warning: 0 });
const dealSummary = ref({ total: 0, inProgress: 0, failed: 0, suspended: 0, done: 0, waitingCustomer: 0, waitingBroker: 0, waitingAdmin: 0, verifyBroker: 0 });
const latestNotifications = ref([]);
const isSuspended = computed(() => Boolean(profile.value?.isSuspended));
const suspensionReason = computed(() => profile.value?.suspendReason || 'حساب شما توسط ادمین معلق شده است. فقط بخش پشتیبانی در دسترس است.');

const navItems = [
  { to: '/dashboard', name: 'broker-dashboard', icon: 'fa-solid fa-gauge-high', label: 'داشبورد' },
  { to: '/deals',relatedLinks: ['broker-deal-detail'], name: 'broker-deals', icon: 'fa-solid fa-briefcase', label: 'کارتابل معاملات' },
  { to: '/notifications', name: 'broker-notifications', icon: 'fa-solid fa-bell', label: 'نوتیفیکیشن ها' },
  { to: '/validity', name: 'broker-validity', icon: 'fa-solid fa-wallet', label: 'اعتبارات' },
  { to: '/profile', name: 'broker-profile', icon: 'fa-solid fa-user-pen', label: 'پروفایل' },
  { to: '/loan/create', name: 'broker-loan-create', icon: 'fa-solid fa-file-invoice-dollar', label: 'ثبت امتیاز وام' },
  { to: '/tickets', name: 'broker-tickets', icon: 'fa-solid fa-headset', label: 'پشتیبانی' },
  { to: '/academy', name: 'broker-academy', icon: 'fa-solid fa-graduation-cap', label: 'آموزشگاه' }
];

const pageTitle = computed(() => {
  const titles = {
    'broker-dashboard': 'داشبورد کارگزار',
    'broker-deals': 'کارتابل معاملات',
    'broker-deal-detail': 'جزئیات معامله',
    'broker-notifications': 'نوتیفیکیشن ها',
    'broker-validity': 'اعتبارات',
    'broker-profile': 'پروفایل',
    'broker-loan-create': 'ثبت امتیاز وام',
    'broker-tickets': 'پشتیبانی',
    'broker-academy': 'آموزشگاه'
  };
  return titles[route.name] || 'پنل کارگزار';
});

const breadcrumbs = computed(() => {
  const items = [{ label: 'داشبورد', to: '/dashboard' }];

  if (route.name && route.name !== 'broker-dashboard') {
    items.push({ label: pageTitle.value, to: route.fullPath, current: true });
  } else {
    items[0].current = true;
  }

  return items;
});

const unreadCount = computed(() => new Intl.NumberFormat('fa-IR').format(Number(notificationSummary.value.unread || 0)));
const formatDate = (value) => (value ? new Date(value).toLocaleString('fa-IR') : '-');
const isNavItemDisabled = (item) => isSuspended.value && item.name !== 'broker-tickets';

const dispatchNotificationUpdate = () => {
  window.dispatchEvent(new CustomEvent('broker-notification-updated'));
};

const logout = () => {
  clearBrokerSessionStorage();
  router.push('/auth');
};

const closeSidebar = () => {
  sidebarOpen.value = false;
};

const closeNotificationDrawer = () => {
  notificationDrawerOpen.value = false;
};

const loadProfile = async () => {
  try {
    const data = await getBrokerProfile();
    profile.value = data.profile;
    persistBrokerSession({ broker: data.profile });
  } catch (_) {
    profile.value = readStoredBrokerProfile();
  }
};

const loadNotifications = async () => {
  if (isSuspended.value) {
    notificationSummary.value = { total: 0, unread: 0, read: 0, info: 0, attention: 0, warning: 0 };
    latestNotifications.value = [];
    return;
  }

  notificationLoading.value = true;
  try {
    const data = await getBrokerNotificationSummary();
    notificationSummary.value = data.summary || notificationSummary.value;
    latestNotifications.value = data.latest || [];
  } catch (_) {
    notificationSummary.value = { total: 0, unread: 0, read: 0, info: 0, attention: 0, warning: 0 };
    latestNotifications.value = [];
  } finally {
    notificationLoading.value = false;
  }
};

const loadDealSummary = async () => {
  if (isSuspended.value) {
    dealSummary.value = { total: 0, inProgress: 0, failed: 0, suspended: 0, done: 0, waitingCustomer: 0, waitingBroker: 0, waitingAdmin: 0, verifyBroker: 0 };
    return;
  }

  try {
    const data = await getBrokerDealSummary();
    dealSummary.value = data.summary || dealSummary.value;
  } catch (_) {
    dealSummary.value = { total: 0, inProgress: 0, failed: 0, suspended: 0, done: 0, waitingCustomer: 0, waitingBroker: 0, waitingAdmin: 0, verifyBroker: 0 };
  }
};

const toggleNotificationDrawer = async () => {
  notificationDrawerOpen.value = !notificationDrawerOpen.value;
  if (notificationDrawerOpen.value) {
    await loadNotifications();
  }
};

const markOneRead = async (item) => {
  if (item.isRead) {
    return;
  }

  notificationActionId.value = item.id;
  try {
    await markBrokerNotificationRead(item.id);
    dispatchNotificationUpdate();
    await loadNotifications();
  } catch (_) {
    return;
  } finally {
    notificationActionId.value = null;
  }
};

const markAllRead = async () => {
  if (!notificationSummary.value.unread) {
    return;
  }

  notificationActionLoading.value = true;
  try {
    await markAllBrokerNotificationsRead();
    dispatchNotificationUpdate();
    await loadNotifications();
  } catch (_) {
    return;
  } finally {
    notificationActionLoading.value = false;
  }
};

const getNotificationDetailPath = (item) => String(item?.metadata?.detailPath || '').trim();

const openNotificationDetail = async (item) => {
  const detailPath = getNotificationDetailPath(item);
  if (!detailPath) {
    return;
  }

  notificationActionId.value = `open-${item.id}`;
  try {
    if (!item.isRead) {
      await markBrokerNotificationRead(item.id);
      dispatchNotificationUpdate();
    }
    notificationDrawerOpen.value = false;
    await loadNotifications();
    await router.push(detailPath);
  } catch (_) {
    notificationDrawerOpen.value = false;
    await router.push(detailPath);
  } finally {
    notificationActionId.value = null;
  }
};

const openNotificationsPage = () => {
  notificationDrawerOpen.value = false;
  router.push('/notifications');
};

const handleNavClick = (item, event) => {
  if (isNavItemDisabled(item)) {
    event.preventDefault();
    closeSidebar();
    router.push('/tickets');
    return;
  }

  closeSidebar();
};

const handleProfileUpdate = (event) => {
  profile.value = event.detail;
};

const handleNotificationUpdate = () => {
  loadNotifications();
};

const handleDealUpdate = () => {
  loadDealSummary();
};

const handleAccountSuspended = (event) => {
  if (event.detail?.panel !== 'broker') {
    return;
  }

  profile.value = {
    ...(profile.value || readStoredBrokerProfile() || {}),
    isSuspended: true,
    suspendReason: event.detail?.reason || profile.value?.suspendReason || ''
  };
  notificationDrawerOpen.value = false;

  if (route.name !== 'broker-tickets') {
    router.push('/tickets');
  }
};

onMounted(() => {
  profile.value = readStoredBrokerProfile();
  loadProfile();
  loadNotifications();
  loadDealSummary();
  window.addEventListener(ACCOUNT_SUSPENDED_EVENT, handleAccountSuspended);
  window.addEventListener('broker-profile-updated', handleProfileUpdate);
  window.addEventListener('broker-notification-updated', handleNotificationUpdate);
  window.addEventListener('broker-deal-updated', handleDealUpdate);
});

onBeforeUnmount(() => {
  window.removeEventListener(ACCOUNT_SUSPENDED_EVENT, handleAccountSuspended);
  window.removeEventListener('broker-profile-updated', handleProfileUpdate);
  window.removeEventListener('broker-notification-updated', handleNotificationUpdate);
  window.removeEventListener('broker-deal-updated', handleDealUpdate);
});
</script>

<template>
  <div class="broker-shell">
    <div v-if="sidebarOpen" class="sidebar-backdrop" @click="closeSidebar"></div>
    <div v-if="notificationDrawerOpen" class="notification-backdrop" @click="closeNotificationDrawer"></div>

    <aside class="notification-drawer" :class="{ open: notificationDrawerOpen }">
      <div class="notification-drawer-head">
        <div>
          <h2 class="notification-drawer-title">اعلان های اخیر</h2>
          <p class="notification-drawer-desc">پیام های خوانده نشده و آخرین وضعیت امتیازهای وام</p>
        </div>
        <button class="drawer-close-btn" @click="closeNotificationDrawer">
          <i class="fa-solid fa-xmark"></i>
        </button>
      </div>

      <div class="notification-mini-stats">
        <div class="notification-mini-card">
          <span>خوانده نشده</span>
          <strong>{{ unreadCount }}</strong>
        </div>
        <div class="notification-mini-card">
          <span>کل پیام ها</span>
          <strong>{{ notificationSummary.total }}</strong>
        </div>
        <div class="notification-mini-card">
          <span>اخطارها</span>
          <strong>{{ notificationSummary.warning }}</strong>
        </div>
      </div>

      <div class="notification-drawer-actions">
        <button class="btn btn-outline-secondary btn-sm" :disabled="notificationActionLoading || !notificationSummary.unread" @click="markAllRead">
          <i v-if="notificationActionLoading" class="fa-solid fa-spinner fa-spin me-1"></i>
          <i v-else class="fa-solid fa-check-double me-1"></i>
          خواندن همه
        </button>
        <button class="btn btn-primary btn-sm" @click="openNotificationsPage">
          <i class="fa-solid fa-arrow-left me-1"></i>
          مشاهده بیشتر
        </button>
      </div>

      <div v-if="notificationLoading" class="drawer-empty">
        <i class="fa-solid fa-spinner fa-spin"></i>
        <span>در حال بارگذاری اعلان ها...</span>
      </div>
      <div v-else-if="!latestNotifications.length" class="drawer-empty">
        <i class="fa-solid fa-bell-slash"></i>
        <span>اعلانی برای نمایش وجود ندارد</span>
      </div>
      <div v-else class="drawer-notification-list">
        <article v-for="item in latestNotifications" :key="item.id" class="drawer-notification-card" :class="{ unread: !item.isRead }">
          <div class="drawer-notification-head">
            <span class="drawer-category-chip" :style="{ color: item.categoryColor, background: `${item.categoryColor}18` }">{{ item.categoryLabel }}</span>
            <time class="drawer-notification-time">{{ formatDate(item.createdAt) }}</time>
          </div>
          <h3 class="drawer-notification-title">{{ item.title }}</h3>
          <p class="drawer-notification-body">{{ item.body }}</p>
          <div class="drawer-notification-footer">
            <span class="drawer-read-state" :class="item.isRead ? 'drawer-read-state-read' : 'drawer-read-state-unread'">{{ item.isRead ? 'خوانده شده' : 'خوانده نشده' }}</span>
            <div class="drawer-notification-actions">
              <button
                v-if="item.metadata?.detailPath"
                class="btn btn-sm btn-primary"
                :disabled="notificationActionId === `open-${item.id}`"
                @click="openNotificationDetail(item)"
              >
                <i v-if="notificationActionId === `open-${item.id}`" class="fa-solid fa-spinner fa-spin me-1"></i>
                <i v-else class="fa-solid fa-arrow-up-right-from-square me-1"></i>
                مشاهده معامله
              </button>
              <button v-if="!item.isRead" class="btn btn-sm btn-outline-secondary" :disabled="notificationActionId === item.id || notificationActionId === `open-${item.id}`" @click="markOneRead(item)">
                <i v-if="notificationActionId === item.id" class="fa-solid fa-spinner fa-spin me-1"></i>
                <i v-else class="fa-solid fa-check me-1"></i>
                خوانده شد
              </button>
            </div>
          </div>
        </article>
      </div>
    </aside>

    <aside class="broker-sidebar" :class="{ open: sidebarOpen }">
      <div class="sidebar-profile">
        <div class="profile-avatar-wrap">
          <img v-if="profile?.avatar" :src="profile.avatar" alt="آواتار" class="profile-avatar-img" />
          <i v-else class="fa-solid fa-user profile-avatar-fallback"></i>
        </div>
        <div class="profile-meta">
          <p class="profile-name">{{ profile?.name || 'کارگزار' }}</p>
          <p class="profile-phone">{{ profile?.phone || '' }}</p>
        </div>
      </div>

      <div class="sidebar-brand">
        <div class="brand-icon"><i class="fa-solid fa-handshake"></i></div>
        <div>
          <h1 class="brand-title">دی جی وام</h1>
          <p class="brand-subtitle">پنل کارگزار</p>
        </div>
      </div>

      <nav class="sidebar-nav">
        <router-link
          v-for="item in navItems"
          :key="item.name"
          class="nav-item"
          :class="{ 'router-link-active': Array.isArray(item.relatedLinks) && item.relatedLinks.includes($route.name), disabled: isNavItemDisabled(item) }"
          :to="item.to"
          @click="handleNavClick(item, $event)"
        >
          <i :class="item.icon" class="nav-icon"></i>
          <span>{{ item.label }}</span>
          <span v-if="item.name === 'broker-notifications' && notificationSummary.unread" class="nav-badge">{{ unreadCount }}</span>
          <span v-if="item.name === 'broker-deals' && dealSummary.waitingBroker" class="nav-badge">{{ dealSummary.waitingBroker }}</span>
        </router-link>
      </nav>

      <div class="sidebar-footer">
        <button class="sidebar-btn" @click="toggleTheme">
          <i :class="isDark ? 'fa-solid fa-sun' : 'fa-solid fa-moon'"></i>
          <span>{{ isDark ? 'حالت روشن' : 'حالت تیره' }}</span>
        </button>
        <button class="sidebar-btn sidebar-btn-logout" @click="logout">
          <i class="fa-solid fa-right-from-bracket"></i>
          <span>خروج</span>
        </button>
      </div>
    </aside>

    <div class="broker-main">
      <div class="ambient-layer" aria-hidden="true">
        <span class="amb-orb orb-1"></span>
        <span class="amb-orb orb-2"></span>
        <span class="amb-orb orb-3"></span>
        <span class="amb-orb orb-4"></span>
        <span class="amb-orb orb-5"></span>
        <span class="amb-shape shape-hex"></span>
        <span class="amb-shape shape-diamond"></span>
        <span class="amb-shape shape-ring"></span>
        <span class="amb-shape shape-square"></span>
        <span class="amb-shape shape-circle"></span>
        <span class="amb-shape shape-cross"></span>
        <span class="amb-dot dot-1"></span>
        <span class="amb-dot dot-2"></span>
        <span class="amb-dot dot-3"></span>
        <span class="amb-dot dot-4"></span>
        <span class="amb-dot dot-5"></span>
        <span class="amb-dot dot-6"></span>
        <span class="amb-dot dot-7"></span>
        <span class="amb-dot dot-8"></span>
        <span class="amb-grid"></span>
      </div>

      <header class="broker-topbar">
        <button class="topbar-menu-btn" @click="sidebarOpen = !sidebarOpen">
          <i class="fa-solid fa-bars"></i>
        </button>
        <div class="topbar-info">
          <h2 class="topbar-title">{{ pageTitle }}</h2>
          <div class="topbar-breadcrumbs">
            <template v-for="(item, index) in breadcrumbs">
              <router-link v-if="!item.current" :key="`link-${item.label}-${index}`" class="breadcrumb-link" :to="item.to">{{ item.label }}</router-link>
              <span v-else :key="`current-${item.label}-${index}`" class="breadcrumb-current">{{ item.label }}</span>
              <i v-if="index < breadcrumbs.length - 1" :key="`separator-${item.label}-${index}`" class="fa-solid fa-angle-left breadcrumb-separator"></i>
            </template>
          </div>
        </div>
        <div class="topbar-actions">
          <button class="notification-toggle" :class="{ active: notificationDrawerOpen }" :disabled="isSuspended" @click="toggleNotificationDrawer">
            <i class="fa-solid fa-bell"></i>
            <span v-if="notificationSummary.unread" class="notification-toggle-badge">{{ unreadCount }}</span>
          </button>
          <div class="topbar-badge" :class="isSuspended ? 'warning' : ''">
            <i :class="isSuspended ? 'fa-solid fa-ban' : 'fa-solid fa-circle-check'"></i>
            {{ isSuspended ? 'حساب معلق' : 'حساب فعال' }}
          </div>
        </div>
      </header>

      <main class="broker-content">
        <section v-if="isSuspended" class="broker-suspension-banner">
          <div class="broker-suspension-icon"><i class="fa-solid fa-ban"></i></div>
          <div>
            <strong>دسترسی پنل محدود شده است</strong>
            <p>{{ suspensionReason }}</p>
          </div>
        </section>

        <router-view v-slot="{ Component }">
          <transition name="page" mode="out-in">
            <component :is="Component" />
          </transition>
        </router-view>
      </main>
    </div>
  </div>
</template>

<style scoped src="./styles/BrokerLayout.css"></style>
