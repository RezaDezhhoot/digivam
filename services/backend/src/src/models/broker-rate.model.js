import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../config/database.js';

export class BrokerRate extends Model {}

BrokerRate.init(
  {
    id: {
      type: DataTypes.BIGINT.UNSIGNED,
      autoIncrement: true,
      primaryKey: true
    },
    dealId: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false,
      unique: true,
      field: 'deal_id'
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
    score: {
      type: DataTypes.TINYINT.UNSIGNED,
      allowNull: false
    },
    comment: {
      type: DataTypes.TEXT,
      allowNull: true
    }
  },
  {
    sequelize,
    tableName: 'broker_rates',
    timestamps: true,
    underscored: true
  }
);
