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
  const getDealRoute = (deal) => `/customer/deals/${deal.id}`;
  const getDealActionLabel = (deal) => (deal.canSubmitDocuments ? 'ادامه تکمیل' : 'مشاهده جزئیات');
  const getToneClass = (deal) => `deal-status-chip-${deal.status}`;

  const shellStats = computed(() => [
    { label: 'کل معامله‌ها', value: formatNumber(summary.value.total) },
    { label: 'در انتظار اقدام من', value: formatNumber(summary.value.waitingCustomer) },
    { label: 'در بررسی کارگزار', value: formatNumber(summary.value.waitingBroker) },
    { label: 'ناموفق', value: formatNumber(summary.value.failed) }
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
            <article class="deals-spotlight-card">
              <template v-if="spotlightDeal">
                <div class="deals-spotlight-top">
                  <div>
                    <span class="deals-kicker">{{ spotlightDeal.dealCode || '' }}</span>
                    <h2>{{ getDealTitle(spotlightDeal) }}</h2>
                    <p>{{ spotlightDeal.stepLabel }}</p>
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
                <article v-for="deal in activeDeals" :key="deal.id" class="deal-line-card">
                  <div>
                    <h3>{{ deal.dealCode }} - {{ getDealTitle(deal) }}</h3>
                    <p>{{ deal.stepLabel }}</p>
                  </div>
                  <div class="deal-line-meta">
                    <span>{{ formatNumber(deal.amount) }} تومان</span>
                    <span>{{ getDocsProgress(deal) }} مدرک</span>
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
                <article v-for="deal in archivedDeals" :key="deal.id" class="deal-line-card archive">
                  <div>
                    <h3>{{ deal.dealCode }} - {{ getDealTitle(deal) }}</h3>
                    <p>{{ deal.statusLabel }} | {{ deal.updatedAtLabel }}</p>
                  </div>
                  <div class="deal-line-meta">
                    <span>{{ formatNumber(deal.amount) }} تومان</span>
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
              <article v-for="deal in items" :key="deal.id" class="deal-card">
                <div class="deal-card-top">
                  <div>
                    <h3>{{ deal.dealCode }} - {{ getDealTitle(deal) }}</h3>
                    <p>{{ deal.typeLabel || deal.facility?.typeLabel || '-' }} | {{ deal.stepLabel }}</p>
                  </div>
                  <span class="deal-status-chip" :class="getToneClass(deal)">{{ deal.statusLabel }}</span>
                </div>

                <div class="deal-card-meta">
                  <span>مبلغ: {{ formatNumber(deal.amount) }} تومان</span>
                  <span>اقدام با: {{ getActionBy(deal) }}</span>
                  <span>مدارک: {{ getDocsProgress(deal) }}</span>
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

  <style scoped>
  .customer-deals-view {
    display: grid;
    gap: 18px;
  }

  .customer-loading-card {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 14px;
    padding: 48px 28px;
    border-radius: 30px;
    background: var(--web-surface);
    border: 1px solid var(--web-border);
    color: var(--web-muted);
    font-weight: 700;
  }

  .customer-spinner {
    width: 28px;
    height: 28px;
    border: 3px solid var(--web-border);
    border-top-color: var(--web-primary);
    border-radius: 50%;
    animation: dealSpin 0.7s linear infinite;
  }

  @keyframes dealSpin {
    to { transform: rotate(360deg); }
  }

  .deals-overview-grid {
    display: grid;
    grid-template-columns: minmax(0, 1.4fr) minmax(320px, 0.9fr);
    gap: 18px;
  }

  .deals-spotlight-card,
  .deals-lane-card,
  .deals-list-card {
    padding: 22px;
    border-radius: 28px;
    border: 1px solid var(--web-border);
    background: linear-gradient(180deg, var(--web-surface) 0%, var(--web-surface-soft) 100%);
    box-shadow: var(--web-shadow);
  }

  .deals-spotlight-card {
    display: grid;
    gap: 18px;
    background:
      radial-gradient(circle at top right, rgba(211, 90, 90, 0.18), transparent 36%),
      linear-gradient(180deg, var(--web-surface) 0%, var(--web-surface-soft) 100%);
  }

  .deals-kicker {
    color: var(--web-primary);
    font-size: 11px;
    font-weight: 900;
  }

  .deals-spotlight-top,
  .deals-spotlight-footer,
  .deal-line-card,
  .deal-line-meta,
  .deal-card-top,
  .deal-card-footer,
  .customer-panel-head {
    display: flex;
    justify-content: space-between;
    gap: 12px;
  }

  .deals-spotlight-top,
  .deal-card-top {
    align-items: flex-start;
  }

  .deals-spotlight-footer,
  .deal-card-footer,
  .customer-panel-head,
  .deal-line-card,
  .deal-line-meta {
    align-items: center;
  }

  .deals-spotlight-top h2 {
    margin: 8px 0 0;
    font-size: 24px;
    font-weight: 900;
  }

  .deals-spotlight-top p,
  .deals-spotlight-footer span,
  .deals-insight-card p,
  .deal-line-card p,
  .deal-card-top p,
  .deal-card-footer span,
  .deal-card-meta span,
  .customer-panel-head p {
    color: var(--web-muted);
    font-size: 12px;
  }

  .deals-spotlight-top p,
  .deals-insight-card p,
  .deal-line-card p,
  .deal-card-top p,
  .customer-panel-head p {
    margin: 8px 0 0;
  }

  .deals-spotlight-metrics {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 14px;
  }

  .deals-spotlight-metrics div,
  .deals-insight-card,
  .deal-card,
  .deal-line-card {
    padding: 16px;
    border-radius: 22px;
    background: color-mix(in srgb, var(--web-surface) 74%, transparent);
    border: 1px solid var(--web-border);
  }

  .deals-spotlight-metrics span,
  .deals-insight-card span,
  .deal-line-meta span {
    color: var(--web-muted);
    font-size: 11px;
  }

  .deals-spotlight-metrics strong,
  .deals-insight-card strong {
    display: block;
    margin-top: 8px;
    font-size: 18px;
    font-weight: 900;
  }

  .deals-insights-grid,
  .deals-stack,
  .deals-grid,
  .deal-card-meta {
    display: grid;
    gap: 16px;
  }

  .deals-insight-card.tone-warning {
    background: linear-gradient(180deg, rgba(245, 158, 11, 0.12), rgba(245, 158, 11, 0.04));
  }

  .deals-insight-card.tone-accent {
    background: linear-gradient(180deg, rgba(211, 90, 90, 0.12), rgba(211, 90, 90, 0.04));
  }

  .deals-insight-card.tone-info {
    background: linear-gradient(180deg, rgba(14, 165, 233, 0.12), rgba(14, 165, 233, 0.04));
  }

  .deals-lanes-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 18px;
  }

  .deals-lane-card.muted {
    background: linear-gradient(180deg, color-mix(in srgb, var(--web-surface) 92%, transparent), var(--web-surface-soft));
  }

  .deals-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .deal-line-card h3,
  .deal-card-top h3,
  .customer-panel-head h2 {
    margin: 0;
    font-weight: 900;
  }

  .deal-line-card h3 {
    font-size: 14px;
  }

  .deal-card-top h3 {
    font-size: 16px;
  }

  .customer-panel-head h2 {
    font-size: 18px;
  }

  .customer-panel-head {
    margin-bottom: 16px;
  }

  .deal-card {
    display: grid;
    gap: 14px;
  }

  .deal-status-chip {
    display: inline-flex;
    align-items: center;
    min-height: 32px;
    padding: 0 12px;
    border-radius: 999px;
    font-size: 11px;
    font-weight: 900;
  }

  .deal-status-chip-in_progress {
    background: rgba(249, 115, 22, 0.12);
    color: #c2410c;
  }

  .deal-status-chip-failed {
    background: rgba(239, 68, 68, 0.12);
    color: #b91c1c;
  }

  .deal-status-chip-suspended {
    background: rgba(100, 116, 139, 0.14);
    color: #475569;
  }

  .deal-status-chip-done {
    background: rgba(34, 160, 107, 0.12);
    color: #15803d;
  }

  .customer-inline-link,
  .customer-hero-link {
    display: inline-flex;
    align-items: center;
    min-height: 42px;
    padding: 0 16px;
    border-radius: 16px;
    background: rgba(211, 90, 90, 0.1);
    color: var(--web-primary);
    font-size: 12px;
    font-weight: 800;
  }

  .customer-inline-link.solid {
    background: var(--web-primary);
    color: #fff;
  }

  .customer-hero-link {
    background: #fff;
  }

  .customer-empty {
    padding: 26px;
    border-radius: 20px;
    background: rgba(148, 163, 184, 0.08);
    color: var(--web-muted);
    text-align: center;
    font-weight: 700;
  }

  [data-theme='dark'] .deal-card,
  [data-theme='dark'] .deal-line-card,
  [data-theme='dark'] .deals-insight-card,
  [data-theme='dark'] .deals-spotlight-metrics div {
    background: var(--web-surface-soft);
  }

  @media (max-width: 991px) {
    .deals-overview-grid,
    .deals-lanes-grid,
    .deals-spotlight-metrics,
    .deals-grid {
      grid-template-columns: 1fr;
    }

    .deals-spotlight-footer,
    .deal-line-card,
    .deal-line-meta,
    .customer-panel-head,
    .deal-card-footer {
      flex-direction: column;
      align-items: flex-start;
    }
  }

  @media (max-width: 767px) {
    .deals-spotlight-card,
    .deals-lane-card,
    .deals-list-card {
      padding: 18px 16px;
      border-radius: 22px;
    }

    .deals-spotlight-top h2 {
      font-size: 20px;
    }

    .deals-insights-grid,
    .deals-stack,
    .deals-grid,
    .deal-card-meta {
      gap: 12px;
    }

    .deal-line-card,
    .deal-card,
    .deals-insight-card,
    .deals-spotlight-metrics div {
      padding: 14px;
      border-radius: 18px;
    }

    .customer-hero-link,
    .customer-inline-link {
      width: 100%;
      justify-content: center;
    }
  }
  </style>