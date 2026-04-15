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

<style scoped src="./styles/LoanDiscoveryFilters.css"></style>