export const name = '202604040008-create-guarantees';

export const up = async ({ queryInterface, Sequelize, transaction }) => {
  const tables = await queryInterface.showAllTables({ transaction });
  const tableNames = tables.map((table) =>
    typeof table === 'string' ? table.toLowerCase() : String(table.tableName || '').toLowerCase()
  );

  if (!tableNames.includes('guarantees')) {
    await queryInterface.createTable(
      'guarantees',
      {
        id: {
          type: Sequelize.BIGINT.UNSIGNED,
          allowNull: false,
          autoIncrement: true,
          primaryKey: true
        },
        title: {
          type: Sequelize.STRING,
          allowNull: false
        },
        help: {
          type: Sequelize.TEXT,
          allowNull: true
        },
        deleted_at: {
          type: Sequelize.DATE,
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
    { title: 'کسر از حقوق', help: 'راهنمای ارائه مدارک کسر از حقوق', created_at: now, updated_at: now },
    { title: 'صیادی', help: null, created_at: now, updated_at: now },
    { title: 'سند ملکی', help: null, created_at: now, updated_at: now }
  ];

  for (const item of defaults) {
    const [rows] = await queryInterface.sequelize.query('SELECT id FROM guarantees WHERE title = ? LIMIT 1', {
      replacements: [item.title],
      transaction
    });

    if (rows.length === 0) {
      await queryInterface.bulkInsert('guarantees', [item], { transaction });
    }
  }
};

export const down = async ({ queryInterface, transaction }) => {
  await queryInterface.dropTable('guarantees', { transaction });
};