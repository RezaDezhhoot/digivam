import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

export const User = sequelize.define(
  'User',
  {
    id: {
      type: DataTypes.BIGINT.UNSIGNED,
      autoIncrement: true,
      primaryKey: true
    },
    name: {
      type: DataTypes.STRING,
      allowNull: true
    },
    email: {
      type: DataTypes.STRING,
      allowNull: true,
      unique: 'users_email_unique'
    },
    emailVerifiedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'email_verified_at'
    },
    password: {
      type: DataTypes.STRING,
      allowNull: true
    },
    rememberToken: {
      type: DataTypes.STRING(100),
      allowNull: true,
      field: 'remember_token'
    },
    phone: {
      type: DataTypes.STRING,
      allowNull: true,
      unique: 'users_phone_unique'
    },
    nationalId: {
      type: DataTypes.STRING,
      allowNull: true,
      unique: 'users_national_id_unique',
      field: 'national_id'
    },
    role: {
      type: DataTypes.ENUM('admin'),
      allowNull: false,
      defaultValue: 'admin'
    }
  },
  {
    tableName: 'users',
    underscored: true,
    timestamps: true
  }
);
