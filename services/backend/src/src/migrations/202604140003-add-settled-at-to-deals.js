import { DataTypes } from 'sequelize';

export const up = async ({queryInterface}) => {
  await queryInterface.addColumn('deals', 'settled_at', {
    type: DataTypes.DATE,
    allowNull: true,
    after: 'broker_confirmation_amount'
  });
};

export const down = async ({queryInterface}) => {
  await queryInterface.removeColumn('deals', 'settled_at');
};
