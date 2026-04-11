export const name = '202604110001-create-facility-bookmarks';

export const up = async ({ queryInterface, Sequelize, transaction }) => {
  const tables = await queryInterface.showAllTables({ transaction });
  const tableNames = tables.map((table) =>
    typeof table === 'string' ? table.toLowerCase() : String(table.tableName || '').toLowerCase()
  );

  if (tableNames.includes('facility_bookmarks')) {
    return;
  }

  await queryInterface.createTable(
    'facility_bookmarks',
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
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    },
    { transaction }
  );

  await queryInterface.addIndex('facility_bookmarks', ['customer_id', 'facility_id'], {
    unique: true,
    name: 'facility_bookmarks_customer_facility_unique',
    transaction
  });

  await queryInterface.addIndex('facility_bookmarks', ['customer_id'], {
    name: 'facility_bookmarks_customer_id',
    transaction
  });

  await queryInterface.addIndex('facility_bookmarks', ['facility_id'], {
    name: 'facility_bookmarks_facility_id',
    transaction
  });
};

export const down = async ({ queryInterface, transaction }) => {
  await queryInterface.dropTable('facility_bookmarks', { transaction });
};
