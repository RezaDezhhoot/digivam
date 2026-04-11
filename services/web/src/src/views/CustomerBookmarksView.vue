<script setup>
import { computed, onMounted, ref } from 'vue';
import { RouterLink } from 'vue-router';
import CustomerPanelShell from '../components/CustomerPanelShell.vue';
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
            <strong>{{ formatNumber(bm.minAmount / 1000000) }} تا {{ formatNumber(bm.maxAmount / 1000000) }} میلیون تومان</strong>
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

<style scoped>
.customer-bookmarks {
  padding-top: 18px;
  padding-bottom: 40px;
}

.customer-loading-card {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  min-height: 180px;
  padding: 28px 20px;
  border-radius: 22px;
  background: linear-gradient(180deg, var(--web-surface) 0%, var(--web-surface-soft) 100%);
  border: 1px solid var(--web-border);
}

.customer-spinner {
  width: 22px;
  height: 22px;
  border-radius: 999px;
  border: 3px solid rgba(0, 0, 0, 0.08);
  border-top-color: var(--web-primary);
  animation: bookmark-spin 0.85s linear infinite;
}

.customer-hero-card {
  display: flex;
  align-items: stretch;
  justify-content: space-between;
  gap: 18px;
  padding: 26px;
  border-radius: 28px;
  background:
    radial-gradient(circle at top left, rgba(211, 90, 90, 0.12), transparent 28%),
    linear-gradient(180deg, var(--web-surface) 0%, var(--web-surface-soft) 100%);
  border: 1px solid var(--web-border);
  box-shadow: var(--web-shadow);
}

.customer-hero-copy {
  max-width: 620px;
}

.customer-hero-kicker {
  display: inline-flex;
  align-items: center;
  min-height: 34px;
  padding: 0 14px;
  border-radius: 999px;
  background: var(--web-primary-soft);
  color: var(--web-primary);
  font-size: 12px;
  font-weight: 800;
}

.customer-hero-card h1 {
  margin: 14px 0 8px;
  font-size: 34px;
  font-weight: 900;
}

.customer-hero-card p {
  margin: 0;
  color: var(--web-muted);
  line-height: 1.9;
}

.customer-hero-side {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 14px;
}

.bookmark-summary-card {
  min-width: 168px;
  padding: 18px 20px;
  border-radius: 22px;
  background: linear-gradient(135deg, rgba(211, 90, 90, 0.12) 0%, rgba(193, 18, 18, 0.04) 100%);
  border: 1px solid rgba(193, 18, 18, 0.16);
  text-align: center;
}

.bookmark-summary-card span {
  display: block;
  font-size: 12px;
  color: var(--web-muted);
}

.bookmark-summary-card strong {
  display: block;
  margin-top: 8px;
  font-size: 30px;
  color: var(--web-primary);
}

.customer-hero-actions {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.customer-hero-link {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 42px;
  padding: 0 16px;
  border-radius: 14px;
  background: linear-gradient(135deg, var(--web-primary) 0%, #c11212 100%);
  color: #fff;
  font-size: 13px;
  font-weight: 800;
}

.customer-hero-link.muted {
  background: var(--web-surface);
  border: 1px solid var(--web-border);
  color: var(--web-text);
}

.bookmarks-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 14px;
  margin-top: 18px;
}

.bookmark-card {
  padding: 18px;
  border-radius: 22px;
  background: linear-gradient(180deg, var(--web-surface) 0%, var(--web-surface-soft) 100%);
  border: 1px solid var(--web-border);
  display: flex;
  flex-direction: column;
  gap: 12px;
  box-shadow: var(--web-shadow);
}

.bookmark-card-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.bookmark-card-badge {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-height: 32px;
  padding: 0 12px;
  border-radius: 999px;
  background: #fef3c7;
  color: #92400e;
  font-size: 11px;
  font-weight: 800;
}

.bookmark-card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
}

.bookmark-card-title-wrap {
  min-width: 0;
}

.bookmark-card-header h3 {
  margin: 0;
  font-size: 18px;
  font-weight: 800;
}

.bookmark-card-institution {
  display: inline-block;
  margin-top: 4px;
  font-size: 12px;
  color: var(--web-primary);
  font-weight: 700;
}

.bookmark-date-chip {
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  min-height: 30px;
  padding: 0 10px;
  border-radius: 999px;
  background: var(--web-surface-soft);
  color: var(--web-muted);
  font-size: 11px;
  font-weight: 700;
}

.bookmark-remove-btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-height: 34px;
  padding: 0 12px;
  background: #fff1f2;
  border: 1px solid #fecdd3;
  border-radius: 12px;
  color: #be123c;
  cursor: pointer;
  transition: all 0.15s;
  font-weight: 800;
  font-size: 12px;
}

.bookmark-remove-btn i {
  font-size: 14px;
}

.bookmark-remove-btn:hover {
  color: #e11d48;
  border-color: #fda4af;
}

.bookmark-remove-btn:disabled {
  opacity: 0.7;
  cursor: wait;
}

.bookmark-card-range {
  padding: 14px 16px;
  border-radius: 16px;
  background: rgba(155, 0, 0, 0.05);
  border: 1px solid var(--web-border);
}

.bookmark-card-range-label {
  display: block;
  font-size: 11px;
  color: var(--web-muted);
  margin-bottom: 6px;
}

.bookmark-card-range strong {
  font-size: 15px;
  line-height: 1.7;
}

.bookmark-card-meta-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.bookmark-meta-item {
  padding: 12px 14px;
  border-radius: 15px;
  background: var(--web-surface-soft);
  border: 1px solid var(--web-border);
}

.bookmark-meta-item span {
  display: block;
  font-size: 11px;
  color: var(--web-muted);
  margin-bottom: 6px;
}

.bookmark-meta-item strong {
  font-size: 13px;
  line-height: 1.6;
}

.bookmark-card-actions {
  display: flex;
  gap: 8px;
  margin-top: auto;
}

.bookmark-card-action {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: 1 1 0;
  min-height: 42px;
  padding: 0 14px;
  border-radius: 14px;
  background: linear-gradient(135deg, var(--web-primary) 0%, #c11212 100%);
  color: #fff;
  font-size: 12px;
  font-weight: 800;
}

.bookmark-card-action.secondary {
  background: var(--web-surface);
  border: 1px solid var(--web-border);
  color: var(--web-text);
}

.bookmarks-pagination {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 14px;
  margin-top: 22px;
}

.bookmarks-pagination button {
  padding: 8px 16px;
  border-radius: 12px;
  border: 1px solid var(--web-border);
  background: var(--web-surface);
  cursor: pointer;
  font-weight: 700;
  font-size: 12px;
}

.bookmarks-pagination button:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.customer-empty-card {
  text-align: center;
  padding: 36px 20px;
  margin-top: 18px;
  border-radius: 22px;
  background: linear-gradient(180deg, var(--web-surface) 0%, var(--web-surface-soft) 100%);
  border: 1px solid var(--web-border);
  box-shadow: var(--web-shadow);
}

.customer-empty-card i {
  font-size: 36px;
  color: var(--web-muted);
  margin-bottom: 12px;
}

.customer-empty-card p {
  color: var(--web-muted);
  margin-bottom: 16px;
}

@keyframes bookmark-spin {
  to {
    transform: rotate(360deg);
  }
}

@media (max-width: 767px) {
  .customer-hero-card,
  .customer-hero-side,
  .bookmark-card-actions {
    flex-direction: column;
    align-items: stretch;
  }

  .bookmarks-grid {
    grid-template-columns: 1fr;
  }

  .bookmark-card-meta-grid {
    grid-template-columns: 1fr;
  }

  .bookmark-card-top,
  .bookmark-card-header {
    flex-direction: column;
    align-items: stretch;
  }

  .bookmark-date-chip {
    width: fit-content;
  }
}
</style>
