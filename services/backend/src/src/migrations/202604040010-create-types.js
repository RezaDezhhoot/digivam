export const name = '202604040010-create-types';

export const up = async ({ queryInterface, Sequelize, transaction }) => {
  const tables = await queryInterface.showAllTables({ transaction });
  const tableNames = tables.map((table) =>
    typeof table === 'string' ? table.toLowerCase() : String(table.tableName || '').toLowerCase()
  );

  if (tableNames.includes('types')) {
    return;
  }

  await queryInterface.createTable(
    'types',
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
      type: {
        type: Sequelize.STRING,
        allowNull: false
      },
      body: {
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

  await queryInterface.addIndex('types', ['type'], {
    name: 'types_type_index',
    transaction
  });

  const now = new Date();
  await queryInterface.bulkInsert(
    'types',
    [
      { title: 'بانک مهر', type: 'banking', body: null, created_at: now, updated_at: now },
      { title: 'بانک ملی', type: 'banking', body: null, created_at: now, updated_at: now },
      { title: 'سند ملکی', type: 'none_banking', body: null, created_at: now, updated_at: now },
      { title: 'سند خودرو', type: 'none_banking', body: null, created_at: now, updated_at: now }
    ],
    { transaction }
  );
};

export const down = async ({ queryInterface, transaction }) => {
  await queryInterface.dropTable('types', { transaction });
};