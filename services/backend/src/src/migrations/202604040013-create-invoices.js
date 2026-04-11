export const name = '202604040013-create-invoices';

export const up = async ({ queryInterface, Sequelize, transaction }) => {
  const tables = await queryInterface.showAllTables({ transaction });
  const tableNames = tables.map((table) =>
    typeof table === 'string' ? table.toLowerCase() : String(table.tableName || '').toLowerCase()
  );

  if (tableNames.includes('invoices')) {
    return;
  }

  await queryInterface.createTable(
    'invoices',
    {
      id: {
        type: Sequelize.BIGINT.UNSIGNED,
        allowNull: false,
        autoIncrement: true,
        primaryKey: true
      },
      first_name: {
        type: Sequelize.STRING,
        allowNull: true
      },
      last_name: {
        type: Sequelize.STRING,
        allowNull: true
      },
      national_code: {
        type: Sequelize.STRING,
        allowNull: true
      },
      status: {
        type: Sequelize.STRING,
        allowNull: false
      },
      driver: {
        type: Sequelize.STRING,
        allowNull: false
      },
      transaction_id: {
        type: Sequelize.STRING,
        allowNull: true
      },
      payment_ref: {
        type: Sequelize.STRING,
        allowNull: true
      },
      amount: {
        type: Sequelize.DECIMAL(25, 3),
        allowNull: false
      },
      discount: {
        type: Sequelize.DECIMAL(25, 3),
        allowNull: false,
        defaultValue: 0
      },
      total_amount: {
        type: Sequelize.DECIMAL(25, 3),
        allowNull: false
      },
      paid_at: {
        type: Sequelize.DATE,
        allowNull: true
      },
      user_id: {
        type: Sequelize.BIGINT.UNSIGNED,
        allowNull: true
      },
      payable_type: {
        type: Sequelize.STRING,
        allowNull: true
      },
      payable_id: {
        type: Sequelize.BIGINT.UNSIGNED,
        allowNull: true
      },
      ip: {
        type: Sequelize.STRING,
        allowNull: true
      },
      payable_data: {
        type: Sequelize.JSON,
        allowNull: true
      },
      data: {
        type: Sequelize.JSON,
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

  await queryInterface.addIndex('invoices', ['payable_type', 'payable_id'], {
    name: 'invoices_payable_type_payable_id_index',
    transaction
  });
  await queryInterface.addIndex('invoices', ['payment_ref'], {
    name: 'invoices_payment_ref_index',
    transaction
  });
  await queryInterface.addIndex('invoices', ['user_id'], {
    name: 'invoices_user_id_index',
    transaction
  });
};

export const down = async ({ queryInterface, transaction }) => {
  await queryInterface.dropTable('invoices', { transaction });
};