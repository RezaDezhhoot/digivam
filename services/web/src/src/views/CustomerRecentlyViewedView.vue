<script setup>
import { computed, onMounted, ref } from 'vue';
import { RouterLink } from 'vue-router';
import CustomerPanelShell from '../components/CustomerPanelShell.vue';
import { getMyRecentlyViewed } from '../services/customer-panel.api.js';

const loading = ref(true);
const errorText = ref('');
const items = ref([]);

const formatNumber = (value) => new Intl.NumberFormat('fa-IR').format(Number(value || 0));
const formatDate = (value) => (value ? new Date(value).toLocaleString('fa-IR') : '-');
const shellStats = computed(() => [
  { label: 'کل بازدیدها', value: formatNumber(items.value.length) },
  { label: 'آخرین بازدید', value: items.value[0]?.viewedAt ? formatDate(items.value[0].viewedAt) : '-' }
]);

const load = async () => {
  loading.value = true;
  errorText.value = '';
  try {
    const data = await getMyRecentlyViewed({ limit: 20 });
    items.value = data.items || [];
  } catch (error) {
    errorText.value = error.message;
  } finally {
    loading.value = false;
  }
};

onMounted(load);
</script>

<template>
  <section class="customer-recently-viewed">
    <div v-if="loading" class="customer-loading-card">
      <div class="customer-spinner"></div>
      <span>در حال بارگذاری بازدیدهای اخیر...</span>
    </div>
    <div v-else-if="errorText" class="customer-loading-card text-danger">{{ errorText }}</div>

    <template v-else>
      <CustomerPanelShell
        kicker="تاریخچه تعاملات"
        title="بازدیدهای اخیر"
        description="همه امتیازهای وامی که اخیرا مشاهده کرده‌اید، با زمان آخرین بازدید و دسترسی سریع به جزئیات در این بخش نگهداری می‌شود."
        :stats="shellStats"
      >
      <div v-if="!items.length" class="customer-empty-card">
        <i class="fa-solid fa-clock-rotate-left"></i>
        <p>هنوز هیچ امتیازی مشاهده نکرده‌اید.</p>
        <RouterLink class="customer-hero-link" to="/market">مشاهده بازار وام</RouterLink>
      </div>

      <div v-else class="recently-viewed-grid">
        <article v-for="rv in items" :key="rv.id" class="rv-card">
          <div class="rv-card-top">
            <span class="rv-visit-chip">
              <i class="fa-solid fa-clock-rotate-left"></i>
              اخیرا دیده شده
            </span>
            <span class="rv-date-chip">{{ formatDate(rv.viewedAt) }}</span>
          </div>

          <div class="rv-card-header">
            <div>
              <h3>{{ rv.title }}</h3>
              <span class="rv-card-institution">{{ rv.brokerName }}</span>
            </div>
          </div>

          <div class="rv-card-range">
            <span>محدوده مبلغ</span>
            <strong>{{ formatNumber(rv.minAmount / 1000000) }} تا {{ formatNumber(rv.maxAmount / 1000000) }} میلیون تومان</strong>
          </div>

          <div class="rv-card-meta-grid">
            <div class="rv-meta-item">
              <span>وضعیت</span>
              <strong>{{ rv.status || '-' }}</strong>
            </div>
            <div class="rv-meta-item">
              <span>آخرین بازدید</span>
              <strong>{{ formatDate(rv.viewedAt) }}</strong>
            </div>
          </div>

          <div class="rv-card-actions">
            <RouterLink class="rv-card-action secondary" :to="`/market/${rv.slug}`">مرور جزئیات</RouterLink>
            <RouterLink class="rv-card-action" :to="`/market/${rv.slug}`">باز کردن وام</RouterLink>
          </div>
        </article>
      </div>
      </CustomerPanelShell>
    </template>
  </section>
</template>

<style scoped>
.customer-recently-viewed {
  padding-top: 18px;
  padding-bottom: 40px;
}

.recently-viewed-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 14px;
}

.rv-card {
  padding: 18px;
  border-radius: 22px;
  background: linear-gradient(180deg, var(--web-surface) 0%, var(--web-surface-soft) 100%);
  border: 1px solid var(--web-border);
  display: flex;
  flex-direction: column;
  gap: 12px;
  box-shadow: var(--web-shadow);
}

.rv-card-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.rv-visit-chip,
.rv-date-chip {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 32px;
  padding: 0 12px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 800;
}

.rv-visit-chip {
  gap: 8px;
  background: #eff6ff;
  color: #1d4ed8;
}

.rv-date-chip {
  background: var(--web-surface-soft);
  color: var(--web-muted);
}

.rv-card-header h3 {
  margin: 0;
  font-size: 18px;
  font-weight: 800;
}

.rv-card-institution {
  display: inline-block;
  margin-top: 4px;
  font-size: 12px;
  color: var(--web-primary);
  font-weight: 700;
}

.rv-card-range {
  padding: 14px 16px;
  border-radius: 16px;
  background: rgba(59, 130, 246, 0.05);
  border: 1px solid var(--web-border);
}

.rv-card-range span {
  display: block;
  font-size: 11px;
  color: var(--web-muted);
  margin-bottom: 6px;
}

.rv-card-range strong {
  font-size: 15px;
  line-height: 1.7;
}

.rv-card-meta-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.rv-meta-item {
  padding: 12px 14px;
  border-radius: 15px;
  background: var(--web-surface-soft);
  border: 1px solid var(--web-border);
}

.rv-meta-item span {
  display: block;
  font-size: 11px;
  color: var(--web-muted);
  margin-bottom: 6px;
}

.rv-meta-item strong {
  font-size: 13px;
  line-height: 1.6;
}

.rv-card-actions {
  display: flex;
  gap: 8px;
  margin-top: auto;
}

.rv-card-action {
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

.rv-card-action.secondary {
  background: var(--web-surface);
  border: 1px solid var(--web-border);
  color: var(--web-text);
}

.rv-pagination {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
  margin-top: 28px;
}

.rv-pagination button {
  padding: 8px 18px;
  border-radius: 12px;
  border: 1px solid var(--web-border);
  background: var(--web-surface);
  cursor: pointer;
  font-weight: 700;
}

.rv-pagination button:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.customer-empty-card {
  text-align: center;
  padding: 36px 20px;
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

@media (max-width: 767px) {
  .recently-viewed-grid {
    grid-template-columns: 1fr;
  }

  .rv-card-top,
  .rv-card-actions {
    flex-direction: column;
    align-items: stretch;
  }

  .rv-card-meta-grid {
    grid-template-columns: 1fr;
  }
}
</style>
