import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

export const Setting = sequelize.define(
  'Setting',
  {
    id: {
      type: DataTypes.BIGINT.UNSIGNED,
      autoIncrement: true,
      primaryKey: true
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: 'settings_name_unique'
    },
    value: {
      type: DataTypes.TEXT,
      allowNull: true
    }
  },
  {
    tableName: 'settings',
    underscored: true,
    timestamps: true
  }
);