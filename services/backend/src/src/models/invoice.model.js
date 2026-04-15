import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

export const Invoice = sequelize.define(
  'Invoice',
  {
    id: {
      type: DataTypes.BIGINT.UNSIGNED,
      autoIncrement: true,
      primaryKey: true
    },
    firstName: {
      type: DataTypes.STRING,
      allowNull: true,
      field: 'first_name'
    },
    lastName: {
      type: DataTypes.STRING,
      allowNull: true,
      field: 'last_name'
    },
    nationalCode: {
      type: DataTypes.STRING,
      allowNull: true,
      field: 'national_code'
    },
    status: {
      type: DataTypes.STRING,
      allowNull: false
    },
    driver: {
      type: DataTypes.STRING,
      allowNull: false
    },
    transactionId: {
      type: DataTypes.STRING,
      allowNull: true,
      field: 'transaction_id'
    },
    paymentRef: {
      type: DataTypes.STRING,
      allowNull: true,
      field: 'payment_ref'
    },
    amount: {
      type: DataTypes.DECIMAL(25, 3),
      allowNull: false
    },
    discount: {
      type: DataTypes.DECIMAL(25, 3),
      allowNull: false,
      defaultValue: 0
    },
    totalAmount: {
      type: DataTypes.DECIMAL(25, 3),
      allowNull: false,
      field: 'total_amount'
    },
    paidAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'paid_at'
    },
    userId: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: true,
      field: 'user_id'
    },
    userModel: {
      type: DataTypes.STRING,
      allowNull: true,
      field: 'user_model'
    },
    payableType: {
      type: DataTypes.STRING,
      allowNull: true,
      field: 'payable_type'
    },
    payableId: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: true,
      field: 'payable_id'
    },
    ip: {
      type: DataTypes.STRING,
      allowNull: true
    },
    payableData: {
      type: DataTypes.JSON,
      allowNull: true,
      field: 'payable_data'
    },
    data: {
      type: DataTypes.JSON,
      allowNull: true
    },
    deletedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'deleted_at'
    }
  },
  {
    tableName: 'invoices',
    underscored: true,
    timestamps: true,
    paranoid: true,
    deletedAt: 'deleted_at'
  }
);

Invoice.USER_MODELS = Object.freeze({
  ADMIN: 'admin',
  BROKER: 'broker',
  CUSTOMER: 'customer'
});