export const name = '202604040007-create-settings';

export const up = async ({ queryInterface, Sequelize, transaction }) => {
  const tables = await queryInterface.showAllTables({ transaction });
  const tableNames = tables.map((table) =>
    typeof table === 'string' ? table.toLowerCase() : String(table.tableName || '').toLowerCase()
  );

  if (!tableNames.includes('settings')) {
    await queryInterface.createTable(
      'settings',
      {
        id: {
          type: Sequelize.BIGINT.UNSIGNED,
          allowNull: false,
          autoIncrement: true,
          primaryKey: true
        },
        name: {
          type: Sequelize.STRING,
          allowNull: false,
          unique: true
        },
        value: {
          type: Sequelize.TEXT,
          allowNull: true
        },
        created_at: {
          type: Sequelize.DATE,
          allowNull: true
        },
        updated_at: {
          type: Sequelize.DATE,
          allowNull: true
        }
      },
      { transaction }
    );
  }

  const now = new Date();
  const defaults = [
    { name: 'site_name', value: 'دی جی وام', created_at: now, updated_at: now },
    { name: 'site_logo', value: null, created_at: now, updated_at: now },
    { name: 'site_description', value: 'سامانه مدیریت امتیاز وام', created_at: now, updated_at: now },
    { name: 'decrease_validity', value: '0', created_at: now, updated_at: now },
    { name: 'loan_admin_confirm1', value: '0', created_at: now, updated_at: now },
    { name: 'loan_admin_confirm2', value: '0', created_at: now, updated_at: now }
  ];

  for (const item of defaults) {
    const [rows] = await queryInterface.sequelize.query('SELECT id FROM settings WHERE name = ? LIMIT 1', {
      replacements: [item.name],
      transaction
    });

    if (rows.length === 0) {
      await queryInterface.bulkInsert('settings', [item], { transaction });
    }
  }
};

export const down = async ({ queryInterface, transaction }) => {
  await queryInterface.dropTable('settings', { transaction });
};