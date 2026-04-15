<script setup>
import { computed, nextTick, ref, watch } from 'vue';

const props = defineProps({
  modelValue: { type: String, default: '' },
  length: { type: Number, default: 4 },
  disabled: { type: Boolean, default: false },
  autoFocus: { type: Boolean, default: false }
});

const emit = defineEmits(['update:modelValue', 'complete']);
const inputRefs = ref([]);

const digits = computed(() => Array.from({ length: props.length }, (_, index) => String(props.modelValue || '').slice(index, index + 1) || ''));

const focusIndex = (index) => {
  nextTick(() => {
    inputRefs.value[index]?.focus();
    inputRefs.value[index]?.select?.();
  });
};

const updateValue = (nextDigits) => {
  const nextValue = nextDigits.join('');
  emit('update:modelValue', nextValue);

  if (nextDigits.every(Boolean)) {
    emit('complete', nextValue);
  }
};

const handleInput = (index, event) => {
  const value = String(event.target.value || '').replace(/\D/g, '');
  const nextDigits = [...digits.value];

  if (!value) {
    nextDigits[index] = '';
    updateValue(nextDigits);
    return;
  }

  const insertedDigits = value.slice(0, props.length - index).split('');
  insertedDigits.forEach((digit, offset) => {
    nextDigits[index + offset] = digit;
  });

  updateValue(nextDigits);
  focusIndex(Math.min(index + insertedDigits.length, props.length - 1));
};

const handleKeydown = (index, event) => {
  if (event.key === 'Backspace' && !digits.value[index] && index > 0) {
    const nextDigits = [...digits.value];
    nextDigits[index - 1] = '';
    updateValue(nextDigits);
    focusIndex(index - 1);
    event.preventDefault();
    return;
  }

  if (event.key === 'ArrowLeft' && index < props.length - 1) {
    focusIndex(index + 1);
    event.preventDefault();
    return;
  }

  if (event.key === 'ArrowRight' && index > 0) {
    focusIndex(index - 1);
    event.preventDefault();
  }
};

const handlePaste = (event) => {
  event.preventDefault();
  const raw = event.clipboardData?.getData('text') || '';
  const pastedDigits = raw.replace(/\D/g, '').slice(0, props.length).split('');
  const nextDigits = Array.from({ length: props.length }, (_, index) => pastedDigits[index] || '');
  updateValue(nextDigits);
  focusIndex(Math.min(Math.max(pastedDigits.length, 1), props.length) - 1);
};

watch(
  () => props.autoFocus,
  (value) => {
    if (value && !props.disabled) {
      focusIndex(0);
    }
  },
  { immediate: true }
);
</script>

<template>
  <div class="otp-input-root" dir="ltr" @paste="handlePaste">
    <input
      v-for="(_, index) in digits"
      :key="index"
      :ref="(element) => (inputRefs[index] = element)"
      :value="digits[index]"
      type="text"
      inputmode="numeric"
      autocomplete="one-time-code"
      maxlength="1"
      class="otp-input-box"
      :disabled="disabled"
      @input="handleInput(index, $event)"
      @keydown="handleKeydown(index, $event)"
      @focus="$event.target.select()"
    />
  </div>
</template>

<style scoped src="./styles/OtpCodeInput.css"></style>