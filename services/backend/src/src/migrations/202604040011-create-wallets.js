import crypto from 'node:crypto';

export const name = '202604040011-create-wallets';

const buildWalletRow = (holderType, holderId, createdAt) => ({
  holder_type: holderType,
  holder_id: holderId,
  name: 'کیف پول اصلی',
  slug: 'main',
  uuid: crypto.randomUUID(),
  description: null,
  meta: null,
  balance: 0,
  decimal_places: 2,
  created_at: createdAt,
  updated_at: createdAt,
  deleted_at: null
});

export const up = async ({ queryInterface, Sequelize, transaction }) => {
  const tables = await queryInterface.showAllTables({ transaction });
  const tableNames = tables.map((table) =>
    typeof table === 'string' ? table.toLowerCase() : String(table.tableName || '').toLowerCase()
  );

  if (tableNames.includes('wallets')) {
    return;
  }

  await queryInterface.createTable(
    'wallets',
    {
      id: {
        type: Sequelize.BIGINT.UNSIGNED,
        allowNull: false,
        autoIncrement: true,
        primaryKey: true
      },
      holder_type: {
        type: Sequelize.STRING,
        allowNull: false
      },
      holder_id: {
        type: Sequelize.BIGINT.UNSIGNED,
        allowNull: false
      },
      name: {
        type: Sequelize.STRING,
        allowNull: false
      },
      slug: {
        type: Sequelize.STRING,
        allowNull: false
      },
      uuid: {
        type: Sequelize.CHAR(36),
        allowNull: false
      },
      description: {
        type: Sequelize.STRING,
        allowNull: true
      },
      meta: {
        type: Sequelize.JSON,
        allowNull: true
      },
      balance: {
        type: Sequelize.DECIMAL(64, 0),
        allowNull: false,
        defaultValue: 0
      },
      decimal_places: {
        type: Sequelize.SMALLINT.UNSIGNED,
        allowNull: false,
        defaultValue: 2
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: true
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: true
      },
      deleted_at: {
        type: Sequelize.DATE,
        allowNull: true
      }
    },
    { transaction }
  );

  await queryInterface.addConstraint('wallets', {
    fields: ['holder_type', 'holder_id', 'slug'],
    type: 'unique',
    name: 'wallets_holder_type_holder_id_slug_unique',
    transaction
  });
  await queryInterface.addConstraint('wallets', {
    fields: ['uuid'],
    type: 'unique',
    name: 'wallets_uuid_unique',
    transaction
  });
  await queryInterface.addIndex('wallets', ['holder_type', 'holder_id'], {
    name: 'wallets_holder_type_holder_id_index',
    transaction
  });
  await queryInterface.addIndex('wallets', ['slug'], {
    name: 'wallets_slug_index',
    transaction
  });

  const [users, brokers, customers] = await Promise.all([
    queryInterface.sequelize.query('SELECT id FROM users', { type: Sequelize.QueryTypes.SELECT, transaction }),
    queryInterface.sequelize.query('SELECT id FROM brokers', { type: Sequelize.QueryTypes.SELECT, transaction }),
    queryInterface.sequelize.query('SELECT id FROM customers', { type: Sequelize.QueryTypes.SELECT, transaction })
  ]);

  const now = new Date();
  const rows = [
    ...users.map((item) => buildWalletRow('admin', Number(item.id), now)),
    ...brokers.map((item) => buildWalletRow('broker', Number(item.id), now)),
    ...customers.map((item) => buildWalletRow('customer', Number(item.id), now))
  ];

  if (rows.length) {
    await queryInterface.bulkInsert('wallets', rows, { transaction });
  }
};

export const down = async ({ queryInterface, transaction }) => {
  await queryInterface.dropTable('wallets', { transaction });
};