import { DataTypes } from 'sequelize';

export const up = async ({queryInterface}) => {
 await queryInterface.addColumn('facilities', 'average_review_hours', {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: true,
      defaultValue: null,
      after: 'body'
    });
}

export const down = async ({queryInterface}) => {
    await queryInterface.removeColumn('facilities', 'average_review_hours');
}