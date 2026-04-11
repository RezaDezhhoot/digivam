export const toPage = (value) => {
  const num = Number(value || 1);
  return Number.isNaN(num) || num < 1 ? 1 : num;
};

export const toLimit = (value, options = {}) => {
  const { defaultLimit = 10, maxLimit = 100 } = options;
  const num = Number(value || defaultLimit);

  if (Number.isNaN(num) || num < 1) {
    return defaultLimit;
  }

  return Math.min(num, maxLimit);
};

export const getPagination = (query = {}, options = {}) => {
  const page = toPage(query.page);
  const limit = toLimit(query.limit, options);

  return {
    page,
    limit,
    offset: (page - 1) * limit
  };
};

export const createPaginationResult = ({ items = [], total = 0, page = 1, limit = 10, extra = {} }) => ({
  items,
  total,
  page,
  limit,
  pages: total > 0 ? Math.ceil(total / limit) : 0,
  ...extra
});