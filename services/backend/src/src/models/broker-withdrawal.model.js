import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../config/database.js';

export class BrokerWithdrawal extends Model {}

BrokerWithdrawal.STATUSES = {
  PENDING: 'pending',
  DONE: 'done',
  FAILED: 'failed'
};

BrokerWithdrawal.STATUS_LABELS = {
  pending: 'در انتظار',
  done: 'انجام شده',
  failed: 'ناموفق'
};

BrokerWithdrawal.init(
  {
    id: {
      type: DataTypes.BIGINT.UNSIGNED,
      autoIncrement: true,
      primaryKey: true
    },
    brokerId: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false,
      field: 'broker_id'
    },
    walletId: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false,
      field: 'wallet_id'
    },
    transactionId: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: true,
      field: 'transaction_id'
    },
    amount: {
      type: DataTypes.DECIMAL(40, 2),
      allowNull: false
    },
    status: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: 'pending'
    },
    adminMessage: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'admin_message'
    },
    adminFileId: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: true,
      field: 'admin_file_id'
    },
    resolvedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'resolved_at'
    },
    resolvedBy: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: true,
      field: 'resolved_by'
    }
  },
  {
    sequelize,
    tableName: 'broker_withdrawals',
    timestamps: true,
    underscored: true
  }
);
