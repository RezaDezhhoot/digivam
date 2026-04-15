<script setup>
import $ from 'jquery';
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import 'select2/dist/css/select2.min.css';

const props = defineProps({
  modelValue: {
    type: [String, Number],
    default: ''
  },
  options: {
    type: Array,
    default: () => []
  },
  placeholder: {
    type: String,
    default: 'انتخاب کنید'
  },
  disabled: {
    type: Boolean,
    default: false
  },
  number: {
    type: Boolean,
    default: false
  },
  valueKey: {
    type: String,
    default: 'id'
  },
  labelKey: {
    type: String,
    default: 'name'
  }
});

const emit = defineEmits(['update:modelValue']);

const selectRef = ref(null);
let changeHandler = null;
let select2Loader = null;

const normalizedOptions = computed(() =>
  props.options.map((item) => ({
    value: String(item?.[props.valueKey] ?? item?.value ?? item?.id ?? ''),
    label: String(item?.[props.labelKey] ?? item?.label ?? item?.title ?? item?.name ?? '')
  }))
);

const ensureSelect2 = async () => {
  if (typeof window !== 'undefined') {
    window.$ = $;
    window.jQuery = $;
  }

  if (typeof $.fn.select2 === 'function') {
    return true;
  }

  if (!select2Loader) {
    select2Loader = import('select2/dist/js/select2.full.min.js');
  }

  const module = await select2Loader;
  const installer = module?.default;

  if (typeof $.fn.select2 !== 'function' && typeof installer === 'function' && typeof window !== 'undefined') {
    installer(window, $);
  }

  return typeof $.fn.select2 === 'function';
};

const syncValue = () => {
  if (!selectRef.value || !$.fn.select2) {
    return;
  }

  const nextValue = props.modelValue == null ? '' : String(props.modelValue);
  const $select = $(selectRef.value);
  if (($select.val() || '') !== nextValue) {
    $select.val(nextValue).trigger('change.select2');
  }
};

const destroy = () => {
  if (!selectRef.value || !$.fn.select2) {
    return;
  }

  const $select = $(selectRef.value);
  if (changeHandler) {
    $select.off('change', changeHandler);
  }
  if ($select.data('select2')) {
    $select.select2('destroy');
  }
};

const init = async () => {
  const ready = await ensureSelect2();
  await nextTick();

  if (!selectRef.value || !ready || typeof $(selectRef.value).select2 !== 'function') {
    return;
  }

  destroy();

  const $select = $(selectRef.value);
  $select.select2({
    width: '100%',
    dir: 'rtl',
    placeholder: props.placeholder,
    allowClear: true,
    minimumResultsForSearch: 0,
    dropdownAutoWidth: true
  });

  changeHandler = () => {
    const rawValue = $select.val();
    if (rawValue == null || rawValue === '') {
      emit('update:modelValue', '');
      return;
    }

    emit('update:modelValue', props.number ? Number(rawValue) : rawValue);
  };

  $select.on('change', changeHandler);
  syncValue();
  $select.prop('disabled', props.disabled).trigger('change.select2');
};

watch(() => props.modelValue, () => {
  syncValue();
});

watch(() => props.disabled, async () => {
  await nextTick();
  if (selectRef.value && $.fn.select2) {
    $(selectRef.value).prop('disabled', props.disabled).trigger('change.select2');
  }
});

watch(normalizedOptions, async () => {
  await init();
});

onMounted(async () => {
  await init();
});

onBeforeUnmount(() => {
  destroy();
});
</script>

<template>
  <select ref="selectRef" class="select2-native">
    <option value="">{{ placeholder }}</option>
    <option v-for="item in normalizedOptions" :key="item.value" :value="item.value">{{ item.label }}</option>
  </select>
</template>

<style scoped src="./styles/Select2Input.css"></style>