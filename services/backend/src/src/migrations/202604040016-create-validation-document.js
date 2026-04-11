export const name = '202604040016-create-validation-document';

export const up = async ({ queryInterface, Sequelize, transaction }) => {
  const tables = await queryInterface.showAllTables({ transaction });
  const tableNames = tables.map((table) =>
    typeof table === 'string' ? table.toLowerCase() : String(table.tableName || '').toLowerCase()
  );

  if (tableNames.includes('validation_document')) {
    return;
  }

  await queryInterface.createTable(
    'validation_document',
    {
      id: {
        type: Sequelize.BIGINT.UNSIGNED,
        allowNull: false,
        autoIncrement: true,
        primaryKey: true
      },
      validation_id: {
        type: Sequelize.BIGINT.UNSIGNED,
        allowNull: false
      },
      document_id: {
        type: Sequelize.BIGINT.UNSIGNED,
        allowNull: false
      },
      sort: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0
      }
    },
    { transaction }
  );

  await queryInterface.addIndex('validation_document', ['validation_id'], {
    name: 'validation_document_validation_id_index',
    transaction
  });

  await queryInterface.addIndex('validation_document', ['document_id'], {
    name: 'validation_document_document_id_index',
    transaction
  });

  const rows = [
    { id: 4, validation_id: 2, document_id: 1, sort: 0 },
    { id: 5, validation_id: 2, document_id: 6, sort: 1 },
    { id: 6, validation_id: 1, document_id: 6, sort: 0 },
    { id: 7, validation_id: 1, document_id: 7, sort: 1 },
    { id: 8, validation_id: 1, document_id: 8, sort: 2 },
    { id: 9, validation_id: 1, document_id: 9, sort: 3 }
  ];

  await queryInterface.bulkInsert('validation_document', rows, { transaction });
};

export const down = async ({ queryInterface, transaction }) => {
  await queryInterface.dropTable('validation_document', { transaction });
};