export const name = '202604060001-add-stages-to-validations';

const hasColumn = async (queryInterface, tableName, columnName, transaction) => {
  const definition = await queryInterface.describeTable(tableName, { transaction });
  return Boolean(definition?.[columnName]);
};

export const up = async ({ queryInterface, Sequelize, transaction }) => {
  const exists = await hasColumn(queryInterface, 'validations', 'stages', transaction);

  if (exists) {
    return;
  }

  await queryInterface.addColumn(
    'validations',
    'stages',
    {
      type: Sequelize.JSON,
      allowNull: true,
      after: 'description'
    },
    { transaction }
  );
};

export const down = async ({ queryInterface, transaction }) => {
  const exists = await hasColumn(queryInterface, 'validations', 'stages', transaction);

  if (!exists) {
    return;
  }

  await queryInterface.removeColumn('validations', 'stages', { transaction });
};