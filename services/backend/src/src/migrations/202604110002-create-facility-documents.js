export const name = '202604110002-create-facility-documents';

export const up = async ({ queryInterface, Sequelize, transaction }) => {
  const tables = await queryInterface.showAllTables({ transaction });
  const tableNames = tables.map((table) =>
    typeof table === 'string' ? table.toLowerCase() : String(table.tableName || '').toLowerCase()
  );

  if (tableNames.includes('facility_document')) {
    return;
  }

  await queryInterface.createTable(
    'facility_document',
    {
      id: {
        type: Sequelize.BIGINT.UNSIGNED,
        allowNull: false,
        autoIncrement: true,
        primaryKey: true
      },
      facility_id: {
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

  await queryInterface.addIndex('facility_document', ['facility_id'], {
    name: 'facility_document_facility_id',
    transaction
  });

  await queryInterface.addIndex('facility_document', ['document_id'], {
    name: 'facility_document_document_id',
    transaction
  });
};

export const down = async ({ queryInterface, transaction }) => {
  await queryInterface.dropTable('facility_document', { transaction });
};
