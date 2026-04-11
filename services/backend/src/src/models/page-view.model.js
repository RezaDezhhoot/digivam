import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

export const PageView = sequelize.define(
  'PageView',
  {
    id: {
      type: DataTypes.BIGINT.UNSIGNED,
      autoIncrement: true,
      primaryKey: true
    },
    date: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      unique: true
    },
    count: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      defaultValue: 0
    }
  },
  {
    tableName: 'page_views',
    timestamps: false
  }
);
