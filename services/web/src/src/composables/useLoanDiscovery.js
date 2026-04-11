export const creditOptions = [
  { label: 'همه', value: 'all' },
  { label: 'نیاز دارد', value: 'yes' },
  { label: 'نیاز ندارد', value: 'no' }
];

export const quickFilterOptions = [
  'کمترین مدارک',
  'سریع ترین پاسخ دهی',
  'بیشترین امتیاز کاربران',
  'کمترین درصد سود'
];

export const quickFilterSortMap = {
  'کمترین مدارک': 'least-docs',
  'سریع ترین پاسخ دهی': 'fastest',
  'بیشترین امتیاز کاربران': 'highest-rating',
  'کمترین درصد سود': 'lowest-rate'
};

export const deriveAmountBounds = (items) => {
  const amounts = items
    .flatMap((item) => [Number(item.minAmount || 0) / 1000000, Number(item.maxAmount || 0) / 1000000])
    .filter((value) => Number.isFinite(value) && value > 0);

  if (!amounts.length) {
    return { min: 10, max: 120 };
  }

  return {
    min: Math.floor(Math.min(...amounts)),
    max: Math.ceil(Math.max(...amounts))
  };
};

export const createLoanDiscoveryFilters = (bounds = { min: 10, max: 120 }, overrides = {}) => ({
  search: '',
  category: 'همه وام ها',
  guarantee: 'همه',
  credit: 'all',
  quickFilter: '',
  amountMin: bounds.min,
  amountMax: bounds.max,
  ...overrides
});

export const buildLoanDiscoveryParams = (filters = {}, bounds = { min: 10, max: 120 }) => ({
  search: String(filters.search || '').trim(),
  category: filters.category && filters.category !== 'همه وام ها' ? filters.category : '',
  guarantee: filters.guarantee && filters.guarantee !== 'همه' ? filters.guarantee : '',
  credit: filters.credit && filters.credit !== 'all' ? filters.credit : '',
  minAmount: Number(filters.amountMin) !== Number(bounds.min) ? Number(filters.amountMin || 0) * 1000000 : '',
  maxAmount: Number(filters.amountMax) !== Number(bounds.max) ? Number(filters.amountMax || 0) * 1000000 : '',
  sort: quickFilterSortMap[filters.quickFilter] || ''
});

export const countActiveLoanFilters = (filters = {}, bounds = { min: 10, max: 120 }) => {
  let count = 0;
  if (String(filters.search || '').trim()) count++;
  if (filters.category && filters.category !== 'همه وام ها') count++;
  if (filters.guarantee && filters.guarantee !== 'همه') count++;
  if (filters.credit && filters.credit !== 'all') count++;
  if (filters.quickFilter) count++;
  if (Number(filters.amountMin) !== Number(bounds.min) || Number(filters.amountMax) !== Number(bounds.max)) count++;
  return count;
};

export const buildLoanFilterSummary = (filters = {}, bounds = { min: 10, max: 120 }) => {
  const parts = [];

  if (filters.category && filters.category !== 'همه وام ها') {
    parts.push(`دسته ${filters.category}`);
  }

  if (filters.guarantee && filters.guarantee !== 'همه') {
    parts.push(`ضمانت ${filters.guarantee}`);
  }

  if (filters.credit === 'yes') {
    parts.push('نیازمند اعتبارسنجی');
  } else if (filters.credit === 'no') {
    parts.push('بدون اعتبارسنجی');
  }

  if (filters.quickFilter) {
    parts.push(filters.quickFilter);
  }

  if (String(filters.search || '').trim()) {
    parts.push(`جستجو: ${filters.search}`);
  }

  if (Number(filters.amountMin) !== Number(bounds.min) || Number(filters.amountMax) !== Number(bounds.max)) {
    parts.push(`بازه ${filters.amountMin} تا ${filters.amountMax} میلیون`);
  }

  return parts.length ? parts.join(' • ') : 'همه فرصت‌های تاییدشده در حال نمایش هستند';
};