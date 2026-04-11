<script setup>
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import $ from 'jquery';
import 'persian-datepicker/dist/css/persian-datepicker.min.css';

const props = defineProps({
  modelValue: {
    type: String,
    default: ''
  },
  placeholder: {
    type: String,
    default: 'انتخاب تاریخ'
  }
});

const emit = defineEmits(['update:modelValue']);
const inputRef = ref(null);
let picker = null;
let libraryPromise = null;

const pad = (value) => String(value).padStart(2, '0');

const gregorianIsoToUnix = (value) => {
  const normalized = String(value || '').trim();
  if (!normalized) {
    return null;
  }

  const date = new Date(`${normalized}T00:00:00`);
  const unix = date.getTime();
  return Number.isNaN(unix) ? null : unix;
};

const unixToGregorianIso = (unix) => {
  const date = new Date(Number(unix));
  if (Number.isNaN(date.getTime())) {
    return '';
  }

  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
};

if (typeof window !== 'undefined') {
  window.$ = $;
  window.jQuery = $;
}

const destroyPicker = () => {
  if (picker?.destroy) {
    picker.destroy();
  }
  picker = null;
};

const ensureLibrary = async () => {
  if (!libraryPromise) {
    libraryPromise = import('persian-date').then(async (module) => {
      const persianDateFactory = module?.default || module?.persianDate || module;

      if (typeof window !== 'undefined') {
        window.persianDate = persianDateFactory;
      }

      if (typeof globalThis !== 'undefined') {
        globalThis.persianDate = persianDateFactory;
      }

      await import('persian-datepicker/dist/js/persian-datepicker.js');
    });
  }

  await libraryPromise;
};

const initPicker = async () => {
  await nextTick();
  await ensureLibrary();

  if (!inputRef.value) {
    return;
  }

  destroyPicker();
  inputRef.value.value = '';

  $(inputRef.value).pDatepicker({
    format: 'YYYY/MM/DD',
    initialValue: false,
    autoClose: true,
    observer: true,
    calendar: {
      persian: {
        locale: 'fa'
      }
    },
    onSelect: (unixDate) => {
      emit('update:modelValue', unixToGregorianIso(unixDate));
    }
  });

  picker = $(inputRef.value).data('datepicker') || null;

  const unixValue = gregorianIsoToUnix(props.modelValue);
  if (picker && unixValue) {
    picker.setDate(unixValue);
  }
};

watch(
  () => props.modelValue,
  async (nextValue) => {
    const nextUnix = gregorianIsoToUnix(nextValue);
    const currentUnix = picker?.model?.state?.selected?.unixDate || null;

    if (nextUnix && currentUnix === nextUnix) {
      return;
    }

    if (!nextValue) {
      await initPicker();
      return;
    }

    if (!picker) {
      await initPicker();
      return;
    }

    picker.setDate(nextUnix);
  }
);

onMounted(initPicker);
onBeforeUnmount(destroyPicker);
</script>

<template>
  <div class="persian-datepicker-input">
    <input ref="inputRef" type="text" class="form-control" :placeholder="placeholder" autocomplete="off" readonly />
  </div>
</template>

<style scoped>
.persian-datepicker-input {
  width: 100%;
}
</style>
