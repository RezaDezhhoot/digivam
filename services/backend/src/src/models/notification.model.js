import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

export const Notification = sequelize.define(
  'Notification',
  {
    id: {
      type: DataTypes.BIGINT.UNSIGNED,
      autoIncrement: true,
      primaryKey: true
    },
    category: {
      type: DataTypes.STRING,
      allowNull: false
    },
    title: {
      type: DataTypes.STRING,
      allowNull: false
    },
    body: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    isRead: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      field: 'is_read'
    },
    readAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'read_at'
    },
    modelType: {
      type: DataTypes.STRING,
      allowNull: false,
      field: 'model_type'
    },
    modelId: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false,
      field: 'model_id'
    },
    senderType: {
      type: DataTypes.STRING,
      allowNull: false,
      field: 'sender_type'
    },
    senderId: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false,
      field: 'sender_id'
    },
    metadata: {
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
    tableName: 'notifications',
    underscored: true,
    timestamps: true,
    paranoid: true,
    deletedAt: 'deleted_at'
  }
);

Notification.CATEGORIES = {
  INFO: 'info',
  ATTENTION: 'attention',
  WARNING: 'warning'
};

Notification.CATEGORY_LABELS = {
  [Notification.CATEGORIES.INFO]: 'اطلاع رسانی',
  [Notification.CATEGORIES.ATTENTION]: 'توجه',
  [Notification.CATEGORIES.WARNING]: 'اخطار'
};

Notification.CATEGORY_COLORS = {
  [Notification.CATEGORIES.INFO]: '#6b7280',
  [Notification.CATEGORIES.ATTENTION]: '#f97316',
  [Notification.CATEGORIES.WARNING]: '#dc2626'
};

Notification.MODEL_TYPES = {
  ADMIN: 'admin',
  BROKER: 'broker',
  CUSTOMER: 'customer'
};

Notification.MODEL_LABELS = {
  [Notification.MODEL_TYPES.ADMIN]: 'ادمین',
  [Notification.MODEL_TYPES.BROKER]: 'کارگزار',
  [Notification.MODEL_TYPES.CUSTOMER]: 'مشتری'
};