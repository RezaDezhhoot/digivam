export const name = '202604040004-alter-users-add-role';

export const up = async ({ queryInterface, Sequelize, transaction }) => {
  const table = await queryInterface.describeTable('users');

  if (!table.role) {
    await queryInterface.addColumn(
      'users',
      'role',
      {
        type: Sequelize.ENUM('admin'),
        allowNull: false,
        defaultValue: 'admin'
      },
      { transaction }
    );
  }
};

export const down = async ({ queryInterface, transaction }) => {
  const table = await queryInterface.describeTable('users');
  if (table.role) {
    await queryInterface.removeColumn('users', 'role', { transaction });
  }
};
