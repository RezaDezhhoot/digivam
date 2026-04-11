import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

export const ValidationDocument = sequelize.define(
  'ValidationDocument',
  {
    id: {
      type: DataTypes.BIGINT.UNSIGNED,
      autoIncrement: true,
      primaryKey: true
    },
    validationId: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false,
      field: 'validation_id'
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
    tableName: 'validation_document',
    underscored: true,
    timestamps: false
  }
);