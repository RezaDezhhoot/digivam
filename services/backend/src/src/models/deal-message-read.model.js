import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

export const DealMessageRead = sequelize.define(
  'DealMessageRead',
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
    readerType: {
      type: DataTypes.STRING,
      allowNull: false,
      field: 'reader_type'
    },
    readerId: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false,
      field: 'reader_id'
    },
    lastReadAt: {
      type: DataTypes.DATE,
      allowNull: false,
      field: 'last_read_at'
    }
  },
  {
    tableName: 'deal_message_reads',
    underscored: true,
    timestamps: true
  }
);
