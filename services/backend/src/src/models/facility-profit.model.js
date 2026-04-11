import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

export const FacilityProfit = sequelize.define(
  'FacilityProfit',
  {
    id: {
      type: DataTypes.BIGINT.UNSIGNED,
      autoIncrement: true,
      primaryKey: true
    },
    facilitiesId: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false,
      field: 'facilities_id'
    },
    percent: {
      type: DataTypes.DECIMAL(8, 2),
      allowNull: true
    },
    deletedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'deleted_at'
    }
  },
  {
    tableName: 'facilities_profits',
    underscored: true,
    timestamps: true,
    paranoid: true,
    deletedAt: 'deleted_at'
  }
);