export const name = '202604080002-create-facility-daily-views';

export const up = async ({ queryInterface, Sequelize, transaction }) => {
  const tables = await queryInterface.showAllTables({ transaction });
  const tableNames = tables.map((table) =>
    typeof table === 'string' ? table.toLowerCase() : String(table.tableName || '').toLowerCase()
  );

  if (tableNames.includes('facility_daily_views')) {
    return;
  }

  await queryInterface.createTable(
    'facility_daily_views',
    {
      id: {
        type: Sequelize.BIGINT.UNSIGNED,
        allowNull: false,
        autoIncrement: true,
        primaryKey: true
      },
      facility_id: {
        type: Sequelize.BIGINT.UNSIGNED,
        allowNull: false,
        references: { model: 'facilities', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      date: {
        type: Sequelize.DATEONLY,
        allowNull: false
      },
      count: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: false,
        defaultValue: 0
      }
    },
    { transaction }
  );

  await queryInterface.addIndex('facility_daily_views', ['facility_id', 'date'], {
    unique: true,
    name: 'facility_daily_views_facility_date_unique',
    transaction
  });
};

export const down = async ({ queryInterface, transaction }) => {
  await queryInterface.dropTable('facility_daily_views', { transaction });
};
