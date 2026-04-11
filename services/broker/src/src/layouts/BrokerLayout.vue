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

const navItems = [
  { to: '/dashboard', name: 'broker-dashboard', icon: 'fa-solid fa-gauge-high', label: 'داشبورد' },
  { to: '/deals',relatedLinks: ['broker-deal-detail'], name: 'broker-deals', icon: 'fa-solid fa-briefcase', label: 'کارتابل معاملات' },
  { to: '/notifications', name: 'broker-notifications', icon: 'fa-solid fa-bell', label: 'نوتیفیکیشن ها' },
  { to: '/validity', name: 'broker-validity', icon: 'fa-solid fa-wallet', label: 'اعتبارات' },
  { to: '/profile', name: 'broker-profile', icon: 'fa-solid fa-user-pen', label: 'پروفایل' },
  { to: '/loan/create', name: 'broker-loan-create', icon: 'fa-solid fa-file-invoice-dollar', label: 'ثبت امتیاز وام' },
  { to: '/tickets', name: 'broker-tickets', icon: 'fa-solid fa-headset', label: 'پشتیبانی' }
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
    'broker-tickets': 'پشتیبانی'
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

const dispatchNotificationUpdate = () => {
  window.dispatchEvent(new CustomEvent('broker-notification-updated'));
};

const logout = () => {
  localStorage.removeItem('broker_token');
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
  } catch (_) {
    profile.value = null;
  }
};

const loadNotifications = async () => {
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

const openNotificationsPage = () => {
  notificationDrawerOpen.value = false;
  router.push('/notifications');
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

onMounted(() => {
  loadProfile();
  loadNotifications();
  loadDealSummary();
  window.addEventListener('broker-profile-updated', handleProfileUpdate);
  window.addEventListener('broker-notification-updated', handleNotificationUpdate);
  window.addEventListener('broker-deal-updated', handleDealUpdate);
});

onBeforeUnmount(() => {
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
            <button v-if="!item.isRead" class="btn btn-sm btn-outline-secondary" :disabled="notificationActionId === item.id" @click="markOneRead(item)">
              <i v-if="notificationActionId === item.id" class="fa-solid fa-spinner fa-spin me-1"></i>
              <i v-else class="fa-solid fa-check me-1"></i>
              خوانده شد
            </button>
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
          :class="{'router-link-active': Array.isArray(item.relatedLinks) && item.relatedLinks.includes($route.name)}"
          :to="item.to"
          @click="closeSidebar"
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
          <button class="notification-toggle" :class="{ active: notificationDrawerOpen }" @click="toggleNotificationDrawer">
            <i class="fa-solid fa-bell"></i>
            <span v-if="notificationSummary.unread" class="notification-toggle-badge">{{ unreadCount }}</span>
          </button>
          <div class="topbar-badge">
            <i class="fa-solid fa-circle-check"></i>
            حساب فعال
          </div>
        </div>
      </header>

      <main class="broker-content">
        <router-view v-slot="{ Component }">
          <transition name="page" mode="out-in">
            <component :is="Component" />
          </transition>
        </router-view>
      </main>
    </div>
  </div>
</template>

<style scoped>
.broker-shell { min-height: 100vh; display: flex; }

.broker-sidebar {
  width: var(--sidebar-width);
  height: 100vh;
  position: fixed;
  top: 0;
  right: 0;
  z-index: 1000;
  background: var(--sidebar-bg);
  padding: 20px 16px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  color: var(--sidebar-text);
  overflow: hidden;
  transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.notification-drawer {
  width: min(380px, 100vw);
  position: fixed;
  top: 0;
  left: 0;
  bottom: 0;
  z-index: 1100;
  background: var(--surface-color);
  border-right: 1px solid var(--panel-border);
  box-shadow: 0 18px 48px rgba(0, 0, 0, 0.12);
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  transform: translateX(-100%);
  transition: transform 0.28s ease;
}

.notification-drawer.open {
  transform: translateX(0);
}

.notification-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.22);
  z-index: 1090;
}

.notification-drawer-head,
.notification-drawer-actions,
.drawer-notification-head,
.drawer-notification-footer,
.topbar-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.notification-drawer-title {
  font-size: 18px;
  font-weight: 800;
  margin: 0;
}

.notification-drawer-desc {
  margin: 4px 0 0;
  font-size: 13px;
  color: var(--muted-text);
}

.drawer-close-btn,
.notification-toggle {
  position: relative;
  width: 42px;
  height: 42px;
  border-radius: 12px;
  border: 1px solid var(--panel-border);
  background: var(--surface-soft);
  color: var(--brand-text);
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.notification-toggle.active {
  border-color: rgba(219, 0, 0, 0.22);
  background: var(--chip-bg);
  color: var(--brand-primary);
}

.notification-toggle-badge,
.nav-badge {
  min-width: 20px;
  height: 20px;
  border-radius: 999px;
  background: var(--brand-primary);
  color: #fff;
  font-size: 11px;
  font-weight: 800;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0 6px;
}

.notification-toggle-badge {
  position: absolute;
  top: -5px;
  left: -5px;
}

.nav-badge {
  margin-inline-start: auto;
}

.notification-mini-stats {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
}

.notification-mini-card {
  border-radius: 14px;
  border: 1px solid var(--panel-border);
  background: var(--surface-soft);
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.notification-mini-card span,
.drawer-notification-time,
.drawer-notification-body {
  font-size: 12px;
  color: var(--muted-text);
}

.notification-mini-card strong {
  font-size: 20px;
}

.drawer-empty {
  min-height: 180px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  color: var(--muted-text);
  border: 1px dashed var(--panel-border);
  border-radius: 16px;
  background: var(--surface-soft);
}

.drawer-notification-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
  overflow-y: auto;
  padding-right: 2px;
}

.drawer-notification-card {
  border: 1px solid var(--panel-border);
  border-radius: 16px;
  padding: 16px;
  background: var(--surface-soft);
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.drawer-notification-card.unread {
  border-color: rgba(219, 0, 0, 0.24);
  box-shadow: 0 10px 24px rgba(219, 0, 0, 0.06);
}

.drawer-category-chip,
.drawer-read-state {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 6px 12px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 700;
}

.drawer-notification-title {
  font-size: 14px;
  font-weight: 800;
  margin: 0;
}

.drawer-notification-body {
  margin: 0;
  line-height: 1.9;
}

.drawer-read-state-read {
  background: #f3f4f6;
  color: #6b7280;
}

.drawer-read-state-unread {
  background: #fff1f2;
  color: #be123c;
}

.sidebar-profile {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 10px 16px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  margin-bottom: 4px;
}

.profile-avatar-wrap {
  width: 50px;
  height: 50px;
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.12);
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.profile-avatar-img { width: 100%; height: 100%; object-fit: cover; }
.profile-avatar-fallback { font-size: 20px; opacity: 0.7; }

.profile-meta { min-width: 0; }
.profile-name { font-size: 14px; font-weight: 700; margin: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.profile-phone { font-size: 12px; margin: 2px 0 0; opacity: 0.6; direction: ltr; text-align: right; }

.sidebar-brand {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 10px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.06);
  margin-bottom: 4px;
}

.brand-icon {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.12);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  flex-shrink: 0;
}

.brand-title { font-size: 15px; font-weight: 700; margin: 0; }
.brand-subtitle { font-size: 11px; margin: 0; opacity: 0.6; }

.sidebar-nav {
  display: flex;
  flex-direction: column;
  gap: 4px;
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding-left: 4px;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 11px 14px;
  border-radius: 10px;
  color: rgba(255, 255, 255, 0.75);
  text-decoration: none;
  font-size: 14px;
  transition: all 0.2s ease;
  position: relative;
}

.nav-item:hover { background: rgba(255, 255, 255, 0.08); color: #fff; }

.nav-item.router-link-active {
  background: rgba(255, 255, 255, 0.15);
  color: #fff;
  font-weight: 700;
}

.nav-item.router-link-active::before {
  content: '';
  position: absolute;
  right: 0;
  top: 50%;
  transform: translateY(-50%);
  width: 3px;
  height: 20px;
  background: #fff;
  border-radius: 4px;
}

.nav-icon { width: 20px; text-align: center; font-size: 15px; flex-shrink: 0; }

.sidebar-footer {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding-top: 12px;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  flex-shrink: 0;
}

.sidebar-btn {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 14px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.06);
  border: none;
  color: rgba(255, 255, 255, 0.75);
  font: inherit;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.sidebar-btn:hover { background: rgba(255, 255, 255, 0.12); color: #fff; }
.sidebar-btn-logout:hover { background: rgba(239, 68, 68, 0.2); color: #fca5a5; }

.broker-main {
  flex: 1;
  margin-right: var(--sidebar-width);
  min-width: 0;
  padding: 20px 24px;
  display: flex;
  flex-direction: column;
  position: relative;
  overflow: hidden;
}

.ambient-layer {
  position: absolute;
  inset: 0;
  pointer-events: none;
  overflow: hidden;
  z-index: 0;
}

.amb-orb {
  position: absolute;
  border-radius: 999px;
  filter: blur(6px);
  opacity: 0.45;
  animation: orbDrift 18s ease-in-out infinite alternate;
}

.orb-1 {
  width: 280px;
  height: 280px;
  top: -90px;
  left: 8%;
  background: radial-gradient(circle, rgba(219, 0, 0, 0.2) 0%, transparent 72%);
}

.orb-2 {
  width: 340px;
  height: 340px;
  top: 24%;
  left: 66%;
  background: radial-gradient(circle, rgba(138, 0, 0, 0.16) 0%, transparent 74%);
  animation-duration: 22s;
  animation-delay: -5s;
}

.orb-3 {
  width: 240px;
  height: 240px;
  bottom: -60px;
  left: 42%;
  background: radial-gradient(circle, rgba(212, 160, 23, 0.14) 0%, transparent 74%);
  animation-duration: 20s;
  animation-delay: -8s;
}

.orb-4 {
  width: 200px;
  height: 200px;
  top: 54%;
  left: 5%;
  background: radial-gradient(circle, rgba(255, 80, 80, 0.12) 0%, transparent 70%);
  animation-duration: 24s;
  animation-delay: -12s;
}

.orb-5 {
  width: 180px;
  height: 180px;
  top: 12%;
  left: 44%;
  background: radial-gradient(circle, rgba(168, 85, 247, 0.1) 0%, transparent 72%);
  animation-duration: 26s;
  animation-delay: -3s;
}

.amb-shape {
  position: absolute;
  opacity: 0.12;
  animation: shapeDrift 28s linear infinite;
}

.shape-hex {
  width: 46px;
  height: 46px;
  top: 10%;
  left: 24%;
  background: var(--brand-primary);
  clip-path: polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%);
  animation-duration: 32s;
}

.shape-diamond {
  width: 32px;
  height: 32px;
  top: 56%;
  left: 80%;
  background: var(--brand-accent);
  clip-path: polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%);
  animation-duration: 26s;
  animation-delay: -4s;
}

.shape-ring {
  width: 56px;
  height: 56px;
  top: 34%;
  left: 12%;
  border: 2.5px solid rgba(219, 0, 0, 0.18);
  border-radius: 999px;
  animation-duration: 35s;
  animation-delay: -10s;
}

.shape-square {
  width: 28px;
  height: 28px;
  top: 70%;
  left: 54%;
  background: rgba(138, 0, 0, 0.16);
  border-radius: 6px;
  animation-duration: 30s;
  animation-delay: -7s;
}

.shape-circle {
  width: 22px;
  height: 22px;
  top: 18%;
  left: 74%;
  background: rgba(212, 160, 23, 0.18);
  border-radius: 999px;
  animation-duration: 24s;
  animation-delay: -2s;
}

.shape-cross {
  width: 30px;
  height: 30px;
  top: 80%;
  left: 20%;
  background: rgba(255, 80, 80, 0.14);
  clip-path: polygon(35% 0%, 65% 0%, 65% 35%, 100% 35%, 100% 65%, 65% 65%, 65% 100%, 35% 100%, 35% 65%, 0% 65%, 0% 35%, 35% 35%);
  animation-duration: 28s;
  animation-delay: -15s;
}

.amb-dot {
  position: absolute;
  border-radius: 999px;
  background: var(--brand-primary);
  opacity: 0.16;
  animation: dotRise linear infinite;
}

.dot-1 { width: 5px; height: 5px; left: 12%; bottom: -10px; animation-duration: 18s; }
.dot-2 { width: 4px; height: 4px; left: 27%; bottom: -10px; animation-duration: 22s; animation-delay: -3s; }
.dot-3 { width: 6px; height: 6px; left: 42%; bottom: -10px; animation-duration: 20s; animation-delay: -7s; }
.dot-4 { width: 3px; height: 3px; left: 57%; bottom: -10px; animation-duration: 24s; animation-delay: -1s; }
.dot-5 { width: 5px; height: 5px; left: 72%; bottom: -10px; animation-duration: 19s; animation-delay: -10s; }
.dot-6 { width: 4px; height: 4px; left: 87%; bottom: -10px; animation-duration: 21s; animation-delay: -5s; }
.dot-7 { width: 3px; height: 3px; left: 35%; bottom: -10px; animation-duration: 26s; animation-delay: -14s; opacity: 0.1; }
.dot-8 { width: 5px; height: 5px; left: 64%; bottom: -10px; animation-duration: 23s; animation-delay: -9s; opacity: 0.12; }

.amb-grid {
  position: absolute;
  inset: 0;
  opacity: 0.025;
  background-image:
    linear-gradient(var(--brand-primary) 1px, transparent 1px),
    linear-gradient(90deg, var(--brand-primary) 1px, transparent 1px);
  background-size: 60px 60px;
  animation: gridShift 40s linear infinite;
}

.broker-topbar {
  background: var(--surface-color);
  border: 1px solid var(--panel-border);
  border-radius: 14px;
  padding: 14px 20px;
  display: flex;
  align-items: center;
  gap: 16px;
  justify-content: space-between;
  box-shadow: var(--panel-shadow);
  margin-bottom: 20px;
  position: relative;
  z-index: 1;
  backdrop-filter: blur(10px);
}

.topbar-menu-btn {
  display: none;
  background: none;
  border: 1px solid var(--panel-border);
  border-radius: 10px;
  width: 40px;
  height: 40px;
  color: var(--brand-text);
  font-size: 16px;
  cursor: pointer;
  align-items: center;
  justify-content: center;
}

.topbar-info {
  flex: 1;
  min-width: 0;
}

.topbar-breadcrumbs {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  margin-top: 6px;
  font-size: 12px;
  min-width: 0;
}

.breadcrumb-link,
.breadcrumb-current,
.breadcrumb-separator {
  color: var(--muted-text);
}

.breadcrumb-link {
  text-decoration: none;
}

.breadcrumb-link:hover {
  color: var(--brand-primary);
}

.breadcrumb-current {
  color: var(--brand-text);
  font-weight: 700;
}

.topbar-title {
  font-size: 17px;
  font-weight: 700;
  margin: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.topbar-badge {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  border-radius: 999px;
  background: var(--chip-bg);
  color: var(--chip-text);
  font-size: 13px;
  font-weight: 700;
  white-space: nowrap;
}

.broker-content { flex: 1; position: relative; z-index: 1; }

.sidebar-backdrop { display: none; }

@keyframes orbDrift {
  0% { transform: translate3d(0, 0, 0) scale(1); }
  25% { transform: translate3d(18px, -12px, 0) scale(1.04); }
  50% { transform: translate3d(-10px, 22px, 0) scale(1.08); }
  75% { transform: translate3d(14px, 8px, 0) scale(0.97); }
  100% { transform: translate3d(0, 0, 0) scale(1); }
}

@keyframes shapeDrift {
  0% { transform: translate(0, 0) rotate(0deg) scale(1); opacity: 0.12; }
  25% { transform: translate(30px, -20px) rotate(45deg) scale(1.08); opacity: 0.16; }
  50% { transform: translate(-15px, 35px) rotate(120deg) scale(0.92); opacity: 0.1; }
  75% { transform: translate(20px, 10px) rotate(220deg) scale(1.04); opacity: 0.14; }
  100% { transform: translate(0, 0) rotate(360deg) scale(1); opacity: 0.12; }
}

@keyframes dotRise {
  0% { transform: translateY(0) translateX(0); opacity: 0; }
  10% { opacity: 0.16; }
  90% { opacity: 0.16; }
  100% { transform: translateY(-110vh) translateX(30px); opacity: 0; }
}

@keyframes gridShift {
  0% { transform: translate(0, 0); }
  100% { transform: translate(60px, 60px); }
}

@media (max-width: 991px) {
  .broker-sidebar { transform: translateX(100%); }
  .broker-sidebar.open { transform: translateX(0); }
  .sidebar-backdrop {
    display: block;
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.4);
    z-index: 999;
  }
  .broker-main { margin-right: 0; padding: 16px; }
  .topbar-menu-btn { display: flex; }
  .broker-topbar {
    padding: 14px 14px;
    flex-wrap: wrap;
    align-items: flex-start;
  }

  .topbar-actions {
    margin-inline-start: auto;
  }
}

@media (max-width: 767px) {
  .notification-mini-stats {
    grid-template-columns: 1fr;
  }

  .notification-drawer {
    width: 100vw;
  }

  .topbar-actions {
    width: 100%;
    justify-content: space-between;
  }

  .broker-topbar {
    gap: 12px;
  }

  .topbar-info {
    width: calc(100% - 52px);
  }

  .topbar-title {
    font-size: 15px;
    white-space: normal;
    line-height: 1.6;
  }

  .topbar-breadcrumbs {
    display: flex;
    flex-wrap: nowrap;
    overflow-x: auto;
    white-space: nowrap;
    padding-bottom: 2px;
    scrollbar-width: none;
  }

  .topbar-breadcrumbs::-webkit-scrollbar {
    display: none;
  }

  .breadcrumb-link,
  .breadcrumb-current {
    flex: 0 0 auto;
  }

  .topbar-badge {
    min-height: 38px;
    padding: 8px 12px;
    font-size: 12px;
  }
}
</style>
