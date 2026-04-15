export const name = '202604120005-add-account-suspension-fields';

const hasTable = async (queryInterface, tableName, transaction) => {
  const tables = await queryInterface.showAllTables({ transaction });
  return tables
    .map((table) => (typeof table === 'string' ? table.toLowerCase() : String(table.tableName || '').toLowerCase()))
    .includes(String(tableName).toLowerCase());
};

const ensureSuspensionColumns = async (queryInterface, Sequelize, tableName, transaction) => {
  if (!(await hasTable(queryInterface, tableName, transaction))) {
    return;
  }

  const columns = await queryInterface.describeTable(tableName, { transaction });

  if (!columns.is_suspended) {
    await queryInterface.addColumn(
      tableName,
      'is_suspended',
      {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false
      },
      { transaction }
    );
  }

  if (!columns.suspend_reason) {
    await queryInterface.addColumn(
      tableName,
      'suspend_reason',
      {
        type: Sequelize.TEXT('long'),
        allowNull: true
      },
      { transaction }
    );
  }
};

const removeSuspensionColumns = async (queryInterface, tableName, transaction) => {
  if (!(await hasTable(queryInterface, tableName, transaction))) {
    return;
  }

  const columns = await queryInterface.describeTable(tableName, { transaction });

  if (columns.suspend_reason) {
    await queryInterface.removeColumn(tableName, 'suspend_reason', { transaction });
  }

  if (columns.is_suspended) {
    await queryInterface.removeColumn(tableName, 'is_suspended', { transaction });
  }
};

export const up = async ({ queryInterface, Sequelize, transaction }) => {
  await ensureSuspensionColumns(queryInterface, Sequelize, 'customers', transaction);
  await ensureSuspensionColumns(queryInterface, Sequelize, 'brokers', transaction);
};

export const down = async ({ queryInterface, transaction }) => {
  await removeSuspensionColumns(queryInterface, 'brokers', transaction);
  await removeSuspensionColumns(queryInterface, 'customers', transaction);
};