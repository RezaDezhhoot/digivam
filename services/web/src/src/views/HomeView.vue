<script setup>
import { computed, nextTick, onMounted, onUnmounted, ref } from 'vue';
import LoanDiscoveryFilters from '../components/LoanDiscoveryFilters.vue';
import LoanOfferCard from '../components/LoanOfferCard.vue';
import enamadImage from '../assets/images/figma-enamad.png';
import {
  buildLoanDiscoveryParams,
  buildLoanFilterSummary,
  countActiveLoanFilters,
  createLoanDiscoveryFilters,
  creditOptions,
  deriveAmountBounds,
  quickFilterOptions
} from '../composables/useLoanDiscovery.js';
import { getWebHomeData } from '../services/web-loan.api.js';
import { applySeo, resetSeo } from '../utils/seo.js';

const journeyHighlights = [
  'فقط فرصت‌های تاییدشده و آماده نمایش',
  'مرتب‌سازی سریع بر پایه رفتار واقعی کارگزارها',
  'همراه با مسیر روشن برای اعتبارسنجی و درخواست'
];

const loading = ref(true);
const errorText = ref('');
const siteConfig = ref({});
const summary = ref({ verifiedBrokers: 0, publishedFacilities: 0, totalRequests: 0, averageRating: 0 });
const categories = ref(['همه وام ها']);
const guarantees = ref(['همه']);
const loans = ref([]);
const amountBounds = ref({ min: 10, max: 120 });
const filters = ref(createLoanDiscoveryFilters());
const mobileFiltersOpen = ref(false);

const formatNumber = (value) => new Intl.NumberFormat('fa-IR').format(Number(value || 0));
const formatRating = (value) => new Intl.NumberFormat('fa-IR', { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(Number(value || 0));

const heroStats = computed(() => [
  { label: 'کارگزار تاییدشده', value: `+${formatNumber(summary.value.verifiedBrokers)}` },
  { label: 'فرصت فعال', value: `+${formatNumber(summary.value.publishedFacilities)}` },
  { label: 'درخواست ثبت شده', value: `+${formatNumber(summary.value.totalRequests)}` },
  { label: 'میانگین امتیاز', value: formatRating(summary.value.averageRating) }
]);

const spotlightLoan = computed(() => siteConfig.value?.featuredSpotlight || null);
const filterSummaryText = computed(() => buildLoanFilterSummary(filters.value, amountBounds.value));
const activeFilterCount = computed(() => countActiveLoanFilters(filters.value, amountBounds.value));
const curatedMoments = computed(() => siteConfig.value?.homeFeatureCards || []);
const footerContent = computed(() => siteConfig.value?.footer || {
  aboutTitle: 'درباره دیجی‌وام',
  aboutText: '',
  socialTitle: 'ما را دنبال کنید',
  socialLinks: [],
  supportTitle: 'پشتیبانی',
  supportLinks: [],
  copyrightText: ''
});

const syncDesktopState = () => {
  if (window.innerWidth >= 992) {
    mobileFiltersOpen.value = false;
  }
};

const scrollToDiscovery = async () => {
  await nextTick();
  const element = document.getElementById('home-discovery-grid');
  if (element) {
    element.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
};

const applyPayloadSeo = (payload) => {
  applySeo({
    title: payload.seo?.title || payload.site?.homeSeo?.title || payload.site?.defaultSeo?.title,
    description: payload.seo?.description || payload.site?.homeSeo?.description || payload.site?.siteDescription,
    keywords: payload.seo?.keywords || payload.site?.homeSeo?.keywords || payload.site?.defaultSeo?.keywords,
    url: `${window.location.origin}/`,
    image: payload.site?.siteLogoUrl || '',
    favicon: payload.site?.faviconUrl || payload.site?.siteLogoUrl || '',
    siteName: payload.site?.siteName || 'دی جی وام',
    type: 'website'
  });
};

const load = async (query = {}, options = {}) => {
  const { syncBounds = false, scrollAfterLoad = false } = options;
  loading.value = true;
  errorText.value = '';

  try {
    const data = await getWebHomeData(query);
    siteConfig.value = {
      ...(data.site || {}),
      featuredSpotlight: data.featuredSpotlight || null
    };
    summary.value = data.summary || summary.value;
    categories.value = ['همه وام ها', ...(data.categories || [])];
    guarantees.value = ['همه', ...(data.guarantees || [])];
    loans.value = data.items || [];
    applyPayloadSeo(data);

    if (syncBounds) {
      const bounds = deriveAmountBounds(data.items || []);
      amountBounds.value = bounds;
      filters.value = createLoanDiscoveryFilters(bounds);
    }

    if (scrollAfterLoad) {
      mobileFiltersOpen.value = false;
      await scrollToDiscovery();
    }
  } catch (error) {
    errorText.value = error.message;
  } finally {
    loading.value = false;
  }
};

let filterDebounce = null;
const scheduleReload = () => {
  clearTimeout(filterDebounce);
  filterDebounce = setTimeout(() => {
    load(buildLoanDiscoveryParams(filters.value, amountBounds.value), { scrollAfterLoad: true });
  }, 260);
};

const updateFilters = (nextFilters) => {
  filters.value = nextFilters;
  scheduleReload();
};

const resetFilters = () => {
  filters.value = createLoanDiscoveryFilters(amountBounds.value);
  load(buildLoanDiscoveryParams(filters.value, amountBounds.value), { scrollAfterLoad: true });
};

onMounted(() => {
  window.addEventListener('resize', syncDesktopState);
  load({}, { syncBounds: true });
});

onUnmounted(() => {
  window.removeEventListener('resize', syncDesktopState);
  clearTimeout(filterDebounce);
  resetSeo();
});
</script>

<template>
  <div class="home-view">
    <section class="home-hero">
      <div class="page-shell">
        <div class="home-hero-shell">
          <div class="home-hero-copy">
            <span class="home-hero-kicker">پلتفرم کشف و انتخاب وام</span>
            <h1>صفحه اصلی دیجی‌وام حالا یک اتاق تصمیم‌گیری سریع برای وام است</h1>
            <p>
              فرصت‌های تاییدشده، رفتار واقعی کارگزار، فیلترهای هوشمند و مسیر اعتبارسنجی در یک تجربه روان کنار هم قرار گرفته‌اند تا انتخاب وام سریع‌تر، شفاف‌تر و قابل‌اعتمادتر شود.
            </p>

            <div class="home-hero-actions">
              <a href="#home-discovery-grid" class="home-primary-link">شروع جستجوی فرصت‌ها</a>
              <router-link to="/market" class="home-secondary-link">ورود به بازار کامل</router-link>
            </div>

            <div class="home-trust-strip">
              <span v-for="item in journeyHighlights" :key="item">{{ item }}</span>
            </div>

            <div class="home-stat-grid">
              <article v-for="item in heroStats" :key="item.label" class="home-stat-card">
                <strong>{{ item.value }}</strong>
                <span>{{ item.label }}</span>
              </article>
            </div>
          </div>

          <aside v-if="spotlightLoan" class="home-spotlight-card">
            <span class="home-spotlight-kicker">پیشنهاد برجسته امروز</span>
            <h2>{{ spotlightLoan.title }}</h2>
            <p>{{ spotlightLoan.description }}</p>

            <div class="home-spotlight-grid">
              <div>
                <span>بانک / موسسه</span>
                <strong>{{ spotlightLoan.institutionName }}</strong>
              </div>
              <div>
                <span>محدوده مبلغ</span>
                <strong>{{ formatNumber(spotlightLoan.minAmount / 1000000) }} تا {{ formatNumber(spotlightLoan.maxAmount / 1000000) }} میلیون</strong>
              </div>
              <div>
                <span>زمان پاسخ‌دهی</span>
                <strong>{{ formatNumber(spotlightLoan.averageReviewHours) }} ساعت</strong>
              </div>
              <div>
                <span>نشان‌شده</span>
                <strong>{{ formatNumber(spotlightLoan.bookmarkCount) }} بار</strong>
              </div>
            </div>

            <router-link :to="`/market/${spotlightLoan.slug}`" class="home-spotlight-link">مشاهده جزئیات</router-link>
          </aside>
        </div>
      </div>
    </section>

    <section class="home-curated-section">
      <div class="page-shell home-curated-grid">
        <article v-for="item in curatedMoments" :key="item.title" class="home-curated-card">
          <h2>{{ item.title }}</h2>
          <p>{{ item.description }}</p>
        </article>
      </div>
    </section>

    <section class="home-discovery-section">
      <button type="button" class="home-filter-overlay" :class="{ open: mobileFiltersOpen }" aria-label="بستن فیلترها" @click="mobileFiltersOpen = false"></button>

      <div class="page-shell home-discovery-layout">
        <aside class="home-filter-column" :class="{ open: mobileFiltersOpen }">
          <LoanDiscoveryFilters
            :model-value="filters"
            :categories="categories"
            :guarantee-options="guarantees"
            :credit-options="creditOptions"
            :quick-filter-options="quickFilterOptions"
            :amount-bounds="amountBounds"
            :show-close="mobileFiltersOpen"
            @update:model-value="updateFilters"
            @close="mobileFiltersOpen = false"
            @reset="resetFilters"
          />
        </aside>

        <div id="home-discovery-grid" class="home-results-column">
          <header class="home-results-head">
            <div>
              <span class="home-results-kicker">فضای کشف فرصت‌ها</span>
              <h2>فرصت‌های پیشنهادی دیجی‌وام</h2>
              <p>نتایج این بخش با همان فیلترهای صفحه اصلی و داده‌های واقعی کارگزارها به‌روز می‌شوند.</p>
            </div>

            <div class="home-results-head-actions">
              <span class="home-active-filter-chip">{{ formatNumber(activeFilterCount) }} فیلتر فعال</span>
              <button type="button" class="home-open-filters d-lg-none" @click="mobileFiltersOpen = true">نمایش فیلترها</button>
            </div>
          </header>

          <div v-if="!loading && !errorText" class="home-results-toolbar d-none d-md-block">
            <div>
              <strong>{{ formatNumber(loans.length) }} فرصت</strong>
              <span>{{ filterSummaryText }}</span>
            </div>
            <router-link to="/market" class="home-toolbar-link">بازار کامل امتیازها</router-link>
          </div>

          <div v-if="loading" class="home-empty-state">
            <span class="web-spinner web-spinner-lg"></span>
            <h3>در حال آماده‌سازی فرصت‌های امروز</h3>
            <p>اطلاعات وام‌ها از دیتابیس در حال دریافت و چیدمان هستند.</p>
          </div>

          <div v-else-if="errorText" class="home-empty-state error">
            <h3>بارگذاری صفحه اصلی با خطا روبه‌رو شد</h3>
            <p>{{ errorText }}</p>
          </div>

          <div v-else-if="loans.length" class="home-loan-grid">
            <LoanOfferCard v-for="loan in loans" :key="loan.slug" :item="loan" compact />
          </div>

          <div v-else class="home-empty-state">
            <h3>موردی با این ترکیب پیدا نشد</h3>
            <p>برای دیدن فرصت‌های بیشتر، بازه مبلغ یا نوع ضمانت را تغییر دهید.</p>
            <button type="button" class="home-primary-link button-like" @click="resetFilters">حذف همه فیلترها</button>
          </div>
        </div>
      </div>
    </section>

    <section class="home-footer-section">
      <div class="page-shell home-footer-grid">
        <article class="home-footer-about">
          <h2>{{ footerContent.aboutTitle }}</h2>
          <p>{{ footerContent.aboutText }}</p>
        </article>

        <article class="home-footer-links">
          <h3>{{ footerContent.socialTitle }}</h3>
          <div class="home-footer-link-list">
            <a v-for="item in footerContent.socialLinks" :key="`${item.label}-${item.url}`" :href="item.url || '#'">{{ item.label }}</a>
          </div>
        </article>

        <article class="home-footer-support">
          <h3>{{ footerContent.supportTitle }}</h3>
          <div class="home-footer-link-list">
            <a v-for="item in footerContent.supportLinks" :key="`${item.label}-${item.url}`" :href="item.url || '#'">{{ item.label }}</a>
          </div>
          <img :src="enamadImage" alt="اینماد دیجی وام" class="home-enamad" />
        </article>
      </div>

      <div class="page-shell home-footer-bottom">
        {{ footerContent.copyrightText }}
      </div>
    </section>
  </div>
</template>

<style scoped>
.home-view {
  position: relative;
  padding-bottom: 28px;
}

.home-hero {
  padding: 16px 0 10px;
}

.home-hero-shell {
  position: relative;
  overflow: hidden;
  display: grid;
  grid-template-columns: minmax(0, 1.3fr) 340px;
  gap: 16px;
  padding: 28px;
  border-radius: 32px;
  background:
    radial-gradient(circle at top right, rgba(255, 255, 255, 0.16), transparent 28%),
    linear-gradient(135deg, #6a0000 0%, #9f0909 38%, #c81c1c 72%, #f04e4e 100%);
  color: #fff;
  box-shadow: 0 32px 90px rgba(115, 0, 0, 0.26);
}

.home-hero-kicker,
.home-results-kicker,
.home-spotlight-kicker {
  display: inline-flex;
  align-items: center;
  min-height: 30px;
  padding: 0 12px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 800;
}

.home-hero-kicker,
.home-spotlight-kicker {
  background: rgba(255, 255, 255, 0.14);
}

.home-results-kicker {
  background: rgba(193, 18, 18, 0.08);
  color: var(--web-primary);
}

.home-hero-copy h1 {
  margin: 14px 0 10px;
  font-size: clamp(27px, 3.8vw, 44px);
  line-height: 1.22;
  font-weight: 900;
}

.home-hero-copy p {
  max-width: 720px;
  margin: 0;
  color: rgba(255, 255, 255, 0.84);
  line-height: 1.82;
  font-size: 14px;
}

.home-hero-actions,
.home-trust-strip,
.home-results-head-actions,
.home-results-toolbar,
.home-footer-link-list {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.home-hero-actions {
  margin-top: 18px;
}

.home-primary-link,
.home-secondary-link,
.home-toolbar-link,
.home-open-filters,
.home-spotlight-link {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 42px;
  padding: 0 15px;
  border-radius: 15px;
  font-size: 12px;
  font-weight: 800;
}

.home-primary-link,
.home-spotlight-link {
  background: #fff;
  color: #7a0000;
  box-shadow: 0 16px 34px rgba(45, 8, 8, 0.18);
}

.home-primary-link.button-like {
  border: none;
}

.home-secondary-link {
  color: #fff;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.16);
}

.home-trust-strip {
  margin-top: 12px;
}

.home-trust-strip span,
.home-active-filter-chip {
  min-height: 30px;
  padding: 0 10px;
  border-radius: 999px;
  font-size: 10px;
  font-weight: 800;
}

.home-trust-strip span {
  background: rgba(255, 255, 255, 0.1);
  color: rgba(255, 255, 255, 0.92);
}

.home-stat-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 10px;
  margin-top: 18px;
}

.home-stat-card {
  min-height: 82px;
  padding: 13px;
  border-radius: 20px;
  background: rgba(255, 255, 255, 0.12);
  border: 1px solid rgba(255, 255, 255, 0.14);
  backdrop-filter: blur(12px);
}

.home-stat-card strong {
  display: block;
  font-size: 22px;
  font-weight: 900;
}

.home-stat-card span {
  display: block;
  margin-top: 6px;
  font-size: 11px;
  color: rgba(255, 255, 255, 0.8);
}

.home-spotlight-card {
  align-self: stretch;
  display: grid;
  gap: 10px;
  padding: 16px;
  border-radius: 22px;
  background: rgba(255, 255, 255, 0.12);
  border: 1px solid rgba(255, 255, 255, 0.14);
  backdrop-filter: blur(16px);
}

.home-spotlight-card h2 {
  margin: 0;
  font-size: 20px;
  font-weight: 900;
  line-height: 1.45;
}

.home-spotlight-card p {
  margin: 0;
  color: rgba(255, 255, 255, 0.82);
  line-height: 1.7;
  font-size: 12px;
}

.home-spotlight-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
}

.home-spotlight-grid div {
  padding: 10px;
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.08);
}

.home-spotlight-grid span {
  display: block;
  font-size: 10px;
  color: rgba(255, 255, 255, 0.7);
}

.home-spotlight-grid strong {
  display: block;
  margin-top: 5px;
  font-size: 12px;
  line-height: 1.55;
}

.home-curated-section {
  padding: 12px 0 18px;
}

.home-curated-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 14px;
}

.home-curated-card {
  padding: 18px;
  border-radius: 22px;
  border: 1px solid var(--web-border);
  background: linear-gradient(180deg, var(--web-surface) 0%, var(--web-surface-soft) 100%);
  box-shadow: var(--web-shadow);
}

.home-curated-card h2 {
  margin: 0;
  font-size: 17px;
  font-weight: 900;
}

.home-curated-card p {
  margin: 10px 0 0;
  color: var(--web-muted);
  line-height: 1.75;
  font-size: 12px;
}

.home-discovery-section {
  position: relative;
  padding: 8px 0 28px;
}

.home-filter-overlay {
  position: fixed;
  inset: 0;
  border: none;
  background: rgba(15, 23, 42, 0.38);
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.18s ease;
  z-index: 70;
}

.home-filter-overlay.open {
  opacity: 1;
  pointer-events: auto;
}

.home-discovery-layout {
  display: grid;
  grid-template-columns: 330px minmax(0, 1fr);
  gap: 18px;
  align-items: start;
}

.home-filter-column {
  position: sticky;
  top: 98px;
  z-index: 32;
}

.home-results-column {
  display: grid;
  gap: 14px;
}

.home-results-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}

.home-results-head h2,
.home-footer-about h2 {
  margin: 10px 0 0;
  font-size: 25px;
  font-weight: 900;
  line-height: 1.35;
}

.home-results-head p,
.home-footer-about p {
  margin: 6px 0 0;
  color: var(--web-muted);
  line-height: 1.75;
  font-size: 13px;
}

.home-active-filter-chip {
  background: rgba(193, 18, 18, 0.08);
  color: var(--web-primary);
}

.home-open-filters,
.home-toolbar-link {
  border: 1px solid var(--web-border-strong);
  background: var(--web-surface-soft);
  color: var(--web-primary);
}

.home-results-toolbar {
  justify-content: space-between;
  padding: 14px 16px;
  border-radius: 20px;
  border: 1px solid var(--web-border);
  background: linear-gradient(180deg, var(--web-surface) 0%, var(--web-surface-soft) 100%);
}

.home-results-toolbar strong {
  display: block;
  font-size: 14px;
  font-weight: 900;
}

.home-results-toolbar span {
  display: block;
  margin-top: 4px;
  color: var(--web-muted);
  font-size: 12px;
}

.home-loan-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
}

.home-empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 220px;
  padding: 22px;
  text-align: center;
  border-radius: 22px;
  border: 1px solid var(--web-border);
  background: linear-gradient(180deg, var(--web-surface) 0%, var(--web-surface-soft) 100%);
  box-shadow: var(--web-shadow);
}

.home-empty-state.error h3 {
  color: #b42318;
}

.home-empty-state h3 {
  margin: 12px 0 8px;
  font-size: 18px;
  font-weight: 900;
}

.home-empty-state p {
  margin: 0;
  color: var(--web-muted);
  line-height: 1.85;
}

.home-footer-section {
  padding: 8px 0 0;
}

.home-footer-grid {
  display: grid;
  grid-template-columns: 1.25fr 0.9fr 0.9fr;
  gap: 14px;
}

.home-footer-about,
.home-footer-links,
.home-footer-support {
  padding: 18px;
  border-radius: 22px;
  border: 1px solid var(--web-border);
  background: linear-gradient(180deg, var(--web-surface) 0%, var(--web-surface-soft) 100%);
  box-shadow: var(--web-shadow);
}

.home-footer-links h3,
.home-footer-support h3 {
  margin: 0 0 10px;
  font-size: 16px;
  font-weight: 900;
}

.home-footer-link-list a {
  min-height: 34px;
  padding: 0 11px;
  border-radius: 999px;
  display: inline-flex;
  align-items: center;
  background: var(--web-surface);
  border: 1px solid var(--web-border);
  color: var(--web-text);
  font-size: 11px;
  font-weight: 700;
}

.home-enamad {
  width: 92px;
  margin-top: 14px;
}

.home-footer-bottom {
  padding: 16px 4px 0;
  color: var(--web-muted);
  font-size: 12px;
  text-align: center;
}

@media (max-width: 1199px) {
  .home-hero-shell,
  .home-discovery-layout {
    grid-template-columns: 1fr;
  }

  .home-filter-column {
    position: static;
  }
}

@media (max-width: 991px) {
  .home-loan-grid,
  .home-curated-grid,
  .home-footer-grid {
    grid-template-columns: 1fr;
  }

  .home-stat-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .home-filter-column {
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

  .home-filter-column.open {
    transform: translateY(0) scale(1);
    opacity: 1;
    pointer-events: auto;
  }

  .home-filter-column :deep(.loan-discovery-filters) {
    min-height: calc(100dvh - 108px);
    width: 100%;
    box-shadow: 0 28px 80px rgba(15, 23, 42, 0.16);
  }
}

@media (max-width: 767px) {
  .home-hero-shell {
    padding: 18px 16px;
    border-radius: 22px;
  }

  .home-hero-copy h1 {
    font-size: 23px;
    line-height: 1.32;
  }

  .home-hero-copy p {
    font-size: 12px;
    line-height: 1.72;
    display: -webkit-box;
    -webkit-line-clamp: 3;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  .home-hero-actions {
    gap: 8px;
  }

  .home-primary-link,
  .home-secondary-link {
    flex: 1 1 calc(50% - 8px);
  }

  .home-trust-strip {
    display: none;
  }

  .home-spotlight-card p {
    display: none;
  }

  .home-spotlight-grid div:nth-child(n + 3) {
    display: none;
  }

  .home-results-head,
  .home-results-toolbar {
    flex-direction: column;
    align-items: stretch;
  }

  .home-results-head h2,
  .home-footer-about h2 {
    font-size: 20px;
  }

  .home-loan-grid {
    gap: 10px;
  }
}
</style>