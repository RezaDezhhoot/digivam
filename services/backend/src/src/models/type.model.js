import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

export const Type = sequelize.define(
  'Type',
  {
    id: {
      type: DataTypes.BIGINT.UNSIGNED,
      autoIncrement: true,
      primaryKey: true
    },
    title: {
      type: DataTypes.STRING,
      allowNull: false
    },
    type: {
      type: DataTypes.STRING,
      allowNull: false
    },
    body: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    contractTemplate: {
      type: DataTypes.JSON,
      allowNull: true,
      field: 'contract_template'
    },
    deletedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'deleted_at'
    }
  },
  {
    tableName: 'types',
    underscored: true,
    timestamps: true,
    paranoid: true,
    deletedAt: 'deleted_at'
  }
);

Type.LOGO_SUBJECT = 'type_logo_image';
Type.BANNER_SUBJECT = 'type_banner_image';
Type.CONTRACT_BACKGROUND_SUBJECT = 'type_contract_background_image';
Type.TYPES = {
  BANKING: 'banking',
  NONE_BANKING: 'none_banking'
};
Type.TYPE_LABELS = {
  [Type.TYPES.BANKING]: 'بانکی',
  [Type.TYPES.NONE_BANKING]: 'غیر بانکی'
};

Type.createDefaultContractTemplate = () => ({
  page: {
    size: 'A4'
  },
  header: {
    title: '',
    dateText: '{{general.date}}',
    contractNumberText: '{{contract.number}}',
    showLogo: true
  },
  bodyHtml: '',
  footer: {
    customerSignatureLabel: 'محل امضا مشتری',
    brokerSignatureLabel: 'محل امضا کارگزار',
    note: ''
  }
});