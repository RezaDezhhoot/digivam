export const name = '202604040005-create-files';

export const up = async ({ queryInterface, Sequelize, transaction }) => {
  const tables = await queryInterface.showAllTables({ transaction });
  const tableNames = tables.map((table) =>
    typeof table === 'string' ? table.toLowerCase() : String(table.tableName || '').toLowerCase()
  );

  if (tableNames.includes('files')) {
    return;
  }

  await queryInterface.createTable(
    'files',
    {
      id: {
        type: Sequelize.BIGINT.UNSIGNED,
        allowNull: false,
        autoIncrement: true,
        primaryKey: true
      },
      fileable_type: {
        type: Sequelize.STRING,
        allowNull: false
      },
      fileable_id: {
        type: Sequelize.BIGINT.UNSIGNED,
        allowNull: false
      },
      position: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0
      },
      path: {
        type: Sequelize.STRING,
        allowNull: false
      },
      mime_type: {
        type: Sequelize.STRING(100),
        allowNull: true
      },
      size: {
        type: Sequelize.BIGINT,
        allowNull: true
      },
      thumbnail: {
        type: Sequelize.STRING,
        allowNull: true
      },
      disk: {
        type: Sequelize.STRING(100),
        allowNull: true
      },
      data: {
        type: Sequelize.JSON,
        allowNull: true
      },
      duration: {
        type: Sequelize.BIGINT,
        allowNull: false,
        defaultValue: 0
      },
      status: {
        type: Sequelize.STRING(50),
        allowNull: true
      },
      subject: {
        type: Sequelize.STRING(50),
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

  await queryInterface.addIndex('files', ['fileable_type', 'fileable_id'], {
    name: 'files_fileable_type_fileable_id_index',
    transaction
  });
  await queryInterface.addIndex('files', ['path'], { name: 'files_path_index', transaction });
  await queryInterface.addIndex('files', ['subject'], { name: 'files_subject_index', transaction });
};

export const down = async ({ queryInterface, transaction }) => {
  await queryInterface.dropTable('files', { transaction });
};
