import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

export const Document = sequelize.define(
  'Document',
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
    mimes: {
      type: DataTypes.STRING,
      allowNull: true
    },
    max: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: true
    },
    help: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    subject: {
      type: DataTypes.STRING,
      allowNull: true
    },
    required: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    },
    category: {
      type: DataTypes.STRING,
      allowNull: true
    },
    deletedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'deleted_at'
    }
  },
  {
    tableName: 'documents',
    underscored: true,
    timestamps: true,
    paranoid: true,
    deletedAt: 'deleted_at'
  }
);

Document.TYPES = {
  FILE: 'file',
  TEXT: 'text',
  NUMBER: 'number',
  DATE: 'date'
};

Document.TYPE_LABELS = {
  [Document.TYPES.FILE]: 'فایل',
  [Document.TYPES.TEXT]: 'متن',
  [Document.TYPES.NUMBER]: 'عدد',
  [Document.TYPES.DATE]: 'تاریخ'
};

Document.SUBJECTS = {
  LOAN: 'loan',
  VALIDATION: 'validation',
  GENERAL: 'general'
};

Document.SUBJECT_LABELS = {
  [Document.SUBJECTS.GENERAL]: 'کاربر عمومی',
  [Document.SUBJECTS.LOAN]: 'وام ها',
  [Document.SUBJECTS.VALIDATION]: 'برای اعتبار سنجی'
};

Document.CATEGORIES = {
  PERSONAL_DATA: 'personal_data',
  INCOME_DATA: 'income_data',
  JOB_DATA: 'job_data'
};

Document.CATEGORY_LABELS = {
  [Document.CATEGORIES.PERSONAL_DATA]: 'اطلاعات شخصی',
  [Document.CATEGORIES.JOB_DATA]: 'اطلاعات شغلی',
  [Document.CATEGORIES.INCOME_DATA]: 'اطلاعات درآمدی'
};