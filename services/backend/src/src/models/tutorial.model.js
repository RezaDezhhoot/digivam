import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

export const Tutorial = sequelize.define(
  'Tutorial',
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
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    sort: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    status: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: 'active'
    }
  },
  {
    tableName: 'tutorials',
    underscored: true,
    timestamps: true
  }
);

Tutorial.VIDEO_SUBJECT = 'video';

Tutorial.STATUSES = {
  ACTIVE: 'active',
  INACTIVE: 'inactive'
};

Tutorial.STATUS_LABELS = {
  active: 'فعال',
  inactive: 'غیرفعال'
};
