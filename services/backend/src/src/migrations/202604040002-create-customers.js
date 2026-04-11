export const name = '202604040002-create-customers';

export const up = async ({ queryInterface, Sequelize, transaction }) => {
  const tables = await queryInterface.showAllTables({ transaction });
  const tableNames = tables.map((table) =>
    typeof table === 'string' ? table.toLowerCase() : String(table.tableName || '').toLowerCase()
  );

  if (tableNames.includes('customers')) {
    return;
  }

  await queryInterface.createTable('customers', {
    id: {
      type: Sequelize.BIGINT.UNSIGNED,
      allowNull: false,
      autoIncrement: true,
      primaryKey: true
    },
    phone: {
      type: Sequelize.STRING,
      allowNull: false,
      unique: true
    },
    email: {
      type: Sequelize.STRING,
      allowNull: true,
      unique: true
    },
    national_code: {
      type: Sequelize.STRING,
      allowNull: true,
      unique: true
    },
    name: {
      type: Sequelize.STRING,
      allowNull: true
    },
    password: {
      type: Sequelize.STRING,
      allowNull: true
    },
    otp_password: {
      type: Sequelize.STRING,
      allowNull: true
    },
    verified_at: {
      type: Sequelize.DATE,
      allowNull: true
    },
    birthdate: {
      type: Sequelize.DATE,
      allowNull: true
    },
    remember_token: {
      type: Sequelize.STRING(100),
      allowNull: true
    },
    profile: {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false
    },
    deleted_at: {
      type: Sequelize.DATE,
      allowNull: true
    },
    created_at: {
      type: Sequelize.DATE,
      allowNull: true
    },
    updated_at: {
      type: Sequelize.DATE,
      allowNull: true
    }
  }, { transaction });
};

export const down = async ({ queryInterface }) => {
  await queryInterface.dropTable('customers');
};
