import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

export const Wallet = sequelize.define(
  'Wallet',
  {
    id: {
      type: DataTypes.BIGINT.UNSIGNED,
      autoIncrement: true,
      primaryKey: true
    },
    holderType: {
      type: DataTypes.STRING,
      allowNull: false,
      field: 'holder_type'
    },
    holderId: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false,
      field: 'holder_id'
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false
    },
    slug: {
      type: DataTypes.STRING,
      allowNull: false
    },
    uuid: {
      type: DataTypes.STRING(36),
      allowNull: false,
      unique: 'wallets_uuid_unique'
    },
    description: {
      type: DataTypes.STRING,
      allowNull: true
    },
    meta: {
      type: DataTypes.JSON,
      allowNull: true
    },
    balance: {
      type: DataTypes.DECIMAL(64, 0),
      allowNull: false,
      defaultValue: 0
    },
    decimalPlaces: {
      type: DataTypes.SMALLINT.UNSIGNED,
      allowNull: false,
      defaultValue: 2,
      field: 'decimal_places'
    },
    deletedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'deleted_at'
    }
  },
  {
    tableName: 'wallets',
    underscored: true,
    timestamps: true,
    paranoid: true,
    deletedAt: 'deleted_at'
  }
);

Wallet.DEFAULT_NAME = 'کیف پول اصلی';
Wallet.DEFAULT_SLUG = 'main';
Wallet.CURRENCY_LABEL = 'تومان';
Wallet.HOLDER_TYPES = {
  ADMIN: 'admin',
  BROKER: 'broker',
  CUSTOMER: 'customer'
};