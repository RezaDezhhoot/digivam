import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';
import { PaymentTypes, PaymentTypeLabels } from '../constants/deal.js';

export const Facility = sequelize.define(
  'Facility',
  {
    id: {
      type: DataTypes.BIGINT.UNSIGNED,
      autoIncrement: true,
      primaryKey: true
    },
    title: {
      type: DataTypes.STRING,
      allowNull: true
    },
    slug: {
      type: DataTypes.STRING,
      allowNull: true,
      unique: 'facilities_slug_unique'
    },
    type: {
      type: DataTypes.STRING,
      allowNull: true
    },
    subType: {
      type: DataTypes.STRING,
      allowNull: true,
      field: 'sub_type'
    },
    minAmount: {
      type: DataTypes.DECIMAL(40, 2),
      allowNull: false,
      defaultValue: 0,
      field: 'min_amount'
    },
    maxAmount: {
      type: DataTypes.DECIMAL(40, 2),
      allowNull: false,
      defaultValue: 0,
      field: 'max_amount'
    },
    withdrawDeadline: {
      type: DataTypes.SMALLINT.UNSIGNED,
      allowNull: true,
      field: 'withdraw_dead_line'
    },
    views: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false,
      defaultValue: 0
    },
    brokerId: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false,
      field: 'broker_id'
    },
    results: {
      type: DataTypes.JSON,
      allowNull: true
    },
    saved: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    },
    body: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    averageReviewHours: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: true,
      field: 'average_review_hours'
    },
    publicContent: {
      type: DataTypes.JSON,
      allowNull: true,
      field: 'public_content'
    },
    status: {
      type: DataTypes.STRING,
      allowNull: true
    },
    auth: {
      type: DataTypes.STRING,
      allowNull: true
    },
    paymentType: {
      type: DataTypes.STRING,
      allowNull: true,
      field: 'payment_type'
    },
    subTypeId: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: true,
      field: 'sub_type_id'
    },
    validationId: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: true,
      field: 'validation_id'
    },
    deletedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'deleted_at'
    }
  },
  {
    tableName: 'facilities',
    underscored: true,
    timestamps: true,
    paranoid: true,
    deletedAt: 'deleted_at'
  }
);

Facility.STATUSES = {
  PENDING: 'pending',
  REJECTED: 'rejected',
  PUBLISHED: 'published',
  IN_PROGRESS: 'in_progress',
  EXPIRED: 'expired'
};

Facility.STATUS_LABELS = {
  [Facility.STATUSES.PENDING]: 'در حال بررسی',
  [Facility.STATUSES.REJECTED]: 'رد شده',
  [Facility.STATUSES.PUBLISHED]: 'تایید شده',
  [Facility.STATUSES.IN_PROGRESS]: 'جاری',
  [Facility.STATUSES.EXPIRED]: 'منقضی شده'
};

Facility.PAYMENT_TYPES = PaymentTypes;

Facility.PAYMENT_TYPE_LABELS = PaymentTypeLabels;

Facility.MIN_ALLOWED_AMOUNT = 1000;
Facility.MAX_ALLOWED_AMOUNT = 999999999999999;