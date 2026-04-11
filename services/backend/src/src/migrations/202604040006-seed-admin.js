import bcrypt from 'bcryptjs';
import { env } from '../config/env.js';

export const name = '202604040006-seed-admin';

export const up = async ({ queryInterface, transaction }) => {
  const [rows] = await queryInterface.sequelize.query(
    'SELECT id FROM users WHERE phone = ? LIMIT 1',
    {
      replacements: [env.adminSeedPhone],
      transaction
    }
  );

  if (rows.length > 0) {
    return;
  }

  const now = new Date();
  const hash = await bcrypt.hash(env.adminSeedPassword, 10);

  await queryInterface.bulkInsert(
    'users',
    [
      {
        name: 'مدیر سیستم',
        phone: env.adminSeedPhone,
        password: hash,
        role: 'admin',
        created_at: now,
        updated_at: now
      }
    ],
    { transaction }
  );
};

export const down = async ({ queryInterface, transaction }) => {
  await queryInterface.bulkDelete('users', { phone: env.adminSeedPhone }, { transaction });
};
