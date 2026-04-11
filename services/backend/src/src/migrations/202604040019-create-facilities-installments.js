export const name = '202604040019-create-facilities-installments';

export const up = async ({ queryInterface, Sequelize, transaction }) => {
  const tables = await queryInterface.showAllTables({ transaction });
  const tableNames = tables.map((table) =>
    typeof table === 'string' ? table.toLowerCase() : String(table.tableName || '').toLowerCase()
  );

  if (tableNames.includes('facilities_installments')) {
    return;
  }

  await queryInterface.createTable(
    'facilities_installments',
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
      month: {
        type: Sequelize.INTEGER.UNSIGNED,
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

  await queryInterface.addIndex('facilities_installments', ['facilities_id'], {
    name: 'facilities_installments_facilities_id_index',
    transaction
  });
};

export const down = async ({ queryInterface, transaction }) => {
  await queryInterface.dropTable('facilities_installments', { transaction });
};