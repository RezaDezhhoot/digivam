<script setup>
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue';
import { humanizeAmount } from '../utils/amount.js';
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
import { useSiteConfig } from '../composables/useSiteConfig.js';

const { setSiteConfig } = useSiteConfig();

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

const syncBodyScrollLock = (locked) => {
  document.documentElement.style.overflow = locked ? 'hidden' : '';
  document.body.style.overflow = locked ? 'hidden' : '';
  document.body.style.touchAction = locked ? 'none' : '';
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
    setSiteConfig(data.site);
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
  syncBodyScrollLock(false);
  resetSeo();
});

watch(mobileFiltersOpen, (value) => {
  syncBodyScrollLock(value && window.innerWidth < 992);
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
                <strong>{{ humanizeAmount(spotlightLoan.minAmount) }} تا {{ humanizeAmount(spotlightLoan.maxAmount) }}</strong>
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
              <strong>{{ formatNumber(loans.length) }} مورد یافت شد</strong>
            </div>
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

<style scoped src="./styles/HomeView.css"></style>