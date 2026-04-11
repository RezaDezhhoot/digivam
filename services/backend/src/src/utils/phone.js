export const normalizePhone = (value) => {
  const digits = String(value || '').replace(/\D/g, '');

  if (digits.startsWith('09') && digits.length === 11) {
    return digits;
  }

  if (digits.startsWith('9') && digits.length === 10) {
    return `0${digits}`;
  }

  return digits;
};

export const isIranMobile = (value) => /^(9|09)[0-9]{9}$/.test(String(value || ''));
