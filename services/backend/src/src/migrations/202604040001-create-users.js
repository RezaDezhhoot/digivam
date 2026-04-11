export const name = '202604040001-create-users';

export const up = async ({ queryInterface, Sequelize, transaction }) => {
  const tables = await queryInterface.showAllTables({ transaction });
  const tableNames = tables.map((table) =>
    typeof table === 'string' ? table.toLowerCase() : String(table.tableName || '').toLowerCase()
  );

  if (tableNames.includes('users')) {
    return;
  }

  await queryInterface.createTable('users', {
    id: {
      type: Sequelize.BIGINT.UNSIGNED,
      allowNull: false,
      autoIncrement: true,
      primaryKey: true
    },
    name: {
      type: Sequelize.STRING,
      allowNull: true
    },
    email: {
      type: Sequelize.STRING,
      allowNull: true,
      unique: true
    },
    email_verified_at: {
      type: Sequelize.DATE,
      allowNull: true
    },
    password: {
      type: Sequelize.STRING,
      allowNull: true
    },
    remember_token: {
      type: Sequelize.STRING(100),
      allowNull: true
    },
    created_at: {
      type: Sequelize.DATE,
      allowNull: true
    },
    updated_at: {
      type: Sequelize.DATE,
      allowNull: true
    },
    phone: {
      type: Sequelize.STRING,
      allowNull: true,
      unique: true
    },
    national_id: {
      type: Sequelize.STRING,
      allowNull: true,
      unique: true
    }
  }, { transaction });
};

export const down = async ({ queryInterface }) => {
  await queryInterface.dropTable('users');
};
