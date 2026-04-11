import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

export const Validation = sequelize.define(
  'Validation',
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
    validFor: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: true,
      field: 'valid_for'
    },
    amount: {
      type: DataTypes.DECIMAL(40, 3),
      allowNull: true
    },
    available: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    introTitle: {
      type: DataTypes.STRING(500),
      allowNull: true,
      field: 'intro_title'
    },
    introDescription: {
      type: DataTypes.STRING(1000),
      allowNull: true,
      field: 'intro_description'
    },
    stepsLabel: {
      type: DataTypes.STRING(255),
      allowNull: true,
      field: 'steps_label'
    },
    featureLines: {
      type: DataTypes.JSON,
      allowNull: true,
      field: 'feature_lines'
    },
    stages: {
      type: DataTypes.JSON,
      allowNull: true
    },
    selfValidation: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      field: 'self_validation'
    },
    selfValidationGuide: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'self_validation_guide'
    },
    selfValidationNote: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'self_validation_note'
    },
    selfValidationUploadLabel: {
      type: DataTypes.STRING(500),
      allowNull: true,
      field: 'self_validation_upload_label'
    },
    deletedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'deleted_at'
    }
  },
  {
    tableName: 'validations',
    underscored: true,
    timestamps: true,
    paranoid: true,
    deletedAt: 'deleted_at'
  }
);

Validation.TRAINING_VIDEO_SUBJECT = 'training_video';