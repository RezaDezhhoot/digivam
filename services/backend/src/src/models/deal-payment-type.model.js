import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';
import {
  DEAL_PAYMENT_STATUSES,
  DEAL_PAYMENT_STATUS_LABELS,
  PaymentTypes,
  PaymentTypeDescriptions,
  PaymentTypeLabels
} from '../constants/deal.js';

export const DealPaymentType = sequelize.define(
  'DealPaymentType',
  {
    id: {
      type: DataTypes.BIGINT.UNSIGNED,
      autoIncrement: true,
      primaryKey: true
    },
    dealId: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false,
      field: 'deal_id'
    },
    paymentType: {
      type: DataTypes.STRING,
      allowNull: false,
      field: 'payment_type'
    },
    amount: {
      type: DataTypes.DECIMAL(40, 2),
      allowNull: false,
      defaultValue: 0
    },
    description: {
      type: DataTypes.TEXT('long'),
      allowNull: true
    },
    values: {
      type: DataTypes.JSON,
      allowNull: true
    },
    status: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: DEAL_PAYMENT_STATUSES.PENDING
    },
    doneAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'done_at'
    }
  },
  {
    tableName: 'deal_payment_types',
    underscored: true,
    timestamps: true
  }
);

DealPaymentType.PAYMENT_TYPES = PaymentTypes;
DealPaymentType.PAYMENT_TYPE_LABELS = PaymentTypeLabels;
DealPaymentType.PAYMENT_TYPE_DESCRIPTIONS = PaymentTypeDescriptions;
DealPaymentType.STATUSES = DEAL_PAYMENT_STATUSES;
DealPaymentType.STATUS_LABELS = DEAL_PAYMENT_STATUS_LABELS;