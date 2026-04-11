import { computed, ref } from 'vue';

const THEME_KEY = 'broker_theme';
const defaultTheme =
  typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light';
const theme = ref(typeof window !== 'undefined' ? localStorage.getItem(THEME_KEY) || defaultTheme : 'light');

const applyTheme = () => {
  if (typeof document === 'undefined') {
    return;
  }

  document.documentElement.setAttribute('data-theme', theme.value);
  localStorage.setItem(THEME_KEY, theme.value);
};

if (typeof document !== 'undefined') {
  applyTheme();
}

export const useTheme = () => {
  const setTheme = (value) => {
    theme.value = value;
    applyTheme();
  };

  const toggleTheme = () => {
    setTheme(theme.value === 'dark' ? 'light' : 'dark');
  };

  return {
    theme,
    isDark: computed(() => theme.value === 'dark'),
    setTheme,
    toggleTheme
  };
};
