export const name = '202604120006-add-deal-transfer-and-broker-confirmation';

const TABLE_NAME = 'deals';

const ensureColumn = async (queryInterface, Sequelize, columnName, definition) => {
  const table = await queryInterface.describeTable(TABLE_NAME);

  if (!table[columnName]) {
    await queryInterface.addColumn(TABLE_NAME, columnName, definition);
  }
};

const removeColumnIfExists = async (queryInterface, columnName) => {
  const table = await queryInterface.describeTable(TABLE_NAME);

  if (table[columnName]) {
    await queryInterface.removeColumn(TABLE_NAME, columnName);
  }
};

export const up = async ({ queryInterface, Sequelize, transaction }) => {
  await ensureColumn(queryInterface, Sequelize, 'transfer_data', {
    type: Sequelize.JSON,
    allowNull: true
  });

  await ensureColumn(queryInterface, Sequelize, 'broker_confirmation_amount', {
    type: Sequelize.DECIMAL(64, 0),
    allowNull: true
  });
};

export const down = async ({ queryInterface, transaction }) => {
  await removeColumnIfExists(queryInterface, 'broker_confirmation_amount');
  await removeColumnIfExists(queryInterface, 'transfer_data');
};