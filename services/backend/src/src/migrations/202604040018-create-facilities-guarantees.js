export const name = '202604040018-create-facilities-guarantees';

export const up = async ({ queryInterface, Sequelize, transaction }) => {
  const tables = await queryInterface.showAllTables({ transaction });
  const tableNames = tables.map((table) =>
    typeof table === 'string' ? table.toLowerCase() : String(table.tableName || '').toLowerCase()
  );

  if (tableNames.includes('facilities_guarantees')) {
    return;
  }

  await queryInterface.createTable(
    'facilities_guarantees',
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
      guarantee_id: {
        type: Sequelize.BIGINT.UNSIGNED,
        allowNull: false
      },
      model_type: {
        type: Sequelize.STRING,
        allowNull: true
      },
      model_id: {
        type: Sequelize.BIGINT.UNSIGNED,
        allowNull: true
      }
    },
    { transaction }
  );

  await queryInterface.addIndex('facilities_guarantees', ['facilities_id'], {
    name: 'facilities_guarantees_facilities_id_index',
    transaction
  });

  await queryInterface.addIndex('facilities_guarantees', ['guarantee_id'], {
    name: 'facilities_guarantees_guarantee_id_index',
    transaction
  });

  await queryInterface.addIndex('facilities_guarantees', ['model_type', 'model_id'], {
    name: 'facilities_guarantees_model_type_model_id_index',
    transaction
  });
};

export const down = async ({ queryInterface, transaction }) => {
  await queryInterface.dropTable('facilities_guarantees', { transaction });
};