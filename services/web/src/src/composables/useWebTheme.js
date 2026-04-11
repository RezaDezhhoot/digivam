import { ref, watchEffect } from 'vue';

const STORAGE_KEY = 'dgvam-web-theme';
const DARK = 'dark';
const LIGHT = 'light';

const getSystemTheme = () =>
  window.matchMedia?.('(prefers-color-scheme: dark)').matches ? DARK : LIGHT;

const getStoredTheme = () => {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
};

const theme = ref(getStoredTheme() || getSystemTheme());

const apply = (value) => {
  document.documentElement.setAttribute('data-theme', value);
};

apply(theme.value);

export const useWebTheme = () => {
  const toggleTheme = () => {
    theme.value = theme.value === DARK ? LIGHT : DARK;
  };

  watchEffect(() => {
    apply(theme.value);
    try {
      localStorage.setItem(STORAGE_KEY, theme.value);
    } catch {
      /* ignore */
    }
  });

  return { theme, toggleTheme, isDark: () => theme.value === DARK };
};
