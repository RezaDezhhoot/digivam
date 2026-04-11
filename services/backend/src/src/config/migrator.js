import fs from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { Sequelize } from 'sequelize';
import { sequelize } from './database.js';

const ensureMigrationsTable = async () => {
  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS migrations (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      name VARCHAR(255) NOT NULL UNIQUE,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);
};

const getExecuted = async () => {
  const [rows] = await sequelize.query('SELECT name FROM migrations');
  return new Set(rows.map((row) => row.name));
};

const insertExecuted = async (name, transaction) => {
  await sequelize.query('INSERT INTO migrations (name) VALUES (?)', {
    replacements: [name],
    transaction
  });
};

export const runMigrations = async () => {
  await ensureMigrationsTable();

  const migrationsDir = path.resolve(process.cwd(), 'src', 'migrations');
  const files = (await fs.readdir(migrationsDir))
    .filter((file) => file.endsWith('.js'))
    .sort((a, b) => a.localeCompare(b));

  const executed = await getExecuted();
  const queryInterface = sequelize.getQueryInterface();
  

  for (const file of files) {
    const modulePath = pathToFileURL(path.join(migrationsDir, file)).href;
    const migration = await import(modulePath);
    const migrationName = migration.name || file;

    if (executed.has(migrationName)) {
      continue;
    }

    await sequelize.transaction(async (transaction) => {
      await migration.up({
        queryInterface,
        Sequelize,
        sequelize,
        transaction
      });
      await insertExecuted(migrationName, transaction);
    });

    console.log(`مایگریشن اعمال شد: ${migrationName}`);
  }
};
