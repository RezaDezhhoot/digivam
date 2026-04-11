<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue';
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
  resetSeo();
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

<style scoped>
.loan-market-view {
  position: relative;
  padding: 6px 0 28px;
  overflow: visible;
}

.market-filter-overlay {
  position: fixed;
  inset: 0;
  border: none;
  background: rgba(15, 23, 42, 0.38);
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.18s ease;
  z-index: 70;
}

.market-filter-overlay.open {
  opacity: 1;
  pointer-events: auto;
}

.market-page-backdrop {
  position: absolute;
  inset: 0;
  overflow: hidden;
  pointer-events: none;
}

.market-orb {
  position: absolute;
  border-radius: 999px;
  filter: blur(10px);
  opacity: 0.45;
}

.market-orb-1 {
  width: 260px;
  height: 260px;
  top: -50px;
  right: -20px;
  background: radial-gradient(circle, rgba(155, 0, 0, 0.18) 0%, transparent 72%);
}

.market-orb-2 {
  width: 340px;
  height: 340px;
  bottom: 10%;
  left: -90px;
  background: radial-gradient(circle, rgba(214, 98, 98, 0.14) 0%, transparent 70%);
}

.market-grid {
  position: absolute;
  inset: 0;
  background-image:
    linear-gradient(rgba(155, 0, 0, 0.04) 1px, transparent 1px),
    linear-gradient(90deg, rgba(155, 0, 0, 0.04) 1px, transparent 1px);
  background-size: 56px 56px;
  mask-image: linear-gradient(180deg, rgba(0, 0, 0, 0.2), transparent 88%);
}

.market-hero {
  position: relative;
  z-index: 1;
  display: grid;
  grid-template-columns: minmax(0, 1.25fr) 320px;
  gap: 14px;
  padding: 22px;
  border-radius: 28px;
  border: 1px solid var(--web-border);
  background: linear-gradient(180deg, var(--web-surface) 0%, var(--web-surface-soft) 100%);
  box-shadow: var(--web-shadow);
  margin-bottom: 22px;
}

.market-kicker,
.market-toolbar-chip {
  display: inline-flex;
  align-items: center;
  min-height: 30px;
  padding: 0 12px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 800;
}

.market-kicker {
  background: rgba(193, 18, 18, 0.08);
  color: var(--web-primary);
}

.market-hero-copy h1 {
  margin: 12px 0 8px;
  font-size: 31px;
  line-height: 1.26;
  font-weight: 900;
}

.market-hero-copy p {
  margin: 0;
  color: var(--web-muted);
  line-height: 1.78;
  font-size: 13px;
}

.market-hero-stats {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
  margin-top: 14px;
}

.market-hero-stat,
.market-hero-panel,
.market-toolbar,
.market-status-card {
  border: 1px solid var(--web-border);
  background: linear-gradient(180deg, var(--web-surface) 0%, var(--web-surface-soft) 100%);
}

.market-hero-stat {
  min-height: 74px;
  padding: 12px;
  border-radius: 18px;
}

.market-hero-stat strong {
  display: block;
  font-size: 20px;
  font-weight: 900;
}

.market-hero-stat span {
  display: block;
  margin-top: 6px;
  font-size: 11px;
  color: var(--web-muted);
}

.market-hero-panel {
  display: grid;
  gap: 10px;
  align-content: start;
  padding: 15px;
  border-radius: 20px;
}

.market-hero-panel-top,
.market-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
}

.market-hero-panel-top strong {
  font-size: 18px;
  font-weight: 900;
}

.market-hero-panel-top span {
  min-height: 28px;
  padding: 0 10px;
  border-radius: 999px;
  background: rgba(193, 18, 18, 0.08);
  color: var(--web-primary);
  font-size: 10px;
  font-weight: 800;
}

.market-hero-panel p {
  margin: 0;
  color: var(--web-muted);
  line-height: 1.7;
  font-size: 12px;
}

.market-open-filters {
  min-height: 40px;
  padding: 0 14px;
  border-radius: 14px;
  border: 1px solid var(--web-border-strong);
  background: var(--web-primary-soft);
  color: var(--web-primary);
  font-size: 11px;
  font-weight: 800;
}

.market-layout {
  position: relative;
  z-index: 1;
  display: grid;
  grid-template-columns: 320px minmax(0, 1fr);
  gap: 16px;
  align-items: start;
  overflow: visible;
}

.market-sidebar {
  align-self: start;
  position: sticky;
  top: 96px;
  z-index: 32;
}

.market-main {
  display: grid;
  gap: 14px;
}

.market-toolbar {
  padding: 14px 16px;
  border-radius: 20px;
}

.market-toolbar strong {
  display: block;
  font-size: 14px;
  font-weight: 900;
}

.market-toolbar span {
  display: block;
  margin-top: 4px;
  color: var(--web-muted);
  font-size: 12px;
}

.market-toolbar-chip {
  background: rgba(193, 18, 18, 0.08);
  color: var(--web-primary);
}

.market-status-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 18px;
  border-radius: 20px;
  color: var(--web-muted);
  font-weight: 700;
}

.market-status-card.error {
  color: #b42318;
}

.market-page-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
}

.market-end-marker {
  text-align: center;
  padding: 18px;
  color: var(--web-muted);
  font-size: 13px;
  font-weight: 800;
}

:global([data-theme='dark']) .loan-market-view .market-hero {
  background: linear-gradient(135deg, rgba(24, 28, 34, 0.88) 0%, rgba(19, 23, 30, 0.96) 100%);
}

:global([data-theme='dark']) .loan-market-view .market-hero-stat,
:global([data-theme='dark']) .loan-market-view .market-hero-panel,
:global([data-theme='dark']) .loan-market-view .market-toolbar,
:global([data-theme='dark']) .loan-market-view .market-status-card {
  background: linear-gradient(180deg, rgba(17, 24, 33, 0.96) 0%, rgba(12, 18, 27, 0.98) 100%);
  border-color: rgba(151, 176, 214, 0.16);
}

:global([data-theme='dark']) .loan-market-view .market-hero-panel-top span,
:global([data-theme='dark']) .loan-market-view .market-toolbar-chip {
  background: rgba(255, 106, 99, 0.16);
  color: #ffd2cf;
}

:global([data-theme='dark']) .loan-market-view .market-grid {
  background-image:
    linear-gradient(rgba(255, 255, 255, 0.03) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255, 255, 255, 0.03) 1px, transparent 1px);
}

@media (max-width: 1199px) {
  .market-hero,
  .market-layout {
    grid-template-columns: 1fr;
  }

  .market-sidebar {
    position: static;
  }
}

@media (max-width: 991px) {
  .market-sidebar {
    position: fixed;
    inset: 0;
    padding: 12px 12px 96px;
    overflow-y: auto;
    overscroll-behavior: contain;
    -webkit-overflow-scrolling: touch;
    transform: translateY(24px) scale(0.98);
    opacity: 0;
    pointer-events: none;
    transition: transform 0.18s ease, opacity 0.18s ease;
    z-index: 71;
  }

  .market-sidebar.open {
    transform: translateY(0) scale(1);
    opacity: 1;
    pointer-events: auto;
  }

  .market-sidebar :deep(.loan-discovery-filters) {
    min-height: calc(100dvh - 108px);
    width: 100%;
    box-shadow: 0 28px 80px rgba(15, 23, 42, 0.16);
  }

  .market-page-grid,
  .market-hero-stats {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 767px) {
  .market-hero {
    padding: 16px;
    border-radius: 22px;
  }

  .market-hero-copy h1 {
    font-size: 24px;
  }

  .market-hero-copy p {
    font-size: 12px;
    display: -webkit-box;
    -webkit-line-clamp: 3;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  .market-hero-panel-top,
  .market-toolbar {
    flex-direction: column;
    align-items: stretch;
  }

  .market-toolbar-chip {
    display: none;
  }

  .market-page-grid,
  .market-hero-stats {
    grid-template-columns: 1fr;
  }
}
</style>