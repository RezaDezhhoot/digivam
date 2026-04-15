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

<style scoped src="./styles/LoanOfferCard.css"></style>