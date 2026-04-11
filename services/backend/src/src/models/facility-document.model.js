import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

export const FacilityDocument = sequelize.define(
  'FacilityDocument',
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
    documentId: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false,
      field: 'document_id'
    },
    sort: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    }
  },
  {
    tableName: 'facility_document',
    underscored: true,
    timestamps: false
  }
);
