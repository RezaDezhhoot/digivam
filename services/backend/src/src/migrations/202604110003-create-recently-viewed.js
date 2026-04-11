export const name = '202604110003-create-recently-viewed';

export const up = async ({ queryInterface, Sequelize, transaction }) => {
  const tables = await queryInterface.showAllTables({ transaction });
  const tableNames = tables.map((table) =>
    typeof table === 'string' ? table.toLowerCase() : String(table.tableName || '').toLowerCase()
  );

  if (tableNames.includes('recently_viewed')) {
    return;
  }

  await queryInterface.createTable(
    'recently_viewed',
    {
      id: {
        type: Sequelize.BIGINT.UNSIGNED,
        allowNull: false,
        autoIncrement: true,
        primaryKey: true
      },
      customer_id: {
        type: Sequelize.BIGINT.UNSIGNED,
        allowNull: false
      },
      facility_id: {
        type: Sequelize.BIGINT.UNSIGNED,
        allowNull: false
      },
      viewed_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    },
    { transaction }
  );

  await queryInterface.addIndex('recently_viewed', ['customer_id', 'facility_id'], {
    unique: true,
    name: 'recently_viewed_customer_facility_unique',
    transaction
  });

  await queryInterface.addIndex('recently_viewed', ['customer_id', 'viewed_at'], {
    name: 'recently_viewed_customer_viewed_at',
    transaction
  });
};

export const down = async ({ queryInterface, transaction }) => {
  await queryInterface.dropTable('recently_viewed', { transaction });
};
