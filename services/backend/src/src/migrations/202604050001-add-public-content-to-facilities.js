export const name = '202604050001-add-public-content-to-facilities';

export const up = async ({ queryInterface, Sequelize, transaction }) => {
  const tables = await queryInterface.showAllTables({ transaction });
  const tableNames = tables.map((table) =>
    typeof table === 'string' ? table.toLowerCase() : String(table.tableName || '').toLowerCase()
  );

  if (!tableNames.includes('facilities')) {
    return;
  }

  const columns = await queryInterface.describeTable('facilities', { transaction });

  if (!columns.public_content) {
    await queryInterface.addColumn(
      'facilities',
      'public_content',
      {
        type: Sequelize.JSON,
        allowNull: true
      },
      { transaction }
    );
  }
};

export const down = async ({ queryInterface, transaction }) => {
  const tables = await queryInterface.showAllTables({ transaction });
  const tableNames = tables.map((table) =>
    typeof table === 'string' ? table.toLowerCase() : String(table.tableName || '').toLowerCase()
  );

  if (!tableNames.includes('facilities')) {
    return;
  }

  const columns = await queryInterface.describeTable('facilities', { transaction });

  if (columns.public_content) {
    await queryInterface.removeColumn('facilities', 'public_content', { transaction });
  }
};