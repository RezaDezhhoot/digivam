import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

export const DealMessage = sequelize.define(
  'DealMessage',
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
    body: {
      type: DataTypes.TEXT,
      allowNull: false
    }
  },
  {
    tableName: 'deal_messages',
    underscored: true,
    timestamps: true
  }
);

DealMessage.SENDER_TYPES = {
  CUSTOMER: 'customer',
  BROKER: 'broker',
  ADMIN: 'admin'
};

DealMessage.SENDER_TYPE_LABELS = {
  customer: 'مشتری',
  broker: 'کارگزار',
  admin: 'مدیر'
};
