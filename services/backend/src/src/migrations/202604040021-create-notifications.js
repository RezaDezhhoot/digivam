export const name = '202604040021-create-notifications';

export const up = async ({ queryInterface, Sequelize, transaction }) => {
  const tables = await queryInterface.showAllTables({ transaction });
  const tableNames = tables.map((table) =>
    typeof table === 'string' ? table.toLowerCase() : String(table.tableName || '').toLowerCase()
  );

  if (tableNames.includes('notifications')) {
    return;
  }

  await queryInterface.createTable(
    'notifications',
    {
      id: {
        type: Sequelize.BIGINT.UNSIGNED,
        allowNull: false,
        autoIncrement: true,
        primaryKey: true
      },
      category: {
        type: Sequelize.STRING,
        allowNull: false
      },
      title: {
        type: Sequelize.STRING,
        allowNull: false
      },
      body: {
        type: Sequelize.TEXT,
        allowNull: false
      },
      is_read: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false
      },
      read_at: {
        type: Sequelize.DATE,
        allowNull: true
      },
      model_type: {
        type: Sequelize.STRING,
        allowNull: false
      },
      model_id: {
        type: Sequelize.BIGINT.UNSIGNED,
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
      metadata: {
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

  await queryInterface.addIndex('notifications', ['model_type', 'model_id'], {
    name: 'notifications_model_type_model_id_index',
    transaction
  });
  await queryInterface.addIndex('notifications', ['sender_type', 'sender_id'], {
    name: 'notifications_sender_type_sender_id_index',
    transaction
  });
  await queryInterface.addIndex('notifications', ['category'], {
    name: 'notifications_category_index',
    transaction
  });
  await queryInterface.addIndex('notifications', ['is_read'], {
    name: 'notifications_is_read_index',
    transaction
  });
};

export const down = async ({ queryInterface, transaction }) => {
  await queryInterface.dropTable('notifications', { transaction });
};