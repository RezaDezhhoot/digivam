import {
  DEAL_STEPS,
  getDealStepLevel
} from '../constants/deal.js';

export const name = '202604120002-align-deals-spec';

const tableName = 'deals';

const hasTable = async (queryInterface, transaction) => {
  const tables = await queryInterface.showAllTables({ transaction });
  return tables
    .map((table) => (typeof table === 'string' ? table.toLowerCase() : String(table.tableName || '').toLowerCase()))
    .includes(tableName);
};

const renameColumnIfNeeded = async (queryInterface, columns, from, to, transaction) => {
  if (!columns[from] || columns[to]) {
    return;
  }

  await queryInterface.renameColumn(tableName, from, to, { transaction });
  columns[to] = columns[from];
  delete columns[from];
};

const addColumnIfMissing = async (queryInterface, columns, columnName, definition, transaction) => {
  if (columns[columnName]) {
    return;
  }

  await queryInterface.addColumn(tableName, columnName, definition, { transaction });
  columns[columnName] = definition;
};

export const up = async ({ queryInterface, Sequelize, transaction }) => {
  if (!(await hasTable(queryInterface, transaction))) {
    return;
  }

  const columns = await queryInterface.describeTable(tableName, { transaction });

  await renameColumnIfNeeded(queryInterface, columns, 'requested_amount', 'amount', transaction);
  await renameColumnIfNeeded(queryInterface, columns, 'installment_months', 'installments', transaction);
  await renameColumnIfNeeded(queryInterface, columns, 'interest_rate', 'profit', transaction);

  await addColumnIfMissing(
    queryInterface,
    columns,
    'monthly_installment_amount',
    { type: Sequelize.DECIMAL(40, 2), allowNull: true, defaultValue: 0 },
    transaction
  );
  await addColumnIfMissing(
    queryInterface,
    columns,
    'total_profit',
    { type: Sequelize.DECIMAL(40, 2), allowNull: true, defaultValue: 0 },
    transaction
  );
  await addColumnIfMissing(
    queryInterface,
    columns,
    'total_amount',
    { type: Sequelize.DECIMAL(40, 2), allowNull: true, defaultValue: 0 },
    transaction
  );
  await addColumnIfMissing(
    queryInterface,
    columns,
    'sub_type_id',
    { type: Sequelize.BIGINT.UNSIGNED, allowNull: true },
    transaction
  );
  await addColumnIfMissing(
    queryInterface,
    columns,
    'level',
    { type: Sequelize.INTEGER.UNSIGNED, allowNull: false, defaultValue: 1 },
    transaction
  );
  await addColumnIfMissing(
    queryInterface,
    columns,
    'contact_data',
    { type: Sequelize.TEXT('long'), allowNull: true },
    transaction
  );
  await addColumnIfMissing(
    queryInterface,
    columns,
    'contract_signed_by_customer',
    { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
    transaction
  );
  await addColumnIfMissing(
    queryInterface,
    columns,
    'contract_signed_by_broker',
    { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
    transaction
  );

  await queryInterface.sequelize.query(
    `
      UPDATE deals d
      LEFT JOIN facilities f ON f.id = d.facility_id
      SET
        d.sub_type_id = COALESCE(f.sub_type_id, d.sub_type_id),
        d.level = CASE d.step
          WHEN '${DEAL_STEPS.SUBMIT}' THEN ${getDealStepLevel(DEAL_STEPS.SUBMIT)}
          WHEN '${DEAL_STEPS.VERIFY_BROKER}' THEN ${getDealStepLevel(DEAL_STEPS.VERIFY_BROKER)}
          WHEN '${DEAL_STEPS.CONTRACT}' THEN ${getDealStepLevel(DEAL_STEPS.CONTRACT)}
          WHEN '${DEAL_STEPS.PAYMENT}' THEN ${getDealStepLevel(DEAL_STEPS.PAYMENT)}
          WHEN '${DEAL_STEPS.TRANSFER}' THEN ${getDealStepLevel(DEAL_STEPS.TRANSFER)}
          WHEN '${DEAL_STEPS.VERIFY_CUSTOMER}' THEN ${getDealStepLevel(DEAL_STEPS.VERIFY_CUSTOMER)}
          WHEN '${DEAL_STEPS.FINISHED}' THEN ${getDealStepLevel(DEAL_STEPS.FINISHED)}
          ELSE COALESCE(d.level, 1)
        END,
        d.total_profit = ROUND(COALESCE(d.amount, 0) * (COALESCE(d.profit, 0) / 100), 2),
        d.total_amount = ROUND(COALESCE(d.amount, 0) + ROUND(COALESCE(d.amount, 0) * (COALESCE(d.profit, 0) / 100), 2), 2),
        d.monthly_installment_amount = CASE
          WHEN COALESCE(d.installments, 0) > 0 THEN ROUND(
            (
              COALESCE(d.amount, 0) + ROUND(COALESCE(d.amount, 0) * (COALESCE(d.profit, 0) / 100), 2)
            ) / d.installments,
            2
          )
          ELSE 0
        END
    `,
    { transaction }
  );

  if (!columns.sub_type_id) {
    await queryInterface.addIndex(tableName, ['sub_type_id'], { name: 'deals_sub_type_id', transaction });
  }

  if (!columns.level) {
    await queryInterface.addIndex(tableName, ['level'], { name: 'deals_level', transaction });
  }
};

export const down = async ({ queryInterface, transaction }) => {
  if (!(await hasTable(queryInterface, transaction))) {
    return;
  }

  const columns = await queryInterface.describeTable(tableName, { transaction });

  if (columns.contract_signed_by_broker) {
    await queryInterface.removeColumn(tableName, 'contract_signed_by_broker', { transaction });
  }

  if (columns.contract_signed_by_customer) {
    await queryInterface.removeColumn(tableName, 'contract_signed_by_customer', { transaction });
  }

  if (columns.contact_data) {
    await queryInterface.removeColumn(tableName, 'contact_data', { transaction });
  }

  if (columns.level) {
    await queryInterface.removeColumn(tableName, 'level', { transaction });
  }

  if (columns.sub_type_id) {
    await queryInterface.removeColumn(tableName, 'sub_type_id', { transaction });
  }

  if (columns.total_amount) {
    await queryInterface.removeColumn(tableName, 'total_amount', { transaction });
  }

  if (columns.total_profit) {
    await queryInterface.removeColumn(tableName, 'total_profit', { transaction });
  }

  if (columns.monthly_installment_amount) {
    await queryInterface.removeColumn(tableName, 'monthly_installment_amount', { transaction });
  }

  if (columns.profit && !columns.interest_rate) {
    await queryInterface.renameColumn(tableName, 'profit', 'interest_rate', { transaction });
  }

  if (columns.installments && !columns.installment_months) {
    await queryInterface.renameColumn(tableName, 'installments', 'installment_months', { transaction });
  }

  if (columns.amount && !columns.requested_amount) {
    await queryInterface.renameColumn(tableName, 'amount', 'requested_amount', { transaction });
  }
};