<script setup>
import { computed } from 'vue';

const props = defineProps({
  page: {
    type: Number,
    default: 1
  },
  limit: {
    type: Number,
    default: 10
  },
  total: {
    type: Number,
    default: 0
  },
  disabled: {
    type: Boolean,
    default: false
  }
});

const emit = defineEmits(['change']);

const totalPages = computed(() => (props.total > 0 ? Math.ceil(props.total / props.limit) : 0));

const visiblePages = computed(() => {
  if (totalPages.value <= 7) {
    return Array.from({ length: totalPages.value }, (_, index) => index + 1);
  }

  const pages = [1];
  const start = Math.max(2, props.page - 1);
  const end = Math.min(totalPages.value - 1, props.page + 1);

  if (start > 2) {
    pages.push('left-gap');
  }

  for (let current = start; current <= end; current += 1) {
    pages.push(current);
  }

  if (end < totalPages.value - 1) {
    pages.push('right-gap');
  }

  pages.push(totalPages.value);
  return pages;
});

const rangeStart = computed(() => {
  if (!props.total) {
    return 0;
  }

  return (props.page - 1) * props.limit + 1;
});

const rangeEnd = computed(() => Math.min(props.page * props.limit, props.total));

const formatNumber = (value) => new Intl.NumberFormat('fa-IR').format(Number(value || 0));

const goToPage = (value) => {
  if (props.disabled || value === props.page || value < 1 || value > totalPages.value) {
    return;
  }

  emit('change', value);
};
</script>

<template>
  <div v-if="totalPages > 1" class="pagination-shell">
    <div class="pagination-summary">
      نمایش {{ formatNumber(rangeStart) }} تا {{ formatNumber(rangeEnd) }} از {{ formatNumber(total) }} مورد
    </div>

    <div class="pagination-controls">
      <button class="pagination-btn" :disabled="disabled || page <= 1" @click="goToPage(page - 1)">
        <i class="fa-solid fa-angle-right"></i>
      </button>

      <template v-for="item in visiblePages">
        <span v-if="typeof item !== 'number'" :key="`gap-${item}`" class="pagination-gap">...</span>
        <button
          v-else
          :key="`page-${item}`"
          class="pagination-btn"
          :class="{ active: item === page }"
          :disabled="disabled"
          @click="goToPage(item)"
        >
          {{ formatNumber(item) }}
        </button>
      </template>

      <button class="pagination-btn" :disabled="disabled || page >= totalPages" @click="goToPage(page + 1)">
        <i class="fa-solid fa-angle-left"></i>
      </button>
    </div>
  </div>
</template>

<style scoped>
.pagination-shell {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  flex-wrap: wrap;
  padding: 16px 0 0;
  margin-top: 16px;
  border-top: 1px solid var(--panel-border);
}

.pagination-summary {
  font-size: 12px;
  color: var(--muted-text);
}

.pagination-controls {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.pagination-btn,
.pagination-gap {
  min-width: 38px;
  height: 38px;
  border-radius: 10px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  font-weight: 700;
}

.pagination-btn {
  border: 1px solid var(--panel-border);
  background: var(--surface-soft);
  color: var(--brand-text);
  transition: all 0.18s ease;
}

.pagination-btn:hover:not(:disabled) {
  border-color: var(--brand-primary);
  color: var(--brand-primary);
  transform: translateY(-1px);
}

.pagination-btn.active {
  background: var(--brand-primary);
  border-color: var(--brand-primary);
  color: #fff;
  box-shadow: 0 8px 20px rgba(219, 0, 0, 0.18);
}

.pagination-btn:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.pagination-gap {
  color: var(--muted-text);
}

@media (max-width: 767px) {
  .pagination-shell {
    flex-direction: column;
    align-items: stretch;
  }

  .pagination-controls {
    justify-content: center;
  }
}
</style>