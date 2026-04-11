import { PageView } from '../models/page-view.model.js';
import { sequelize } from '../config/database.js';

const todayString = () => {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

export const trackPageView = async (_req, _res, next) => {
  try {
    const today = todayString();
    const [affectedCount] = await PageView.update(
      { count: sequelize.literal('count + 1') },
      { where: { date: today } }
    );
    if (affectedCount === 0) {
      await PageView.create({ date: today, count: 1 }).catch(() => {
        return PageView.update(
          { count: sequelize.literal('count + 1') },
          { where: { date: today } }
        );
      });
    }
  } catch {
    /* non-blocking */
  }
  next();
};
