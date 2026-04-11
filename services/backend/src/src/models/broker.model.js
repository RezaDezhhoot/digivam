import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

export const Broker = sequelize.define(
  'Broker',
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
    phone: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: 'brokers_phone_unique'
    },
    nationalCode: {
      type: DataTypes.STRING(10),
      allowNull: true,
      unique: 'brokers_national_code_unique',
      field: 'national_code'
    },
    birthdate: {
      type: DataTypes.DATE,
      allowNull: true
    },
    sheba: {
      type: DataTypes.STRING,
      allowNull: true
    },
    postalCode: {
      type: DataTypes.STRING(10),
      allowNull: true,
      field: 'postal_code'
    },
    address: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    auth: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    },
    verifyLevel: {
      type: DataTypes.TINYINT.UNSIGNED,
      allowNull: false,
      defaultValue: 1,
      field: 'verify_level'
    },
    rate: {
      type: DataTypes.FLOAT,
      allowNull: true
    },
    metadata: {
      type: DataTypes.JSON,
      allowNull: true
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
    deletedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'deleted_at'
    }
  },
  {
    tableName: 'brokers',
    underscored: true,
    timestamps: true,
    paranoid: false
  }
);

Broker.AVATAR_SUBJECT = 'avatar';
Broker.ID_CART_IMAGE_SUBJECT = 'id_cart_image';
Broker.BIRTH_CERTIFICATE_IMAGE_SUBJECT = 'birth_certificate_image';
