const buckets = new Map();

const now = () => Date.now();

const clean = (key) => {
  const entry = buckets.get(key);
  if (!entry) {
    return;
  }

  if (entry.expiresAt <= now()) {
    buckets.delete(key);
  }
};

export const tooManyAttempts = (key, maxAttempts) => {
  clean(key);
  const entry = buckets.get(key);
  return Boolean(entry && entry.count >= maxAttempts);
};

export const hitAttempt = (key, ttlMs) => {
  clean(key);
  const entry = buckets.get(key);
  if (!entry) {
    buckets.set(key, { count: 1, expiresAt: now() + ttlMs });
    return;
  }

  entry.count += 1;
};

export const clearAttempts = (key) => {
  buckets.delete(key);
};
