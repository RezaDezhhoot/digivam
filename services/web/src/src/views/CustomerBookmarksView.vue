<script setup>
import { computed, onMounted, ref } from 'vue';
import { RouterLink } from 'vue-router';
import CustomerPanelShell from '../components/CustomerPanelShell.vue';
import { humanizeAmount } from '../utils/amount.js';
import { getMyBookmarks, toggleBookmark } from '../services/customer-panel.api.js';

const loading = ref(true);
const errorText = ref('');
const items = ref([]);
const page = ref(1);
const totalPages = ref(1);
const removingId = ref(null);

const formatNumber = (value) => new Intl.NumberFormat('fa-IR').format(Number(value || 0));
const formatDate = (value) => (value ? new Date(value).toLocaleString('fa-IR') : '-');
const totalBookmarksText = computed(() => formatNumber(items.value.length));
const shellStats = computed(() => [
  { label: 'کل نشان‌شده‌ها', value: totalBookmarksText.value },
  { label: 'صفحه فعلی', value: formatNumber(page.value) },
  { label: 'کل صفحات', value: formatNumber(totalPages.value) }
]);

const load = async () => {
  loading.value = true;
  errorText.value = '';
  try {
    const data = await getMyBookmarks({ page: page.value, limit: 12 });
    items.value = data.items || [];
    totalPages.value = data.totalPages || 1;
  } catch (error) {
    errorText.value = error.message;
  } finally {
    loading.value = false;
  }
};

const handleRemoveBookmark = async (facilityId, index) => {
  try {
    removingId.value = facilityId;
    await toggleBookmark(facilityId);
    items.value.splice(index, 1);
  } catch { /* ignore */ }
  finally {
    removingId.value = null;
  }
};

const goToPage = (p) => {
  if (p < 1 || p > totalPages.value) return;
  page.value = p;
  load();
};

onMounted(load);
</script>

<template>
  <section class="customer-bookmarks">
    <div v-if="loading" class="customer-loading-card">
      <div class="customer-spinner"></div>
      <span>در حال بارگذاری نشان‌شده‌ها...</span>
    </div>
    <div v-else-if="errorText" class="customer-loading-card text-danger">{{ errorText }}</div>

    <template v-else>
      <CustomerPanelShell
        kicker="مدیریت ذخیره‌ها"
        title="نشان‌شده‌ها"
        description="امتیازهای وامی که ذخیره کرده‌اید در اینجا نمایش داده می‌شود و از همین بخش می‌توانید آن‌ها را مدیریت یا حذف کنید."
        :stats="shellStats"
      >
      <div v-if="!items.length" class="customer-empty-card">
        <i class="fa-solid fa-bookmark"></i>
        <p>هنوز امتیازی را نشان نکرده‌اید.</p>
        <RouterLink class="customer-hero-link" to="/market">مشاهده بازار وام</RouterLink>
      </div>

      <div v-else class="bookmarks-grid">
        <article v-for="(bm, index) in items" :key="bm.bookmarkId || bm.id" class="bookmark-card">
          <div class="bookmark-card-top">
            <div class="bookmark-card-badge">
              <i class="fa-solid fa-bookmark"></i>
              <span>ذخیره شده</span>
            </div>
            <button
              type="button"
              class="bookmark-remove-btn"
              title="حذف نشان"
              :disabled="removingId === bm.id"
              @click="handleRemoveBookmark(bm.id, index)"
            >
              <i class="fa-solid fa-trash-can"></i>
              <span>{{ removingId === bm.id ? 'در حال حذف...' : 'حذف نشان' }}</span>
            </button>
          </div>

          <div class="bookmark-card-header">
            <div class="bookmark-card-title-wrap">
              <h3>{{ bm.title }}</h3>
              <span class="bookmark-card-institution">{{ bm.brokerName }}</span>
            </div>
            <span class="bookmark-date-chip">{{ formatDate(bm.bookmarkedAt) }}</span>
          </div>

          <div class="bookmark-card-range">
            <span class="bookmark-card-range-label">محدوده مبلغ</span>
            <strong>{{ humanizeAmount(bm.minAmount) }} تا {{ humanizeAmount(bm.maxAmount) }} تومان</strong>
          </div>

          <div class="bookmark-card-meta-grid">
            <div class="bookmark-meta-item">
              <span>وضعیت</span>
              <strong>{{ bm.status || '-' }}</strong>
            </div>
            <div class="bookmark-meta-item">
              <span>تاریخ ذخیره</span>
              <strong>{{ formatDate(bm.bookmarkedAt) }}</strong>
            </div>
          </div>

          <div class="bookmark-card-actions">
            <RouterLink class="bookmark-card-action secondary" :to="`/market/${bm.slug}`">مشاهده جزئیات</RouterLink>
            <RouterLink class="bookmark-card-action" :to="`/market/${bm.slug}`">ثبت درخواست</RouterLink>
          </div>
        </article>
      </div>

      <div v-if="totalPages > 1" class="bookmarks-pagination">
        <button :disabled="page <= 1" @click="goToPage(page - 1)">قبلی</button>
        <span>{{ formatNumber(page) }} / {{ formatNumber(totalPages) }}</span>
        <button :disabled="page >= totalPages" @click="goToPage(page + 1)">بعدی</button>
      </div>
      </CustomerPanelShell>
    </template>
  </section>
</template>

<style scoped src="./styles/CustomerBookmarksView.css"></style>
