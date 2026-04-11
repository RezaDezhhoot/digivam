<script setup>
import { computed, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import { openCustomerAuthModal, useCustomerSession } from '../composables/useCustomerSession.js';
import { getBookmarkStatus, toggleBookmark } from '../services/customer-panel.api.js';

const props = defineProps({
  item: {
    type: Object,
    required: true
  },
  compact: {
    type: Boolean,
    default: false
  }
});

const route = useRoute();
const { isAuthenticated } = useCustomerSession();

const formatNumber = (value) => new Intl.NumberFormat('fa-IR').format(Number(value || 0));
const formatRating = (value) => new Intl.NumberFormat('fa-IR', { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(Number(value || 0));

const facilityId = computed(() => Number(props.item?.id || props.item?.facilityId || 0) || null);
const bookmarked = ref(false);
const bookmarkBusy = ref(false);
const bookmarkCount = ref(Number(props.item?.bookmarkCount || 0));

const syncBookmarkStatus = async (nextFacilityId) => {
  if (!nextFacilityId || !isAuthenticated.value) {
    bookmarked.value = false;
    return;
  }

  try {
    const data = await getBookmarkStatus(nextFacilityId);
    bookmarked.value = Boolean(data?.bookmarked);
  } catch {
    bookmarked.value = false;
  }
};

const handleToggleBookmark = async () => {
  if (!facilityId.value || bookmarkBusy.value) {
    return;
  }

  if (!isAuthenticated.value) {
    openCustomerAuthModal({ redirectTo: route.fullPath });
    return;
  }

  bookmarkBusy.value = true;

  try {
    const response = await toggleBookmark(facilityId.value);
    const nextBookmarked = typeof response?.bookmarked === 'boolean' ? response.bookmarked : !bookmarked.value;
    bookmarked.value = nextBookmarked;
    bookmarkCount.value = typeof response?.bookmarkCount === 'number'
      ? Number(response.bookmarkCount || 0)
      : Math.max(0, bookmarkCount.value + (nextBookmarked ? 1 : -1));
  } catch {
    // noop
  } finally {
    bookmarkBusy.value = false;
  }
};

watch(
  [facilityId, () => isAuthenticated.value],
  ([nextFacilityId]) => {
    bookmarkCount.value = Number(props.item?.bookmarkCount || 0);
    syncBookmarkStatus(nextFacilityId);
  },
  { immediate: true }
);

watch(
  () => props.item?.bookmarkCount,
  (nextValue) => {
    if (!bookmarkBusy.value) {
      bookmarkCount.value = Number(nextValue || 0);
    }
  }
);
</script>

<template>
  <article class="loan-card" :class="{ compact }">
    <div class="loan-card-topline">
      <div class="loan-card-brand-block">
        <div class="loan-card-brand-mark">{{ String(item.institutionName || '?').slice(0, 1) }}</div>
        <div>
          <div class="loan-card-institution">{{ item.institutionName }}</div>
          <h3 class="loan-card-title">{{ item.title }}</h3>
        </div>
      </div>

      <div class="loan-card-head-side">
        <button
          type="button"
          class="loan-card-bookmark-btn"
          :class="{ active: bookmarked }"
          :disabled="bookmarkBusy"
          @click="handleToggleBookmark"
        >
          <i class="fa-solid fa-bookmark"></i>
          {{ bookmarkBusy ? '...' : bookmarked ? 'نشان شده' : 'نشان' }}
        </button>

        <div class="loan-card-head-rating-box">
          <span>امتیاز کارگزار</span>
          <strong>★ {{ formatRating(item.rating) }}</strong>
        </div>
      </div>
    </div>

    <p class="loan-card-description">{{ item.description }}</p>

    <div class="loan-card-meta-band">
      <div class="loan-card-meta-pill">
        <span>درخواست‌ها</span>
        <strong>{{ formatNumber(item.requestCount) }}</strong>
      </div>
      
      <div class="loan-card-meta-pill">
        <span>پاسخ‌دهی</span>
        <strong>{{ formatNumber(item.averageReviewHours) }} ساعت</strong>
      </div>
    </div>

    <div class="loan-card-tags">
      <span class="loan-card-caption">نوع وام های قابل ارائه</span>
      <div class="loan-card-type-list">
        <span v-for="tag in item.tags" :key="tag" class="loan-card-type-chip">{{ tag }}</span>
      </div>
    </div>

    <div v-if="item.requiredDocuments?.length" class="loan-card-documents-box">
      <span class="loan-card-caption">مدارک مورد نیاز</span>
      <div class="loan-card-type-list">
        <span v-for="doc in item.requiredDocuments" :key="doc.id" class="loan-card-type-chip loan-card-type-chip-secondary">{{ doc.title }}</span>
      </div>
    </div>

    <div class="loan-spec-grid">
      <div class="loan-spec-item">
        <span>محدوده مبلغ</span>
        <strong>{{ formatNumber(item.minAmount / 1000000) }} - {{ formatNumber(item.maxAmount / 1000000) }} میلیون</strong>
      </div>
      <div class="loan-spec-item">
        <span>نرخ سود پیشنهادی</span>
        <strong>%{{ item.rateOptions?.[0] ?? 0 }}-%{{ item.rateOptions?.[item.rateOptions.length - 1] ?? 0 }}</strong>
      </div>
      <div class="loan-spec-item">
        <span>دوره بازپرداخت</span>
        <strong>
          {{ item.installmentOptions?.[0] ?? 0 }}
          <template v-if="item.installmentOptions?.length > 1"> الی {{ item.installmentOptions[item.installmentOptions.length - 1] }}</template>
          ماه
        </strong>
      </div>
      <div class="loan-spec-item">
        <span>متوسط زمان بررسی</span>
        <strong>{{ formatNumber(item.averageReviewHours) }} ساعت</strong>
      </div>
    </div>

    <div class="loan-card-footer">
      <div class="loan-guarantee-row">
        <span class="loan-card-caption">ضمانت مورد نیاز</span>
        <div class="loan-card-type-list">
          <span v-for="guarantee in item.guaranteeBadges" :key="guarantee" class="loan-card-type-chip loan-card-type-chip-secondary">{{ guarantee }}</span>
        </div>
      </div>

      <div class="loan-footnote-row">
        <span class="loan-footnote-chip">سود {{ item.rateOptions?.[0] ?? 0 }} تا {{ item.rateOptions?.[item.rateOptions.length - 1] ?? 0 }} درصد</span>
        <span class="loan-footnote-chip loan-footnote-chip-bookmark"><i class="fa-solid fa-bookmark"></i> {{ formatNumber(bookmarkCount) }} نشان‌شده</span>
        <span class="loan-footnote-chip" :class="item.validationRequired ? 'loan-footnote-chip-active' : 'loan-footnote-chip-muted'">
          {{ item.validationRequired ? 'نیاز به اعتبارسنجی دارد' : 'نیاز به اعتبارسنجی ندارد' }}
        </span>
      </div>
    </div>

    <router-link class="loan-card-action" :to="`/market/${item.slug}`">بررسی جزئیات و ثبت درخواست</router-link>
  </article>
</template>

<style scoped>
.loan-card {
  padding: 16px;
  border-radius: 20px;
  background: linear-gradient(180deg, var(--web-surface) 0%, var(--web-surface-soft) 100%);
  border: 1px solid var(--web-border);
  box-shadow: var(--web-shadow);
  display: flex;
  flex-direction: column;
  gap: 10px;
  height: 100%;
  transition: transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease;
}

.loan-card:hover {
  transform: translateY(-4px);
  box-shadow: var(--web-shadow-lg);
  border-color: var(--web-border-strong);
}

.loan-card.compact {
  padding: 14px;
}

.loan-card-topline,
.loan-card-brand-block,
.loan-card-head-side,
.loan-card-head-rating-box,
.loan-card-meta-band,
.loan-card-meta-pill,
.loan-card-footer {
  display: flex;
  align-items: flex-start;
  gap: 10px;
}

.loan-card-topline,
.loan-card-footer {
  justify-content: space-between;
}

.loan-card-footer {
  flex-direction: column;
  align-items: stretch;
  gap: 10px;
  margin-top: auto;
}

.loan-card-brand-block {
  min-width: 0;
}

.loan-card-head-side {
  flex-direction: column;
  align-items: flex-end;
  gap: 8px;
}

.loan-card-bookmark-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-height: 32px;
  padding: 0 10px;
  border-radius: 999px;
  border: 1px solid var(--web-border);
  background: var(--web-surface-soft);
  color: var(--web-muted);
  font-size: 10px;
  font-weight: 800;
}

.loan-card-bookmark-btn.active {
  background: #fef3c7;
  border-color: #f59e0b;
  color: #92400e;
}

.loan-card-bookmark-btn:disabled {
  opacity: 0.72;
  cursor: wait;
}

.loan-card-brand-mark {
  width: 36px;
  height: 36px;
  border-radius: 12px;
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, var(--web-primary) 0%, #d53a3a 100%);
  color: #fff;
  font-size: 15px;
  font-weight: 800;
  box-shadow: 0 16px 28px rgba(155, 0, 0, 0.18);
}

.loan-card-head-rating-box {
  flex-direction: column;
  min-width: 76px;
  padding: 7px 8px;
  border-radius: 12px;
  background: linear-gradient(180deg, #fff3cc 0%, #ffe8a3 100%);
  color: #815000;
}

.loan-card-head-rating-box span {
  font-size: 10px;
  font-weight: 700;
}

.loan-card-head-rating-box strong {
  font-size: 13px;
  line-height: 1;
}

.loan-card-tags,
.loan-card-documents-box,
.loan-guarantee-row {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 8px;
}

.loan-footnote-row {
  display: flex;
  align-items: flex-start;
  justify-content: flex-start;
  gap: 8px;
  flex-wrap: wrap;
}

.loan-card-caption {
  color: var(--web-muted);
  font-size: 11px;
  font-weight: 700;
  text-align: right;
}

.loan-card-type-list,
.loan-card-meta-band {
  display: flex;
  align-items: center;
  justify-content: flex-start;
  gap: 8px;
  flex-wrap: wrap;
}

.loan-card-institution {
  font-size: 10px;
  color: var(--web-primary);
  font-weight: 700;
  margin-bottom: 3px;
}

.loan-card-description {
  margin: -4px 0 0;
  color: var(--web-muted);
  font-size: 11px;
  line-height: 1.65;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.loan-card-meta-band {
  gap: 8px;
}

.loan-card-meta-pill {
  flex: 1 1 0;
  min-width: 96px;
  padding: 7px 9px;
  border-radius: 12px;
  background: rgba(155, 0, 0, 0.05);
  border: 1px solid var(--web-border);
  flex-direction: column;
}

.loan-card-meta-pill span {
  color: var(--web-muted);
  font-size: 10px;
}

.loan-card-meta-pill strong {
  margin-top: 4px;
  font-size: 12px;
}

.loan-card-type-chip,
.loan-footnote-chip {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 26px;
  padding: 0 9px;
  border-radius: 999px;
  font-size: 9px;
  font-weight: 700;
}

.loan-card-type-chip {
  background: var(--web-primary-soft);
  color: var(--web-primary);
}

.loan-card-type-chip-secondary {
  background: var(--web-surface-soft);
  color: var(--web-text);
}

.loan-card-title {
  margin: 0;
  font-size: 16px;
  line-height: 1.45;
  font-weight: 800;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.loan-spec-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 6px;
  margin-bottom: 4px;
}

.loan-spec-item {
  padding: 9px 8px;
  border-radius: 14px;
  background: var(--web-surface-soft);
  border: 1px solid var(--web-border);
}

.loan-spec-item span {
  display: block;
  color: var(--web-muted);
  font-size: 9px;
  margin-bottom: 4px;
}

.loan-spec-item strong {
  display: block;
  font-size: 11px;
  line-height: 1.45;
}

.loan-footnote-row {
  margin-top: 0;
}

.loan-footnote-chip {
  background: var(--web-surface-soft);
  color: var(--web-text);
  width: fit-content;
}

.loan-footnote-chip-active {
  background: #ecfdf5;
  color: #166534;
}

.loan-footnote-chip-muted {
  background: #eff6ff;
  color: #1d4ed8;
}

.loan-footnote-chip-bookmark {
  background: #fef3c7;
  color: #92400e;
  gap: 4px;
}

.loan-card-action {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  min-height: 40px;
  margin-top: auto;
  border-radius: 14px;
  background: linear-gradient(135deg, var(--web-primary) 0%, #c11212 100%);
  color: #fff;
  font-size: 12px;
  font-weight: 800;
  box-shadow: 0 18px 32px rgba(155, 0, 0, 0.18);
}

:global([data-theme='dark']) .loan-card-head-rating-box {
  background: linear-gradient(180deg, #4c3b14 0%, #614a17 100%);
  color: #ffe8a3;
}

:global([data-theme='dark']) .loan-card-meta-pill {
  background: rgba(255, 255, 255, 0.03);
}

@media (max-width: 767px) {
  .loan-card {
    padding: 12px;
    border-radius: 18px;
  }

  .loan-card.compact {
    padding: 12px;
  }

  .loan-card-title {
    font-size: 14px;
  }

  .loan-card-topline {
    gap: 8px;
    align-items: flex-start;
  }

  .loan-card-head-rating-box {
    min-width: 68px;
    padding: 6px 7px;
  }

  .loan-card-head-side {
    align-items: stretch;
  }

  .loan-card-bookmark-btn {
    justify-content: center;
  }

  .loan-card-meta-band {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .loan-card-meta-pill {
    min-width: 0;
  }

  .loan-spec-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .loan-card-description {
    -webkit-line-clamp: 2;
  }

  .loan-card-action {
    min-height: 38px;
    font-size: 11px;
  }
}
</style>