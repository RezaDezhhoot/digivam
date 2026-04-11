export const name = '202604040003-create-brokers';

export const up = async ({ queryInterface, Sequelize, transaction }) => {
  const tables = await queryInterface.showAllTables({ transaction });
  const tableNames = tables.map((table) =>
    typeof table === 'string' ? table.toLowerCase() : String(table.tableName || '').toLowerCase()
  );

  if (tableNames.includes('brokers')) {
    return;
  }

  await queryInterface.createTable('brokers', {
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
    phone: {
      type: Sequelize.STRING,
      allowNull: false,
      unique: true
    },
    national_code: {
      type: Sequelize.STRING(10),
      allowNull: true,
      unique: true
    },
    birthdate: {
      type: Sequelize.DATE,
      allowNull: true
    },
    sheba: {
      type: Sequelize.STRING,
      allowNull: true
    },
    postal_code: {
      type: Sequelize.STRING(10),
      allowNull: true
    },
    address: {
      type: Sequelize.TEXT,
      allowNull: true
    },
    auth: {
      type: Sequelize.TINYINT.UNSIGNED,
      allowNull: false,
      defaultValue: 0
    },
    verify_level: {
      type: Sequelize.TINYINT.UNSIGNED,
      allowNull: false,
      defaultValue: 1
    },
    rate: {
      type: Sequelize.FLOAT,
      allowNull: true
    },
    metadata: {
      type: Sequelize.JSON,
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
  await queryInterface.dropTable('brokers');
};
