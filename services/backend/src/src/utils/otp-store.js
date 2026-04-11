const otpByPhone = new Map();
const attemptsByKey = new Map();

const now = () => Date.now();

const clearExpiredAttempt = (key) => {
  const state = attemptsByKey.get(key);
  if (!state) {
    return;
  }

  if (state.expiresAt <= now()) {
    attemptsByKey.delete(key);
  }
};

export const tooManyAttempts = (key, maxAttempts) => {
  clearExpiredAttempt(key);
  const state = attemptsByKey.get(key);
  if (!state) {
    return false;
  }
  return state.count >= maxAttempts;
};

export const hitAttempt = (key, ttlMs) => {
  clearExpiredAttempt(key);
  const state = attemptsByKey.get(key);

  if (!state) {
    attemptsByKey.set(key, { count: 1, expiresAt: now() + ttlMs });
    return;
  }

  state.count += 1;
};

export const setOtp = (phone, code, ttlMs) => {
  otpByPhone.set(phone, {
    code,
    expiresAt: now() + ttlMs
  });
};

export const hasActiveOtp = (phone) => {
  const record = otpByPhone.get(phone);
  if (!record) {
    return false;
  }

  if (record.expiresAt <= now()) {
    otpByPhone.delete(phone);
    return false;
  }

  return true;
};

export const verifyOtp = (phone, code) => {
  const record = otpByPhone.get(phone);
  if (!record) {
    return false;
  }

  if (record.expiresAt <= now()) {
    otpByPhone.delete(phone);
    return false;
  }

  if (record.code !== code) {
    return false;
  }

  otpByPhone.delete(phone);
  return true;
};

export const secondsToResend = (phone) => {
  const record = otpByPhone.get(phone);
  if (!record) {
    return 0;
  }

  const left = Math.floor((record.expiresAt - now()) / 1000);
  return left > 0 ? left : 0;
};
