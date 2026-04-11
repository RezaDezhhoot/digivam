export const name = '202604040022-add-contract-template-to-types';

export const up = async ({ queryInterface, Sequelize, transaction }) => {
  const tables = await queryInterface.showAllTables({ transaction });
  const tableNames = tables.map((table) =>
    typeof table === 'string' ? table.toLowerCase() : String(table.tableName || '').toLowerCase()
  );

  if (!tableNames.includes('types')) {
    return;
  }

  const columns = await queryInterface.describeTable('types', { transaction });

  if (!columns.contract_template) {
    await queryInterface.addColumn(
      'types',
      'contract_template',
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

  if (!tableNames.includes('types')) {
    return;
  }

  const columns = await queryInterface.describeTable('types', { transaction });

  if (columns.contract_template) {
    await queryInterface.removeColumn('types', 'contract_template', { transaction });
  }
};