import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

export const File = sequelize.define(
  'File',
  {
    id: {
      type: DataTypes.BIGINT.UNSIGNED,
      autoIncrement: true,
      primaryKey: true
    },
    fileableType: {
      type: DataTypes.STRING,
      allowNull: false,
      field: 'fileable_type'
    },
    fileableId: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false,
      field: 'fileable_id'
    },
    position: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    path: {
      type: DataTypes.STRING,
      allowNull: false
    },
    mimeType: {
      type: DataTypes.STRING(100),
      allowNull: true,
      field: 'mime_type'
    },
    size: {
      type: DataTypes.BIGINT,
      allowNull: true
    },
    thumbnail: {
      type: DataTypes.STRING,
      allowNull: true
    },
    disk: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    data: {
      type: DataTypes.JSON,
      allowNull: true
    },
    duration: {
      type: DataTypes.BIGINT,
      allowNull: false,
      defaultValue: 0
    },
    status: {
      type: DataTypes.STRING(50),
      allowNull: true
    },
    subject: {
      type: DataTypes.STRING(50),
      allowNull: true
    }
  },
  {
    tableName: 'files',
    underscored: true,
    timestamps: true
  }
);
