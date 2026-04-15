import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

export const Customer = sequelize.define(
  'Customer',
  {
    id: {
      type: DataTypes.BIGINT.UNSIGNED,
      autoIncrement: true,
      primaryKey: true
    },
    phone: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: 'customers_phone_unique'
    },
    email: {
      type: DataTypes.STRING,
      allowNull: true,
      unique: 'customers_email_unique'
    },
    nationalCode: {
      type: DataTypes.STRING,
      allowNull: true,
      unique: 'customers_national_code_unique',
      field: 'national_code'
    },
    name: {
      type: DataTypes.STRING,
      allowNull: true
    },
    password: {
      type: DataTypes.STRING,
      allowNull: true
    },
    otpPassword: {
      type: DataTypes.STRING,
      allowNull: true,
      field: 'otp_password'
    },
    verifiedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'verified_at'
    },
    birthdate: {
      type: DataTypes.DATE,
      allowNull: true
    },
    rememberToken: {
      type: DataTypes.STRING(100),
      allowNull: true,
      field: 'remember_token'
    },
    profile: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    isSuspended: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      field: 'is_suspended'
    },
    suspendReason: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'suspend_reason'
    },
    deletedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'deleted_at'
    }
  },
  {
    tableName: 'customers',
    underscored: true,
    timestamps: true,
    paranoid: false
  }
);

Customer.AVATAR_SUBJECT = 'avatar';
