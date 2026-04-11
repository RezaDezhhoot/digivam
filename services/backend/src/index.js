import { createApp } from './app.js';
import { env } from './src/config/env.js';
import { sequelize } from './src/config/database.js';
import './src/models/index.js';
import { runMigrations } from './src/config/migrator.js';
import cron from 'node-cron';
import { expireOutdatedValidations } from './src/services/customer-validation.service.js';

const app = createApp();

const bootstrap = async () => {
  try {
    await sequelize.authenticate();
    console.log('اتصال دیتابیس برقرار شد');
    await runMigrations();

    // Cron: expire outdated validations twice daily at 03:00 and 15:00
    cron.schedule('0 3,15 * * *', async () => {
      try {
        const count = await expireOutdatedValidations();
        console.log(`[cron] ${count} اعتبارسنجی منقضی شد`);
      } catch (error) {
        console.error('[cron] خطا در بررسی انقضای اعتبارسنجی ها:', error);
      }
    });
    console.log('cron بررسی انقضای اعتبارسنجی ها فعال شد (هر روز ساعت 03:00 و 15:00)');

    app.listen(env.port, () => {
      console.log(`سرویس بک اند روی پورت ${env.port} اجرا شد`);
    });
  } catch (error) {
    console.error('اتصال دیتابیس ناموفق بود', error);
    process.exit(1);
  }
};

bootstrap();
