export const name = '202604120001-create-deals';

export const up = async ({ queryInterface, Sequelize, transaction }) => {
  const tables = await queryInterface.showAllTables({ transaction });
  const tableNames = tables.map((table) =>
    typeof table === 'string' ? table.toLowerCase() : String(table.tableName || '').toLowerCase()
  );

  if (tableNames.includes('deals')) {
    return;
  }

  await queryInterface.createTable(
    'deals',
    {
      id: {
        type: Sequelize.BIGINT.UNSIGNED,
        allowNull: false,
        autoIncrement: true,
        primaryKey: true
      },
      facility_id: {
        type: Sequelize.BIGINT.UNSIGNED,
        allowNull: false
      },
      broker_id: {
        type: Sequelize.BIGINT.UNSIGNED,
        allowNull: false
      },
      customer_id: {
        type: Sequelize.BIGINT.UNSIGNED,
        allowNull: false
      },
      kind: {
        type: Sequelize.STRING(50),
        allowNull: false,
        defaultValue: 'bank'
      },
      status: {
        type: Sequelize.STRING(50),
        allowNull: false,
        defaultValue: 'in_progress'
      },
      step: {
        type: Sequelize.STRING(50),
        allowNull: false,
        defaultValue: 'submit'
      },
      act_by: {
        type: Sequelize.STRING(50),
        allowNull: false,
        defaultValue: 'customer'
      },
      requested_amount: {
        type: Sequelize.DECIMAL(40, 2),
        allowNull: false,
        defaultValue: 0
      },
      installment_months: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: true
      },
      interest_rate: {
        type: Sequelize.DECIMAL(10, 3),
        allowNull: true
      },
      documents: {
        type: Sequelize.JSON,
        allowNull: true
      },
      result_history: {
        type: Sequelize.JSON,
        allowNull: true
      },
      facility_data: {
        type: Sequelize.JSON,
        allowNull: true
      },
      customer_validation_data: {
        type: Sequelize.JSON,
        allowNull: true
      },
      submitted_documents_at: {
        type: Sequelize.DATE,
        allowNull: true
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.fn('NOW')
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.fn('NOW')
      }
    },
    { transaction }
  );

  await Promise.all([
    queryInterface.addIndex('deals', ['facility_id'], { name: 'deals_facility_id', transaction }),
    queryInterface.addIndex('deals', ['broker_id'], { name: 'deals_broker_id', transaction }),
    queryInterface.addIndex('deals', ['customer_id'], { name: 'deals_customer_id', transaction }),
    queryInterface.addIndex('deals', ['status'], { name: 'deals_status', transaction }),
    queryInterface.addIndex('deals', ['step'], { name: 'deals_step', transaction }),
    queryInterface.addIndex('deals', ['act_by'], { name: 'deals_act_by', transaction })
  ]);
};

export const down = async ({ queryInterface, transaction }) => {
  await queryInterface.dropTable('deals', { transaction });
};