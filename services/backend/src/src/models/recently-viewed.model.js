import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

export const RecentlyViewed = sequelize.define(
  'RecentlyViewed',
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
    facilityId: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false,
      field: 'facility_id'
    },
    viewedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      field: 'viewed_at'
    }
  },
  {
    tableName: 'recently_viewed',
    underscored: true,
    timestamps: false,
    indexes: [
      { unique: true, fields: ['customer_id', 'facility_id'] }
    ]
  }
);
