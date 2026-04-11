<script setup>
const props = defineProps({
  modelValue: {
    type: Object,
    required: true
  },
  title: {
    type: String,
    default: 'فیلتر هوشمند بازار'
  },
  subtitle: {
    type: String,
    default: 'با چند انتخاب ساده، پیشنهادهای نزدیک‌تر به نیاز خود را ببینید.'
  },
  categories: {
    type: Array,
    default: () => []
  },
  guaranteeOptions: {
    type: Array,
    default: () => []
  },
  creditOptions: {
    type: Array,
    default: () => []
  },
  quickFilterOptions: {
    type: Array,
    default: () => []
  },
  amountBounds: {
    type: Object,
    default: () => ({ min: 10, max: 120 })
  },
  showSearch: {
    type: Boolean,
    default: false
  },
  searchPlaceholder: {
    type: String,
    default: 'جستجو در عنوان، بانک یا نوع وام'
  },
  compact: {
    type: Boolean,
    default: false
  },
  showClose: {
    type: Boolean,
    default: false
  }
});

const emit = defineEmits(['update:modelValue', 'reset', 'close']);

const formatNumber = (value) => new Intl.NumberFormat('fa-IR').format(Number(value || 0));

const sliderPercent = (value) => {
  const min = Number(props.amountBounds.min || 0);
  const max = Number(props.amountBounds.max || 0);
  const range = Math.max(max - min, 1);
  return ((Number(value || min) - min) / range) * 100;
};

const rangeTrackStyle = () => {
  const start = 100 - sliderPercent(props.modelValue.amountMax);
  const end = 100 - sliderPercent(props.modelValue.amountMin);

  return {
    '--range-start': `${Math.min(start, end)}%`,
    '--range-end': `${Math.max(start, end)}%`
  };
};

const updateValue = (patch) => {
  emit('update:modelValue', { ...props.modelValue, ...patch });
};

const updateMinAmount = (event) => {
  const nextValue = Number(event.target.value || 0);
  updateValue({ amountMin: Math.min(nextValue, Number(props.modelValue.amountMax || nextValue)) });
};

const updateMaxAmount = (event) => {
  const nextValue = Number(event.target.value || 0);
  updateValue({ amountMax: Math.max(nextValue, Number(props.modelValue.amountMin || nextValue)) });
};
</script>

<template>
  <section class="loan-discovery-filters" :class="{ compact }">
    <header class="loan-discovery-head">
      <div>
        <span class="loan-discovery-kicker">فیلتر هوشمند</span>
      </div>

      <div class="loan-discovery-head-actions">
        <button v-if="showClose" type="button" class="loan-discovery-close" @click="emit('close')">بستن</button>
        <button type="button" class="loan-discovery-reset" @click="emit('reset')">پاکسازی</button>
      </div>
    </header>

    <div v-if="showSearch" class="loan-discovery-group">
      <label class="loan-discovery-label">جستجو</label>
      <input
        :value="modelValue.search || ''"
        class="form-control loan-discovery-search"
        :placeholder="searchPlaceholder"
        @input="updateValue({ search: $event.target.value })"
      />
    </div>

    <div class="loan-discovery-group">
      <label class="loan-discovery-label">دسته‌بندی وام</label>
      <div class="loan-discovery-chip-grid">
        <button
          v-for="category in categories"
          :key="category"
          type="button"
          class="loan-discovery-chip"
          :class="{ active: modelValue.category === category }"
          @click="updateValue({ category })"
        >
          {{ category }}
        </button>
      </div>
    </div>

    <div class="loan-discovery-group">
      <div class="loan-discovery-amount-head">
        <label class="loan-discovery-label">محدوده مبلغ</label>
        <strong>{{ formatNumber(modelValue.amountMin) }} تا {{ formatNumber(modelValue.amountMax) }} میلیون</strong>
      </div>

      <div class="loan-discovery-range-card dual-ended" :style="rangeTrackStyle()">
        <div class="loan-discovery-range-labels">
          <span>از چپ تا راست بازه موردنظر را دقیق کنید</span>
          <strong>{{ formatNumber(modelValue.amountMax - modelValue.amountMin) }} میلیون فاصله</strong>
        </div>

        <div class="loan-discovery-range-shell">
          <div class="loan-discovery-range-track"></div>
          <input
            class="form-range loan-discovery-range dual min"
            type="range"
            :min="amountBounds.min"
            :max="amountBounds.max"
            step="5"
            :value="modelValue.amountMin"
            @change="updateMinAmount"
          />
          <input
            class="form-range loan-discovery-range dual max"
            type="range"
            :min="amountBounds.min"
            :max="amountBounds.max"
            step="5"
            :value="modelValue.amountMax"
            @change="updateMaxAmount"
          />
        </div>

        <div class="loan-discovery-range-values">
          <div class="loan-discovery-value-chip">
            <span>حداقل</span>
            <strong>{{ formatNumber(modelValue.amountMin) }} میلیون</strong>
          </div>
          <div class="loan-discovery-value-chip accent">
            <span>حداکثر</span>
            <strong>{{ formatNumber(modelValue.amountMax) }} میلیون</strong>
          </div>
        </div>
      </div>
    </div>

    <div class="loan-discovery-group">
      <label class="loan-discovery-label">نوع ضمانت</label>
      <div class="loan-discovery-chip-grid">
        <button
          v-for="item in guaranteeOptions"
          :key="item"
          type="button"
          class="loan-discovery-chip"
          :class="{ active: modelValue.guarantee === item }"
          @click="updateValue({ guarantee: item })"
        >
          {{ item }}
        </button>
      </div>
    </div>

    <div class="loan-discovery-group dual">
      <div>
        <label class="loan-discovery-label">اعتبارسنجی</label>
        <div class="loan-discovery-chip-grid mini">
          <button
            v-for="item in creditOptions"
            :key="item.value"
            type="button"
            class="loan-discovery-chip"
            :class="{ active: modelValue.credit === item.value }"
            @click="updateValue({ credit: item.value })"
          >
            {{ item.label }}
          </button>
        </div>
      </div>

      <div>
        <label class="loan-discovery-label">مرتب‌سازی سریع</label>
        <div class="loan-discovery-chip-grid mini">
          <button
            v-for="item in quickFilterOptions"
            :key="item"
            type="button"
            class="loan-discovery-chip accent"
            :class="{ active: modelValue.quickFilter === item }"
            @click="updateValue({ quickFilter: modelValue.quickFilter === item ? '' : item })"
          >
            {{ item }}
          </button>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.loan-discovery-filters {
  display: grid;
  gap: 15px;
  padding: 18px;
  border-radius: 26px;
  border: 1px solid var(--web-border);
  background: linear-gradient(180deg, var(--web-surface) 0%, var(--web-surface-soft) 100%);
  box-shadow: var(--web-shadow);
}

.loan-discovery-filters.compact {
  padding: 16px;
  border-radius: 22px;
  gap: 14px;
}

.loan-discovery-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 14px;
}

.loan-discovery-head-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

.loan-discovery-kicker {
  display: inline-flex;
  align-items: center;
  min-height: 28px;
  padding: 0 11px;
  border-radius: 999px;
  background: rgba(193, 18, 18, 0.08);
  color: var(--web-primary);
  font-size: 10px;
  font-weight: 800;
}

.loan-discovery-head h2 {
  margin: 8px 0 0;
  font-size: 20px;
  font-weight: 900;
}

.loan-discovery-head p {
  margin: 6px 0 0;
  color: var(--web-muted);
  font-size: 12px;
  line-height: 1.75;
}

.loan-discovery-reset {
  min-height: 38px;
  padding: 0 12px;
  border-radius: 14px;
  border: 1px solid var(--web-border-strong);
  background: var(--web-surface-soft);
  color: var(--web-primary);
  font-size: 11px;
  font-weight: 800;
}

.loan-discovery-close {
  min-height: 38px;
  padding: 0 12px;
  border-radius: 14px;
  border: 1px solid rgba(148, 163, 184, 0.28);
  background: rgba(15, 23, 42, 0.04);
  color: var(--web-text);
  font-size: 11px;
  font-weight: 800;
}

.loan-discovery-group {
  display: grid;
  gap: 10px;
}

.loan-discovery-group.dual {
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
}

.loan-discovery-label {
  display: block;
  color: var(--web-text);
  font-size: 12px;
  font-weight: 800;
}

.loan-discovery-search {
  min-height: 46px;
  border-radius: 15px;
}

.loan-discovery-chip-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.loan-discovery-chip-grid.mini .loan-discovery-chip {
  min-height: 30px;
}

.loan-discovery-chip {
  min-height: 34px;
  padding: 0 10px;
  border-radius: 999px;
  border: 1px solid var(--web-border);
  background: var(--web-surface);
  color: var(--web-text);
  font-size: 11px;
  font-weight: 700;
  transition: transform 0.18s ease, border-color 0.18s ease, background 0.18s ease, color 0.18s ease;
}

.loan-discovery-chip:hover,
.loan-discovery-chip.active {
  transform: translateY(-1px);
  border-color: var(--web-primary);
  background: rgba(193, 18, 18, 0.1);
  color: var(--web-primary);
}

.loan-discovery-chip.accent.active {
  background: linear-gradient(135deg, var(--web-primary) 0%, #c11212 100%);
  color: #fff;
}

.loan-discovery-amount-head,
.loan-discovery-range-labels {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.loan-discovery-amount-head strong,
.loan-discovery-range-labels strong {
  font-size: 11px;
  font-weight: 900;
  color: var(--web-primary);
}

.loan-discovery-range-card {
  padding: 12px;
  border-radius: 16px;
  border: 1px solid var(--web-border);
  background: rgba(193, 18, 18, 0.04);
}

.loan-discovery-range-card.dual-ended {
  display: grid;
  gap: 12px;
  --range-start: 0%;
  --range-end: 100%;
}

.loan-discovery-range-labels span {
  color: var(--web-muted);
  font-size: 11px;
}

.loan-discovery-range {
  margin-top: 8px;
}

.loan-discovery-range-shell {
  position: relative;
  height: 34px;
  direction: rtl;
}

.loan-discovery-range-track {
  position: absolute;
  inset: 50% 0 auto;
  height: 7px;
  border-radius: 999px;
  transform: translateY(-100%);
  background:
    linear-gradient(
      90deg,
      rgba(148, 163, 184, 0.28) 0%,
      rgba(148, 163, 184, 0.28) var(--range-start),
      rgba(193, 18, 18, 0.84) var(--range-start),
      rgba(193, 18, 18, 0.84) var(--range-end),
      rgba(148, 163, 184, 0.28) var(--range-end),
      rgba(148, 163, 184, 0.28) 100%
    );
}

.loan-discovery-range.dual {
  position: absolute;
  inset: 0;
  margin: 0;
  background: transparent;
  pointer-events: none;
}

.loan-discovery-range.dual::-webkit-slider-thumb {
  pointer-events: auto;
}

.loan-discovery-range.dual::-moz-range-thumb {
  pointer-events: auto;
}

.loan-discovery-range.dual::-webkit-slider-runnable-track {
  height: 34px;
  background: transparent;
}

.loan-discovery-range.dual::-moz-range-track {
  height: 34px;
  background: transparent;
}

.loan-discovery-range.dual::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 20px;
  height: 20px;
  margin-top: 7px;
  border-radius: 50%;
  border: 2px solid #fff;
  background: linear-gradient(135deg, var(--web-primary) 0%, #c11212 100%);
  box-shadow: 0 8px 18px rgba(193, 18, 18, 0.24);
}

.loan-discovery-range.dual::-moz-range-thumb {
  width: 20px;
  height: 20px;
  border: 2px solid #fff;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--web-primary) 0%, #c11212 100%);
  box-shadow: 0 8px 18px rgba(193, 18, 18, 0.24);
}

.loan-discovery-range-values {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.loan-discovery-value-chip {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  min-height: 42px;
  padding: 0 12px;
  border-radius: 14px;
  background: var(--web-surface);
  border: 1px solid rgba(148, 163, 184, 0.2);
}

.loan-discovery-value-chip.accent {
  background: rgba(193, 18, 18, 0.08);
}

.loan-discovery-value-chip span {
  color: var(--web-muted);
  font-size: 11px;
}

.loan-discovery-value-chip strong {
  color: var(--web-text);
  font-size: 11px;
  font-weight: 900;
}

@media (max-width: 767px) {
  .loan-discovery-filters,
  .loan-discovery-filters.compact {
    padding: 14px;
    border-radius: 20px;
    max-height: none;
    overflow: visible;
  }

  .loan-discovery-group.dual {
    grid-template-columns: 1fr;
  }

  .loan-discovery-head {
    flex-direction: column;
  }

  .loan-discovery-head-actions {
    width: 100%;
  }

  .loan-discovery-close,
  .loan-discovery-reset {
    flex: 1 1 0;
  }

  .loan-discovery-head h2 {
    font-size: 18px;
  }

  .loan-discovery-range-values {
    grid-template-columns: 1fr;
  }
}
</style>