<script setup>
import { nextTick, onBeforeUnmount, onMounted, ref } from 'vue';
import $ from 'jquery';
import 'persian-datepicker/dist/css/persian-datepicker.min.css';

const props = defineProps({
  modelValue: { type: String, default: '' },
  placeholder: { type: String, default: 'انتخاب تاریخ شمسی' }
});

const emit = defineEmits(['update:modelValue']);
const inputRef = ref(null);
let picker = null;
let libReady = null;

if (typeof window !== 'undefined') {
  window.$ = $;
  window.jQuery = $;
}

const ensureLib = () => {
  if (!libReady) {
    libReady = import('persian-date').then(async (m) => {
      const factory = m?.default || m?.persianDate || m;
      if (typeof window !== 'undefined') window.persianDate = factory;
      if (typeof globalThis !== 'undefined') globalThis.persianDate = factory;
      await import('persian-datepicker/dist/js/persian-datepicker.js');
    });
  }
  return libReady;
};

const destroy = () => {
  if (picker?.destroy) picker.destroy();
  picker = null;
};

const init = async () => {
  await nextTick();
  await ensureLib();
  if (!inputRef.value) return;

  destroy();

  if (props.modelValue) {
    inputRef.value.value = props.modelValue;
  }

  $(inputRef.value).pDatepicker({
    format: 'YYYY/MM/DD',
    initialValue: false,
    autoClose: true,
    observer: true,
    calendar: { persian: { locale: 'fa' } },
    toolbox: { calendarSwitch: { enabled: false } },
    onSelect: (unix) => {
      const pd = new window.persianDate(unix);
      const formatted = pd.format('YYYY/MM/DD');
      emit('update:modelValue', formatted);
      if (inputRef.value) inputRef.value.value = formatted;
    }
  });

  picker = $(inputRef.value).data('datepicker') || null;
};

onMounted(init);
onBeforeUnmount(destroy);
</script>

<template>
  <input
    ref="inputRef"
    type="text"
    :placeholder="placeholder"
    autocomplete="off"
    readonly
  />
</template>
