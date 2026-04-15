import { createApp } from './app.js';
import { env } from './src/config/env.js';
import { sequelize } from './src/config/database.js';
import './src/models/index.js';
import { runMigrations } from './src/config/migrator.js';
import cron from 'node-cron';
import { expireOutdatedValidations } from './src/services/customer-validation.service.js';
import { startupLogger, exceptionLogger } from './src/config/logger.js';

const app = createApp();

process.on('uncaughtException', (error) => {
  exceptionLogger.error(error.message, { sub_category: 'uncaughtException', stack: error.stack });
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  const msg = reason instanceof Error ? reason.message : String(reason);
  const stack = reason instanceof Error ? reason.stack : null;
  exceptionLogger.error(msg, { sub_category: 'unhandledRejection', stack });
});

const bootstrap = async () => {
  try {
    await sequelize.authenticate();
    startupLogger.info('اتصال دیتابیس برقرار شد', { sub_category: 'database' });
    await runMigrations();
    startupLogger.info('مایگریشن ها اجرا شد', { sub_category: 'migration' });

    // Cron: expire outdated validations twice daily at 03:00 and 15:00
    cron.schedule('0 3,15 * * *', async () => {
      try {
        const count = await expireOutdatedValidations();
        startupLogger.info(`[cron] ${count} اعتبارسنجی منقضی شد`, { sub_category: 'cron' });
      } catch (error) {
        exceptionLogger.error(error.message, { sub_category: 'cron', stack: error.stack });
      }
    });
    startupLogger.info('cron بررسی انقضای اعتبارسنجی ها فعال شد (هر روز ساعت 03:00 و 15:00)', { sub_category: 'cron' });

    app.listen(env.port, () => {
      startupLogger.info(`سرویس بک اند روی پورت ${env.port} اجرا شد`, { sub_category: 'server' });
    });
  } catch (error) {
    exceptionLogger.error('خطا در راه‌اندازی سرویس', { sub_category: 'bootstrap', stack: error.stack });
    process.exit(1);
  }
};

bootstrap();
