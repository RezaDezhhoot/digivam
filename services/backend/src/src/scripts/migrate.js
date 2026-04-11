import { sequelize } from '../config/database.js';
import { runMigrations } from '../config/migrator.js';

const migrate = async () => {
  try {
    await sequelize.authenticate();
    await runMigrations();
    console.log('مایگریشن ها با موفقیت انجام شد');
    process.exit(0);
  } catch (error) {
    console.error('اجرای مایگریشن ناموفق بود', error.message);
    process.exit(1);
  }
};

migrate();
