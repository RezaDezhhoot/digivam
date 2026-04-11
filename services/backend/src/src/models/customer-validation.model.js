import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

export const CustomerValidation = sequelize.define(
  'CustomerValidation',
  {
    id: {
      type: DataTypes.BIGINT.UNSIGNED,
      autoIncrement: true,
      primaryKey: true
    },
    customerId: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false,
      field: 'customer_id'
    },
    validationId: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false,
      field: 'validation_id'
    },
    status: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: 'submit'
    },
    data: {
      type: DataTypes.JSON,
      allowNull: true
    },
    result: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    paidAmount: {
      type: DataTypes.DECIMAL(40, 3),
      allowNull: true,
      field: 'paid_amount'
    },
    expiresAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'expires_at'
    },
    selfValidation: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      field: 'self_validation'
    },
    selfValidationFileId: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: true,
      field: 'self_validation_file_id'
    },
    adminAttachmentId: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: true,
      field: 'admin_attachemnt'
    }
  },
  {
    tableName: 'customer_validations',
    underscored: true,
    timestamps: true
  }
);

CustomerValidation.STATUSES = {
  SUBMIT: 'submit',
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  EXPIRED: 'expired'
};

CustomerValidation.STATUS_LABELS = {
  submit: 'ارسال شده',
  pending: 'در انتظار بررسی',
  approved: 'تایید شده',
  rejected: 'رد شده',
  expired: 'منقضی شده'
};

CustomerValidation.STATUS_COLORS = {
  submit: '#6b7280',
  pending: '#d97706',
  approved: '#22a06b',
  rejected: '#b42318',
  expired: '#64748b'
};
