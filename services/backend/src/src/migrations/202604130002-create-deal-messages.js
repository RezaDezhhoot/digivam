export const name = '202604130002-create-deal-messages';

export const up = async ({ queryInterface, Sequelize, transaction }) => {
  const tables = await queryInterface.showAllTables({ transaction });
  const tableNames = tables.map((table) =>
    typeof table === 'string' ? table.toLowerCase() : String(table.tableName || '').toLowerCase()
  );

  if (tableNames.includes('deal_messages')) {
    return;
  }

  await queryInterface.createTable(
    'deal_messages',
    {
      id: {
        type: Sequelize.BIGINT.UNSIGNED,
        allowNull: false,
        autoIncrement: true,
        primaryKey: true
      },
      deal_id: {
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
      body: {
        type: Sequelize.TEXT,
        allowNull: false
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

  await queryInterface.addIndex('deal_messages', ['deal_id', 'created_at'], {
    name: 'deal_messages_deal_created_index',
    transaction
  });

  await queryInterface.addIndex('deal_messages', ['sender_type', 'sender_id'], {
    name: 'deal_messages_sender_index',
    transaction
  });
};
