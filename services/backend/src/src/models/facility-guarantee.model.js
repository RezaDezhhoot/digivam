import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

export const FacilityGuarantee = sequelize.define(
  'FacilityGuarantee',
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
    guaranteeId: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false,
      field: 'guarantee_id'
    },
    modelType: {
      type: DataTypes.STRING,
      allowNull: true,
      field: 'model_type'
    },
    modelId: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: true,
      field: 'model_id'
    }
  },
  {
    tableName: 'facilities_guarantees',
    underscored: true,
    timestamps: false
  }
);