export const name = '202604120007-add-deal-admin-review-state';

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

export const up = async ({ queryInterface, Sequelize }) => {
  await ensureColumn(queryInterface, Sequelize, 'admin_review_mode', {
    type: Sequelize.BOOLEAN,
    allowNull: false,
    defaultValue: false
  });

  await ensureColumn(queryInterface, Sequelize, 'admin_review_data', {
    type: Sequelize.JSON,
    allowNull: true
  });
};

export const down = async ({ queryInterface }) => {
  await removeColumnIfExists(queryInterface, 'admin_review_data');
  await removeColumnIfExists(queryInterface, 'admin_review_mode');
};