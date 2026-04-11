export const name = '202604120004-add-contract-data-and-payment-description';

const hasTable = async (queryInterface, tableName, transaction) => {
  const tables = await queryInterface.showAllTables({ transaction });
  return tables
    .map((table) => (typeof table === 'string' ? table.toLowerCase() : String(table.tableName || '').toLowerCase()))
    .includes(String(tableName).toLowerCase());
};

export const up = async ({ queryInterface, Sequelize, transaction }) => {
  if (await hasTable(queryInterface, 'deals', transaction)) {
    const dealColumns = await queryInterface.describeTable('deals', { transaction });

    if (dealColumns.contact_data && !dealColumns.contract_data) {
      await queryInterface.renameColumn('deals', 'contact_data', 'contract_data', { transaction });
    }

    if (!dealColumns.contract_data && !dealColumns.contact_data) {
      await queryInterface.addColumn(
        'deals',
        'contract_data',
        { type: Sequelize.TEXT('long'), allowNull: true },
        { transaction }
      );
    }
  }

  if (await hasTable(queryInterface, 'deal_payment_types', transaction)) {
    const paymentColumns = await queryInterface.describeTable('deal_payment_types', { transaction });

    if (!paymentColumns.description) {
      await queryInterface.addColumn(
        'deal_payment_types',
        'description',
        { type: Sequelize.TEXT('long'), allowNull: true },
        { transaction }
      );
    }
  }
};

export const down = async ({ queryInterface, transaction }) => {
  if (await hasTable(queryInterface, 'deal_payment_types', transaction)) {
    const paymentColumns = await queryInterface.describeTable('deal_payment_types', { transaction });
    if (paymentColumns.description) {
      await queryInterface.removeColumn('deal_payment_types', 'description', { transaction });
    }
  }

  if (await hasTable(queryInterface, 'deals', transaction)) {
    const dealColumns = await queryInterface.describeTable('deals', { transaction });

    if (dealColumns.contract_data && !dealColumns.contact_data) {
      await queryInterface.renameColumn('deals', 'contract_data', 'contact_data', { transaction });
    }
  }
};