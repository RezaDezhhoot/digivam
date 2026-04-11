import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

export const FacilityDailyView = sequelize.define(
  'FacilityDailyView',
  {
    id: {
      type: DataTypes.BIGINT.UNSIGNED,
      autoIncrement: true,
      primaryKey: true
    },
    facilityId: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false,
      field: 'facility_id'
    },
    date: {
      type: DataTypes.DATEONLY,
      allowNull: false
    },
    count: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      defaultValue: 0
    }
  },
  {
    tableName: 'facility_daily_views',
    timestamps: false,
    indexes: [
      { unique: true, fields: ['facility_id', 'date'] }
    ]
  }
);
