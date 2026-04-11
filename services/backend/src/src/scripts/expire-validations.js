import cron from 'node-cron';
import '../models/index.js';
import { sequelize } from '../config/database.js';
import { expireOutdatedValidations } from '../services/customer-validation.service.js';

const runExpiry = async () => {
  try {
    const count = await expireOutdatedValidations();
    console.log(`[${new Date().toISOString()}] ${count} اعتبارسنجی منقضی شد`);
  } catch (error) {
    console.error(`[${new Date().toISOString()}] خطا در بررسی انقضای اعتبارسنجی ها:`, error);
  }
};

const start = async () => {
  try {
    await sequelize.authenticate();
    console.log('اتصال دیتابیس برقرار شد - شروع cron بررسی انقضای اعتبارسنجی ها');

    // Run twice daily at 03:00 and 15:00
    cron.schedule('0 3,15 * * *', runExpiry);

    // Run once on startup
    await runExpiry();

    console.log('cron بررسی انقضای اعتبارسنجی ها فعال شد (هر روز ساعت 03:00 و 15:00)');
  } catch (error) {
    console.error('خطا در راه‌اندازی cron:', error);
    process.exit(1);
  }
};

start();
