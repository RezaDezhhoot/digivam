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

<style scoped src="./styles/CustomerRecentlyViewedView.css"></style>
