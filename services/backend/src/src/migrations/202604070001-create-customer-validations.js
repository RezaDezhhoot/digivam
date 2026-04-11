export const name = '202604070001-create-customer-validations';

export const up = async ({ queryInterface, Sequelize, transaction }) => {
  const tables = await queryInterface.showAllTables({ transaction });
  const tableNames = tables.map((table) =>
    typeof table === 'string' ? table.toLowerCase() : String(table.tableName || '').toLowerCase()
  );

  if (tableNames.includes('customer_validations')) {
    return;
  }

  await queryInterface.createTable(
    'customer_validations',
    {
      id: {
        type: Sequelize.BIGINT.UNSIGNED,
        allowNull: false,
        autoIncrement: true,
        primaryKey: true
      },
      customer_id: {
        type: Sequelize.BIGINT.UNSIGNED,
        allowNull: false,
        references: { model: 'customers', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      validation_id: {
        type: Sequelize.BIGINT.UNSIGNED,
        allowNull: false,
        references: { model: 'validations', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      status: {
        type: Sequelize.STRING,
        allowNull: false,
        defaultValue: 'submit'
      },
      data: {
        type: Sequelize.JSON,
        allowNull: true
      },
      result: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      paid_amount: {
        type: Sequelize.DECIMAL(40, 3),
        allowNull: true
      },
      expires_at: {
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

  await queryInterface.addIndex('customer_validations', ['customer_id'], {
    name: 'cv_customer_id_index',
    transaction
  });

  await queryInterface.addIndex('customer_validations', ['validation_id'], {
    name: 'cv_validation_id_index',
    transaction
  });

  await queryInterface.addIndex('customer_validations', ['status'], {
    name: 'cv_status_index',
    transaction
  });

  await queryInterface.addIndex('customer_validations', ['expires_at'], {
    name: 'cv_expires_at_index',
    transaction
  });
};

export const down = async ({ queryInterface, transaction }) => {
  await queryInterface.dropTable('customer_validations', { transaction });
};
