<script setup>
import { computed, onMounted, onUnmounted, ref, watch } from 'vue';
import LoanDiscoveryFilters from '../components/LoanDiscoveryFilters.vue';
import LoanOfferCard from '../components/LoanOfferCard.vue';
import {
  buildLoanDiscoveryParams,
  buildLoanFilterSummary,
  countActiveLoanFilters,
  createLoanDiscoveryFilters,
  creditOptions,
  quickFilterOptions
} from '../composables/useLoanDiscovery.js';
import { getWebFacilities } from '../services/web-loan.api.js';
import { applySeo, resetSeo } from '../utils/seo.js';
import { useSiteConfig } from '../composables/useSiteConfig.js';

const { setSiteConfig } = useSiteConfig();

const LIMIT = 12;

const loading = ref(true);
const loadingMore = ref(false);
const errorText = ref('');
const items = ref([]);
const categories = ref(['همه وام ها']);
const guarantees = ref(['همه']);
const amountBounds = ref({ min: 10, max: 120 });
const filters = ref(createLoanDiscoveryFilters());
const filtersReady = ref(false);
const page = ref(1);
const total = ref(0);
const hasMore = ref(false);
const mobileFiltersOpen = ref(false);
const summary = ref({ publishedFacilities: 0, totalRequests: 0, averageRating: 0 });

const formatNumber = (value) => new Intl.NumberFormat('fa-IR').format(Number(value || 0));
const formatRating = (value) => new Intl.NumberFormat('fa-IR', { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(Number(value || 0));

const marketStats = computed(() => [
  { label: 'فرصت فعال', value: `+${formatNumber(summary.value.publishedFacilities)}` },
  { label: 'درخواست ثبت شده', value: `+${formatNumber(summary.value.totalRequests)}` },
  { label: 'میانگین امتیاز', value: formatRating(summary.value.averageRating) }
]);

const filterSummaryText = computed(() => buildLoanFilterSummary(filters.value, amountBounds.value));
const activeFilterCount = computed(() => countActiveLoanFilters(filters.value, amountBounds.value));

const syncBodyScrollLock = (locked) => {
  document.documentElement.style.overflow = locked ? 'hidden' : '';
  document.body.style.overflow = locked ? 'hidden' : '';
  document.body.style.touchAction = locked ? 'none' : '';
};

const syncDesktopState = () => {
  if (window.innerWidth >= 992) {
    mobileFiltersOpen.value = false;
  }
};

const applyMarketSeo = (payload) => {
  applySeo({
    title: payload.seo?.title || payload.site?.marketSeo?.title || payload.site?.defaultSeo?.title,
    description: payload.seo?.description || payload.site?.marketSeo?.description || payload.site?.siteDescription,
    keywords: payload.seo?.keywords || payload.site?.marketSeo?.keywords || payload.site?.defaultSeo?.keywords,
    url: `${window.location.origin}/market`,
    image: payload.site?.siteLogoUrl || '',
    favicon: payload.site?.faviconUrl || payload.site?.siteLogoUrl || '',
    siteName: payload.site?.siteName || 'دی جی وام',
    type: 'website'
  });
};

const load = async ({ append = false } = {}) => {
  const targetPage = append ? page.value + 1 : 1;

  if (append) {
    loadingMore.value = true;
  } else {
    loading.value = true;
    errorText.value = '';
  }

  try {
    const data = await getWebFacilities({
      ...buildLoanDiscoveryParams(filters.value, amountBounds.value),
      page: targetPage,
      limit: LIMIT
    });

    categories.value = ['همه وام ها', ...(data.categories || [])];
    guarantees.value = ['همه', ...(data.guarantees || [])];
    summary.value = data.summary || summary.value;
    total.value = Number(data.total || 0);
    hasMore.value = Boolean(data.hasMore);
    page.value = Number(data.page || targetPage);
    items.value = append ? [...items.value, ...(data.items || [])] : (data.items || []);
    applyMarketSeo(data);
    setSiteConfig(data.site);

    if (!filtersReady.value) {
      amountBounds.value = data.amountBounds || amountBounds.value;
      filters.value = createLoanDiscoveryFilters(amountBounds.value, { search: filters.value.search });
      filtersReady.value = true;
    }

    if (!append) {
      mobileFiltersOpen.value = false;
    }
  } catch (error) {
    errorText.value = error.message;
  } finally {
    loading.value = false;
    loadingMore.value = false;
  }
};

let filterDebounce = null;
const scheduleReload = () => {
  clearTimeout(filterDebounce);
  filterDebounce = setTimeout(() => load(), 280);
};

const updateFilters = (nextFilters) => {
  filters.value = nextFilters;
  scheduleReload();
};

const resetFilters = () => {
  filters.value = createLoanDiscoveryFilters(amountBounds.value);
  load();
};

const handleScroll = () => {
  if (loading.value || loadingMore.value || !hasMore.value) return;
  const scrollBottom = window.innerHeight + window.scrollY;
  const docHeight = document.documentElement.scrollHeight;
  if (scrollBottom >= docHeight - 320) {
    load({ append: true });
  }
};

onMounted(() => {
  window.addEventListener('resize', syncDesktopState);
  window.addEventListener('scroll', handleScroll, { passive: true });
  load();
});

onUnmounted(() => {
  window.removeEventListener('resize', syncDesktopState);
  window.removeEventListener('scroll', handleScroll);
  clearTimeout(filterDebounce);
  syncBodyScrollLock(false);
  resetSeo();
});

watch(mobileFiltersOpen, (value) => {
  syncBodyScrollLock(value && window.innerWidth < 992);
});
</script>

<template>
  <section class="loan-market-view">
    <button type="button" class="market-filter-overlay" :class="{ open: mobileFiltersOpen }" aria-label="بستن فیلترها" @click="mobileFiltersOpen = false"></button>

    <div class="market-page-backdrop" aria-hidden="true">
      <span class="market-orb market-orb-1"></span>
      <span class="market-orb market-orb-2"></span>
      <span class="market-grid"></span>
    </div>

    <section class="market-hero">
      <div class="market-hero-copy">
        <span class="market-kicker">بازار کامل امتیاز وام</span>
        <h1>همه فرصت‌های منتشرشده، حالا با همان فیلترهای صفحه اصلی</h1>
        <p>صفحه market به یک فضای کامل اکتشاف تبدیل شده است: جستجو، فیلترهای مبلغ و ضمانت، اعتبارسنجی، مرتب‌سازی سریع و پیمایش پیوسته در یک ساختار واحد.</p>

        <div class="market-hero-stats">
          <article v-for="item in marketStats" :key="item.label" class="market-hero-stat">
            <strong>{{ item.value }}</strong>
            <span>{{ item.label }}</span>
          </article>
        </div>
      </div>

      <div class="market-hero-panel">
        <div class="market-hero-panel-top">
          <strong>{{ formatNumber(total) }} نتیجه</strong>
          <span>{{ formatNumber(activeFilterCount) }} فیلتر فعال</span>
        </div>
        <p>{{ filterSummaryText }}</p>
        <button type="button" class="market-open-filters d-lg-none" @click="mobileFiltersOpen = true">نمایش فیلترها</button>
      </div>
    </section>

    <div class="market-layout">
      <aside class="market-sidebar" :class="{ open: mobileFiltersOpen }">
        <LoanDiscoveryFilters
          :model-value="filters"
          title="فیلترهای بازار"
          subtitle="همان فیلترهای قدرتمند home حالا روی کل بازار و اسکرول بی‌نهایت اعمال می‌شوند."
          :categories="categories"
          :guarantee-options="guarantees"
          :credit-options="creditOptions"
          :quick-filter-options="quickFilterOptions"
          :amount-bounds="amountBounds"
          show-search
          compact
          :show-close="mobileFiltersOpen"
          @update:model-value="updateFilters"
          @close="mobileFiltersOpen = false"
          @reset="resetFilters"
        />
      </aside>

      <div class="market-main">
        <div class="market-toolbar">
          <div>
            <strong>{{ formatNumber(total) }} فرصت تاییدشده</strong>
            <span>{{ filterSummaryText }}</span>
          </div>
          <span class="market-toolbar-chip">نتایج با اسکرول خودکار ادامه پیدا می‌کنند</span>
        </div>

        <div v-if="loading" class="market-status-card"><span class="web-spinner"></span> در حال بارگذاری فرصت‌های بازار...</div>
        <div v-else-if="errorText" class="market-status-card error">{{ errorText }}</div>
        <div v-else-if="!items.length" class="market-status-card">موردی برای این ترکیب فیلتر پیدا نشد.</div>

        <template v-else>
          <div class="market-page-grid">
            <LoanOfferCard v-for="item in items" :key="item.slug" :item="item" compact />
          </div>

          <div v-if="loadingMore" class="market-status-card mt-3"><span class="web-spinner"></span> در حال بارگذاری بیشتر...</div>
          <div v-else-if="!hasMore && items.length >= LIMIT" class="market-end-marker">تمام موارد نمایش داده شد</div>
        </template>
      </div>
    </div>
  </section>
</template>

<style scoped src="./styles/LoanMarketView.css"></style>