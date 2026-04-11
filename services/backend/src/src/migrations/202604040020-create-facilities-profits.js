export const name = '202604040020-create-facilities-profits';

export const up = async ({ queryInterface, Sequelize, transaction }) => {
  const tables = await queryInterface.showAllTables({ transaction });
  const tableNames = tables.map((table) =>
    typeof table === 'string' ? table.toLowerCase() : String(table.tableName || '').toLowerCase()
  );

  if (tableNames.includes('facilities_profits')) {
    return;
  }

  await queryInterface.createTable(
    'facilities_profits',
    {
      id: {
        type: Sequelize.BIGINT.UNSIGNED,
        allowNull: false,
        autoIncrement: true,
        primaryKey: true
      },
      facilities_id: {
        type: Sequelize.BIGINT.UNSIGNED,
        allowNull: false
      },
      percent: {
        type: Sequelize.DECIMAL(8, 2),
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

  await queryInterface.addIndex('facilities_profits', ['facilities_id'], {
    name: 'facilities_profits_facilities_id_index',
    transaction
  });
};

export const down = async ({ queryInterface, transaction }) => {
  await queryInterface.dropTable('facilities_profits', { transaction });
};