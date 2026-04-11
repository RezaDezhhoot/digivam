import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

export const FacilityInstallment = sequelize.define(
  'FacilityInstallment',
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
    month: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: true
    },
    deletedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'deleted_at'
    }
  },
  {
    tableName: 'facilities_installments',
    underscored: true,
    timestamps: true,
    paranoid: true,
    deletedAt: 'deleted_at'
  }
);