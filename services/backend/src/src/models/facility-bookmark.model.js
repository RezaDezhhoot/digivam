import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

export const FacilityBookmark = sequelize.define(
  'FacilityBookmark',
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
    }
  },
  {
    tableName: 'facility_bookmarks',
    underscored: true,
    updatedAt: false,
    indexes: [
      { unique: true, fields: ['customer_id', 'facility_id'] }
    ]
  }
);
