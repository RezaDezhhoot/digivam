export const name = '202604040012-create-transactions';

export const up = async ({ queryInterface, Sequelize, transaction }) => {
  const tables = await queryInterface.showAllTables({ transaction });
  const tableNames = tables.map((table) =>
    typeof table === 'string' ? table.toLowerCase() : String(table.tableName || '').toLowerCase()
  );

  if (tableNames.includes('transactions')) {
    return;
  }

  await queryInterface.createTable(
    'transactions',
    {
      id: {
        type: Sequelize.BIGINT.UNSIGNED,
        allowNull: false,
        autoIncrement: true,
        primaryKey: true
      },
      payable_type: {
        type: Sequelize.STRING,
        allowNull: false
      },
      payable_id: {
        type: Sequelize.BIGINT.UNSIGNED,
        allowNull: false
      },
      wallet_id: {
        type: Sequelize.BIGINT.UNSIGNED,
        allowNull: false,
        references: {
          model: 'wallets',
          key: 'id'
        },
        onDelete: 'CASCADE'
      },
      type: {
        type: Sequelize.ENUM('deposit', 'withdraw'),
        allowNull: false
      },
      amount: {
        type: Sequelize.DECIMAL(64, 0),
        allowNull: false
      },
      confirmed: {
        type: Sequelize.BOOLEAN,
        allowNull: false
      },
      meta: {
        type: Sequelize.JSON,
        allowNull: true
      },
      uuid: {
        type: Sequelize.CHAR(36),
        allowNull: false
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: true
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: true
      },
      deleted_at: {
        type: Sequelize.DATE,
        allowNull: true
      }
    },
    { transaction }
  );

  await queryInterface.addConstraint('transactions', {
    fields: ['uuid'],
    type: 'unique',
    name: 'transactions_uuid_unique',
    transaction
  });
  await queryInterface.addIndex('transactions', ['payable_type', 'payable_id'], {
    name: 'transactions_payable_type_payable_id_index',
    transaction
  });
  await queryInterface.addIndex('transactions', ['payable_type', 'payable_id'], {
    name: 'payable_type_payable_id_ind',
    transaction
  });
  await queryInterface.addIndex('transactions', ['payable_type', 'payable_id', 'type'], {
    name: 'payable_type_ind',
    transaction
  });
  await queryInterface.addIndex('transactions', ['payable_type', 'payable_id', 'confirmed'], {
    name: 'payable_confirmed_ind',
    transaction
  });
  await queryInterface.addIndex('transactions', ['payable_type', 'payable_id', 'type', 'confirmed'], {
    name: 'payable_type_confirmed_ind',
    transaction
  });
  await queryInterface.addIndex('transactions', ['type'], {
    name: 'transactions_type_index',
    transaction
  });
  await queryInterface.addIndex('transactions', ['wallet_id'], {
    name: 'transactions_wallet_id_foreign',
    transaction
  });
};

export const down = async ({ queryInterface, transaction }) => {
  await queryInterface.dropTable('transactions', { transaction });
};