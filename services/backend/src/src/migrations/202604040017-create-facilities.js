export const name = '202604040017-create-facilities';

export const up = async ({ queryInterface, Sequelize, transaction }) => {
  const tables = await queryInterface.showAllTables({ transaction });
  const tableNames = tables.map((table) =>
    typeof table === 'string' ? table.toLowerCase() : String(table.tableName || '').toLowerCase()
  );

  if (tableNames.includes('facilities')) {
    return;
  }

  await queryInterface.createTable(
    'facilities',
    {
      id: {
        type: Sequelize.BIGINT.UNSIGNED,
        allowNull: false,
        autoIncrement: true,
        primaryKey: true
      },
      title: {
        type: Sequelize.STRING,
        allowNull: true
      },
      slug: {
        type: Sequelize.STRING,
        allowNull: true
      },
      type: {
        type: Sequelize.STRING,
        allowNull: true
      },
      sub_type: {
        type: Sequelize.STRING,
        allowNull: true
      },
      min_amount: {
        type: Sequelize.DECIMAL(40, 2),
        allowNull: false,
        defaultValue: 0
      },
      max_amount: {
        type: Sequelize.DECIMAL(40, 2),
        allowNull: false,
        defaultValue: 0
      },
      withdraw_dead_line: {
        type: Sequelize.SMALLINT.UNSIGNED,
        allowNull: true
      },
      views: {
        type: Sequelize.BIGINT.UNSIGNED,
        allowNull: false,
        defaultValue: 0
      },
      broker_id: {
        type: Sequelize.BIGINT.UNSIGNED,
        allowNull: false
      },
      results: {
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
      },
      saved: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false
      },
      body: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      status: {
        type: Sequelize.STRING,
        allowNull: true
      },
      auth: {
        type: Sequelize.STRING,
        allowNull: true
      },
      payment_type: {
        type: Sequelize.STRING,
        allowNull: true
      },
      sub_type_id: {
        type: Sequelize.BIGINT.UNSIGNED,
        allowNull: true
      },
      validation_id: {
        type: Sequelize.BIGINT.UNSIGNED,
        allowNull: true
      }
    },
    { transaction }
  );

  await queryInterface.addIndex('facilities', ['slug'], {
    unique: true,
    name: 'facilities_slug_unique',
    transaction
  });

  await queryInterface.addIndex('facilities', ['type'], {
    name: 'facilities_type_index',
    transaction
  });

  await queryInterface.addIndex('facilities', ['broker_id'], {
    name: 'facilities_broker_id_index',
    transaction
  });

  await queryInterface.addIndex('facilities', ['sub_type_id'], {
    name: 'facilities_sub_type_id_index',
    transaction
  });

  await queryInterface.addIndex('facilities', ['validation_id'], {
    name: 'facilities_validation_id_index',
    transaction
  });

  await queryInterface.addIndex('facilities', ['title'], {
    name: 'facilities_title_fulltext',
    type: 'FULLTEXT',
    transaction
  });
};

export const down = async ({ queryInterface, transaction }) => {
  await queryInterface.dropTable('facilities', { transaction });
};