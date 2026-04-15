export const name = '202604130001-create-tutorials';

export const up = async ({ queryInterface, Sequelize, transaction }) => {
  const tables = await queryInterface.showAllTables({ transaction });
  const tableNames = tables.map((table) =>
    typeof table === 'string' ? table.toLowerCase() : String(table.tableName || '').toLowerCase()
  );

  if (tableNames.includes('tutorials')) {
    return;
  }

  await queryInterface.createTable(
    'tutorials',
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
      description: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      sort: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0
      },
      status: {
        type: Sequelize.STRING,
        allowNull: false,
        defaultValue: 'active'
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

  await queryInterface.addIndex('tutorials', ['status'], {
    name: 'tutorials_status_index',
    transaction
  });
  await queryInterface.addIndex('tutorials', ['sort'], {
    name: 'tutorials_sort_index',
    transaction
  });
};

export const down = async ({ queryInterface, transaction }) => {
  await queryInterface.dropTable('tutorials', { transaction });
};
