import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

export const Transaction = sequelize.define(
  'Transaction',
  {
    id: {
      type: DataTypes.BIGINT.UNSIGNED,
      autoIncrement: true,
      primaryKey: true
    },
    payableType: {
      type: DataTypes.STRING,
      allowNull: false,
      field: 'payable_type'
    },
    payableId: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false,
      field: 'payable_id'
    },
    walletId: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false,
      field: 'wallet_id'
    },
    type: {
      type: DataTypes.ENUM('deposit', 'withdraw'),
      allowNull: false
    },
    amount: {
      type: DataTypes.DECIMAL(64, 0),
      allowNull: false
    },
    confirmed: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    },
    meta: {
      type: DataTypes.JSON,
      allowNull: true
    },
    uuid: {
      type: DataTypes.STRING(36),
      allowNull: false,
      unique: 'transactions_uuid_unique'
    },
    deletedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'deleted_at'
    }
  },
  {
    tableName: 'transactions',
    underscored: true,
    timestamps: true,
    paranoid: true,
    deletedAt: 'deleted_at'
  }
);

Transaction.TYPES = {
  DEPOSIT: 'deposit',
  WITHDRAW: 'withdraw'
};