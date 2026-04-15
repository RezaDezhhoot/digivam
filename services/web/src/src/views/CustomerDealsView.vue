  <script setup>
  import { computed, onMounted, ref } from 'vue';
  import { RouterLink } from 'vue-router';
  import CustomerPanelShell from '../components/CustomerPanelShell.vue';
  import { getCustomerDealSummary, getCustomerDeals } from '../services/customer-panel.api.js';

  const loading = ref(true);
  const errorText = ref('');
  const summary = ref({
    total: 0,
    inProgress: 0,
    failed: 0,
    suspended: 0,
    done: 0,
    waitingCustomer: 0,
    waitingBroker: 0,
    waitingAdmin: 0,
    verifyBroker: 0
  });
  const items = ref([]);

  const formatNumber = (value) => new Intl.NumberFormat('fa-IR').format(Number(value || 0));
  const getDocsProgress = (deal) => `${formatNumber(deal.completedDocuments || 0)} / ${formatNumber(deal.documentsCount || 0)}`;
  const getDealTitle = (deal) => deal.facility?.title || deal.facilityData?.title || 'معامله وام';
  const getActionBy = (deal) => deal.actByLabel || '-';
  const isCustomerTurn = (deal) => {
    const actBy = String(deal?.actBy || '').toLowerCase();
    return actBy === 'customer' || actBy === 'customer_broker';
  };
  const getDealRoute = (deal) => `/customer/deals/${deal.id}`;
  const getDealActionLabel = (deal) => (deal.canSubmitDocuments ? 'ادامه تکمیل' : 'مشاهده جزئیات');
  const getToneClass = (deal) => `deal-status-chip-${deal.status}`;
  const getAdminReviewReason = (deal) => deal.adminReviewData?.reason || 'این پرونده توسط مدیریت در حال بررسی است.';

  const shellStats = computed(() => [
    { label: 'کل معامله‌ها', value: formatNumber(summary.value.total) },
    { label: 'در انتظار اقدام من', value: formatNumber(summary.value.waitingCustomer) },
    { label: 'در بررسی کارگزار', value: formatNumber(summary.value.waitingBroker) },
    { label: 'در بررسی مدیریت', value: formatNumber(summary.value.waitingAdmin) }
  ]);

  const spotlightDeal = computed(() => items.value.find((deal) => deal.canSubmitDocuments) || items.value.find((deal) => deal.status === 'in_progress') || items.value[0] || null);
  const activeDeals = computed(() => items.value.filter((deal) => deal.status === 'in_progress'));
  const archivedDeals = computed(() => items.value.filter((deal) => deal.status !== 'in_progress'));
  const insightCards = computed(() => [
    {
      title: 'پرونده‌های نیازمند اقدام',
      value: formatNumber(summary.value.waitingCustomer),
      description: 'معامله‌هایی که هنوز باید مدارک یا داده‌هایشان را کامل کنید.',
      tone: 'warning'
    },
    {
      title: 'ارسال‌شده برای کارگزار',
      value: formatNumber(summary.value.verifyBroker || summary.value.waitingBroker),
      description: 'پرونده‌هایی که از سمت شما تکمیل شده‌اند و در صف بررسی کارگزار هستند.',
      tone: 'accent'
    },
    {
      title: 'جمع مبلغ معامله‌ها',
      value: `${formatNumber(items.value.reduce((total, deal) => total + Number(deal.amount || 0), 0))} تومان`,
      description: 'مجموع مبالغ ثبت‌شده در کارتابل فعلی شما.',
      tone: 'info'
    }
  ]);

  const load = async () => {
    loading.value = true;
    errorText.value = '';

    try {
      const [summaryData, dealsData] = await Promise.all([
        getCustomerDealSummary(),
        getCustomerDeals({ page: 1, limit: 12 })
      ]);

      summary.value = summaryData.summary || summary.value;
      items.value = dealsData.items || [];
    } catch (error) {
      errorText.value = error.message;
    } finally {
      loading.value = false;
    }
  };

  onMounted(load);
  </script>

  <template>
    <section class="customer-deals-view">
      <CustomerPanelShell
        kicker="کارتابل معاملات"
        title="معامله‌های امتیاز وام"
        description="همه درخواست‌های ثبت‌شده، مدارک ارسال‌شده و نتیجه بررسی کارگزار را از این بخش دنبال کنید."
        :stats="shellStats"
      >
        <template #actions>
          <RouterLink class="customer-hero-link" to="/market">شروع معامله جدید</RouterLink>
        </template>

        <div v-if="loading" class="customer-loading-card">
          <div class="customer-spinner"></div>
          <span>در حال بارگذاری معامله‌ها...</span>
        </div>
        <div v-else-if="errorText" class="customer-loading-card text-danger">{{ errorText }}</div>
        <template v-else>
          <section class="deals-overview-grid">
            <article class="deals-spotlight-card" :class="{ 'act-by-marked': spotlightDeal && isCustomerTurn(spotlightDeal) }">
              <template v-if="spotlightDeal">
                <div class="deals-spotlight-top">
                  <div>
                    <span class="deals-kicker">{{ spotlightDeal.dealCode || '' }}</span>
                    <h2>{{ getDealTitle(spotlightDeal) }}</h2>
                    <p>{{ spotlightDeal.stepLabel }}</p>
                    <p v-if="spotlightDeal.adminReviewMode" class="deal-admin-review-inline">در بررسی مدیریت: {{ getAdminReviewReason(spotlightDeal) }}</p>
                  </div>
                  <span class="deal-status-chip" :class="getToneClass(spotlightDeal)">{{ spotlightDeal.statusLabel }}</span>
                </div>

                <div class="deals-spotlight-metrics">
                  <div>
                    <span>مبلغ</span>
                    <strong>{{ formatNumber(spotlightDeal.amount) }} تومان</strong>
                  </div>
                  <div>
                    <span>مدارک</span>
                    <strong>{{ getDocsProgress(spotlightDeal) }}</strong>
                  </div>
                  <div>
                    <span>اقدام با</span>
                    <strong>{{ getActionBy(spotlightDeal) }}</strong>
                  </div>
                </div>

                <div class="deals-spotlight-footer">
                  <span v-if="isCustomerTurn(spotlightDeal)" class="act-by-mark-chip">نوبت اقدام شما</span>
                  <span>آخرین بروزرسانی: {{ spotlightDeal.updatedAtLabel }}</span>
                  <RouterLink class="customer-inline-link solid" :to="getDealRoute(spotlightDeal)">{{ getDealActionLabel(spotlightDeal) }}</RouterLink>
                </div>
              </template>
              <template v-else>
                <span class="deals-kicker">پرونده برجسته</span>
                <h2>هنوز معامله‌ای ثبت نشده است</h2>
                <p>از بازار وام وارد یکی از درخواست‌ها شوید و اولین معامله خود را بسازید.</p>
                <RouterLink class="customer-inline-link solid" to="/market">شروع معامله جدید</RouterLink>
              </template>
            </article>

            <div class="deals-insights-grid">
              <article v-for="card in insightCards" :key="card.title" class="deals-insight-card" :class="`tone-${card.tone}`">
                <span>{{ card.title }}</span>
                <strong>{{ card.value }}</strong>
                <p>{{ card.description }}</p>
              </article>
            </div>
          </section>

          <section class="deals-lanes-grid">
            <article class="deals-lane-card">
              <div class="customer-panel-head compact">
                <div>
                  <h2>در جریان</h2>
                  <p>تمام پرونده‌های فعال که هنوز در چرخه معامله هستند.</p>
                </div>
                <strong>{{ formatNumber(activeDeals.length) }}</strong>
              </div>

              <div v-if="activeDeals.length" class="deals-stack">
                <article v-for="deal in activeDeals" :key="deal.id" class="deal-line-card" :class="{ 'act-by-marked': isCustomerTurn(deal) }">
                  <div>
                    <h3>{{ deal.dealCode }} - {{ getDealTitle(deal) }}</h3>
                    <p>{{ deal.stepLabel }}</p>
                    <p v-if="deal.adminReviewMode" class="deal-admin-review-inline">در بررسی مدیریت: {{ getAdminReviewReason(deal) }}</p>
                  </div>
                  <div class="deal-line-meta">
                    <span>{{ formatNumber(deal.amount) }} تومان</span>
                    <span>{{ getDocsProgress(deal) }} مدرک</span>
                    <span v-if="isCustomerTurn(deal)" class="act-by-mark-chip">نوبت اقدام شما</span>
                    <RouterLink class="customer-inline-link" :to="getDealRoute(deal)">{{ getDealActionLabel(deal) }}</RouterLink>
                  </div>
                </article>
              </div>
              <div v-else class="customer-empty">معامله فعالی در جریان ندارید.</div>
            </article>

            <article class="deals-lane-card muted">
              <div class="customer-panel-head compact">
                <div>
                  <h2>آرشیو و نتیجه‌ها</h2>
                  <p>پرونده‌های نهایی‌شده، ناموفق یا تعلیق‌شده.</p>
                </div>
                <strong>{{ formatNumber(archivedDeals.length) }}</strong>
              </div>

              <div v-if="archivedDeals.length" class="deals-stack">
                <article v-for="deal in archivedDeals" :key="deal.id" class="deal-line-card archive" :class="{ 'act-by-marked': isCustomerTurn(deal) }">
                  <div>
                    <h3>{{ deal.dealCode }} - {{ getDealTitle(deal) }}</h3>
                    <p>{{ deal.statusLabel }} | {{ deal.updatedAtLabel }}</p>
                    <p v-if="deal.adminReviewMode" class="deal-admin-review-inline">در بررسی مدیریت: {{ getAdminReviewReason(deal) }}</p>
                  </div>
                  <div class="deal-line-meta">
                    <span>{{ formatNumber(deal.amount) }} تومان</span>
                    <span v-if="isCustomerTurn(deal)" class="act-by-mark-chip">نوبت اقدام شما</span>
                    <RouterLink class="customer-inline-link" :to="getDealRoute(deal)">مشاهده</RouterLink>
                  </div>
                </article>
              </div>
              <div v-else class="customer-empty">هنوز نتیجه‌ای در آرشیو ثبت نشده است.</div>
            </article>
          </section>

          <section class="deals-list-card">
            <div class="customer-panel-head">
              <div>
                <h2>همه معامله‌ها</h2>
                <p>برای ادامه تکمیل مدارک یا مرور روند بررسی، روی هر پرونده وارد شوید.</p>
              </div>
              <RouterLink class="customer-inline-link" to="/market">بازار وام</RouterLink>
            </div>

            <div v-if="items.length" class="deals-grid">
              <article v-for="deal in items" :key="deal.id" class="deal-card" :class="{ 'act-by-marked': isCustomerTurn(deal) }">
                <div class="deal-card-top">
                  <div>
                    <h3>{{ deal.dealCode }} - {{ getDealTitle(deal) }}</h3>
                    <p>{{ deal.typeLabel || deal.facility?.typeLabel || '-' }} | {{ deal.stepLabel }}</p>
                    <p v-if="deal.adminReviewMode" class="deal-admin-review-inline">در بررسی مدیریت: {{ getAdminReviewReason(deal) }}</p>
                  </div>
                  <span class="deal-status-chip" :class="getToneClass(deal)">{{ deal.statusLabel }}</span>
                </div>

                <div class="deal-card-meta">
                  <span>مبلغ: {{ formatNumber(deal.amount) }} تومان</span>
                  <span>اقدام با: {{ getActionBy(deal) }}</span>
                  <span>مدارک: {{ getDocsProgress(deal) }}</span>
                  <span v-if="isCustomerTurn(deal)" class="act-by-mark-chip">نوبت اقدام شما</span>
                </div>

                <div class="deal-card-footer">
                  <span>{{ deal.updatedAtLabel }}</span>
                  <RouterLink class="customer-inline-link" :to="getDealRoute(deal)">{{ getDealActionLabel(deal) }}</RouterLink>
                </div>
              </article>
            </div>
            <div v-else class="customer-empty">هنوز معامله‌ای ثبت نشده است.</div>
          </section>
        </template>
      </CustomerPanelShell>
    </section>
  </template>

  <style scoped src="./styles/CustomerDealsView.css"></style>