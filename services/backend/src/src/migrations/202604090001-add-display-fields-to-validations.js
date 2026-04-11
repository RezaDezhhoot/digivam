import { DataTypes } from 'sequelize';

export const up = async ({queryInterface}) => {
  await queryInterface.addColumn('validations', 'intro_title', {
    type: DataTypes.STRING(500),
    allowNull: true,
    after: 'description'
  });

  await queryInterface.addColumn('validations', 'intro_description', {
    type: DataTypes.STRING(1000),
    allowNull: true,
    after: 'intro_title'
  });

  await queryInterface.addColumn('validations', 'steps_label', {
    type: DataTypes.STRING(255),
    allowNull: true,
    after: 'intro_description'
  });

  await queryInterface.addColumn('validations', 'feature_lines', {
    type: DataTypes.JSON,
    allowNull: true,
    after: 'steps_label'
  });
};

export const down = async ({queryInterface}) => {
  await queryInterface.removeColumn('validations', 'feature_lines');
  await queryInterface.removeColumn('validations', 'steps_label');
  await queryInterface.removeColumn('validations', 'intro_description');
  await queryInterface.removeColumn('validations', 'intro_title');
};
