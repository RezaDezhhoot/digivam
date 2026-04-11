import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';
import {
  DEAL_ACT_BY,
  DEAL_ACT_BY_LABELS,
  DEAL_LOAN_TYPES,
  DEAL_LOAN_TYPE_LABELS,
  DEAL_STATUSES,
  DEAL_STATUS_LABELS,
  DEAL_STEPS,
  DEAL_STEP_LABELS,
  getDealStepLevel
} from '../constants/deal.js';

export const Deal = sequelize.define(
  'Deal',
  {
    id: {
      type: DataTypes.BIGINT.UNSIGNED,
      autoIncrement: true,
      primaryKey: true
    },
    facilityId: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false,
      field: 'facility_id'
    },
    brokerId: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false,
      field: 'broker_id'
    },
    customerId: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false,
      field: 'customer_id'
    },
    status: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: 'in_progress'
    },
    step: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: DEAL_STEPS.SUBMIT
    },
    actBy: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: DEAL_ACT_BY.CUSTOMER,
      field: 'act_by'
    },
    amount: {
      type: DataTypes.DECIMAL(40, 2),
      allowNull: false,
      defaultValue: 0,
      field: 'amount'
    },
    installments: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: true,
      field: 'installments'
    },
    profit: {
      type: DataTypes.DECIMAL(10, 3),
      allowNull: true,
      field: 'profit'
    },
    monthlyInstallmentAmount: {
      type: DataTypes.DECIMAL(40, 2),
      allowNull: true,
      defaultValue: 0,
      field: 'monthly_installment_amount'
    },
    totalProfit: {
      type: DataTypes.DECIMAL(40, 2),
      allowNull: true,
      defaultValue: 0,
      field: 'total_profit'
    },
    totalAmount: {
      type: DataTypes.DECIMAL(40, 2),
      allowNull: true,
      defaultValue: 0,
      field: 'total_amount'
    },
    subTypeId: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: true,
      field: 'sub_type_id'
    },
    level: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      defaultValue: getDealStepLevel(DEAL_STEPS.SUBMIT)
    },
    documents: {
      type: DataTypes.JSON,
      allowNull: true
    },
    resultHistory: {
      type: DataTypes.JSON,
      allowNull: true,
      field: 'result_history'
    },
    facilityData: {
      type: DataTypes.JSON,
      allowNull: true,
      field: 'facility_data'
    },
    contractData: {
      type: DataTypes.TEXT('long'),
      allowNull: true,
      field: 'contract_data'
    },
    contractSignedByCustomer: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      field: 'contract_signed_by_customer'
    },
    contractSignedByBroker: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      field: 'contract_signed_by_broker'
    },
    customerValidationData: {
      type: DataTypes.JSON,
      allowNull: true,
      field: 'customer_validation_data'
    },
    submittedDocumentsAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'submitted_documents_at'
    }
  },
  {
    tableName: 'deals',
    underscored: true,
    timestamps: true
  }
);

Deal.KINDS = DEAL_LOAN_TYPES;
Deal.KIND_LABELS = DEAL_LOAN_TYPE_LABELS;
Deal.STATUSES = DEAL_STATUSES;
Deal.STATUS_LABELS = DEAL_STATUS_LABELS;
Deal.STEPS = DEAL_STEPS;
Deal.STEP_LABELS = DEAL_STEP_LABELS;
Deal.ACT_BY = DEAL_ACT_BY;
Deal.ACT_BY_LABELS = DEAL_ACT_BY_LABELS;
Deal.getStepLevel = getDealStepLevel;