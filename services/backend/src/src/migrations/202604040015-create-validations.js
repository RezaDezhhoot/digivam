export const name = '202604040015-create-validations';

export const up = async ({ queryInterface, Sequelize, transaction }) => {
  const tables = await queryInterface.showAllTables({ transaction });
  const tableNames = tables.map((table) =>
    typeof table === 'string' ? table.toLowerCase() : String(table.tableName || '').toLowerCase()
  );

  if (tableNames.includes('validations')) {
    return;
  }

  await queryInterface.createTable(
    'validations',
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
      valid_for: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: true
      },
      amount: {
        type: Sequelize.DECIMAL(40, 3),
        allowNull: true
      },
      available: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true
      },
      description: {
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

  await queryInterface.addIndex('validations', ['type'], {
    name: 'validations_type_index',
    transaction
  });

  await queryInterface.addIndex('validations', ['title'], {
    name: 'title',
    transaction
  });

  const now = new Date();
  await queryInterface.bulkInsert(
    'validations',
    [
      { id: 1, title: 'اعتبار سنجی اعتباریتو', type: 'eetebarito', valid_for: 25, amount: '10000.000', available: true, description: 'sadasdsad', deleted_at: null, created_at: now, updated_at: now },
      { id: 2, title: 'مرات جون', type: 'meraat', valid_for: 90, amount: '10000.000', available: true, description: 'asdasd', deleted_at: null, created_at: now, updated_at: now }
    ],
    { transaction }
  );
};

export const down = async ({ queryInterface, transaction }) => {
  await queryInterface.dropTable('validations', { transaction });
};