export const name = '202604130003-create-deal-message-reads';

export const up = async ({ queryInterface, Sequelize, transaction }) => {
  const tables = await queryInterface.showAllTables({ transaction });
  const tableNames = tables.map((table) =>
    typeof table === 'string' ? table.toLowerCase() : String(table.tableName || '').toLowerCase()
  );

  if (!tableNames.includes('deal_message_reads')) {
    await queryInterface.createTable(
      'deal_message_reads',
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
        reader_type: {
          type: Sequelize.STRING,
          allowNull: false
        },
        reader_id: {
          type: Sequelize.BIGINT.UNSIGNED,
          allowNull: false
        },
        last_read_at: {
          type: Sequelize.DATE,
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

    await queryInterface.addIndex('deal_message_reads', ['deal_id', 'reader_type', 'reader_id'], {
      name: 'deal_message_reads_unique_reader',
      unique: true,
      transaction
    });
  }

  // Make act_by nullable
  await queryInterface.changeColumn(
    'deals',
    'act_by',
    {
      type: Sequelize.STRING,
      allowNull: true,
      defaultValue: null
    },
    { transaction }
  );
};

export const down = async ({ queryInterface, Sequelize, transaction }) => {
  await queryInterface.dropTable('deal_message_reads', { transaction });

  await queryInterface.changeColumn(
    'deals',
    'act_by',
    {
      type: Sequelize.STRING,
      allowNull: false,
      defaultValue: 'customer'
    },
    { transaction }
  );
};
