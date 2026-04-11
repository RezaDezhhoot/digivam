export const name = '202604040009-create-tickets';

export const up = async ({ queryInterface, Sequelize, transaction }) => {
  const tables = await queryInterface.showAllTables({ transaction });
  const tableNames = tables.map((table) =>
    typeof table === 'string' ? table.toLowerCase() : String(table.tableName || '').toLowerCase()
  );

  if (tableNames.includes('tickets')) {
    return;
  }

  await queryInterface.createTable(
    'tickets',
    {
      id: {
        type: Sequelize.BIGINT.UNSIGNED,
        allowNull: false,
        autoIncrement: true,
        primaryKey: true
      },
      subject: {
        type: Sequelize.STRING,
        allowNull: true
      },
      body: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      parent_id: {
        type: Sequelize.BIGINT.UNSIGNED,
        allowNull: true
      },
      status: {
        type: Sequelize.STRING,
        allowNull: false
      },
      sender_type: {
        type: Sequelize.STRING,
        allowNull: false
      },
      sender_id: {
        type: Sequelize.BIGINT.UNSIGNED,
        allowNull: false
      },
      admin: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false
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

  await queryInterface.addIndex('tickets', ['sender_type', 'sender_id'], {
    name: 'tickets_sender_type_sender_id_index',
    transaction
  });
  await queryInterface.addIndex('tickets', ['parent_id'], {
    name: 'tickets_parent_id_index',
    transaction
  });
  await queryInterface.addIndex('tickets', ['status'], {
    name: 'tickets_status_index',
    transaction
  });
};

export const down = async ({ queryInterface, transaction }) => {
  await queryInterface.dropTable('tickets', { transaction });
};