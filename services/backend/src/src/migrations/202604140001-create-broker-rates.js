import { DataTypes } from 'sequelize';

export const up = async ({queryInterface}) => {
  await queryInterface.createTable('broker_rates', {
    id: {
      type: DataTypes.BIGINT.UNSIGNED,
      autoIncrement: true,
      primaryKey: true
    },
    deal_id: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false,
      unique: true
    },
    broker_id: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false
    },
    customer_id: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false
    },
    score: {
      type: DataTypes.TINYINT.UNSIGNED,
      allowNull: false
    },
    comment: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: true
    },
    updated_at: {
      type: DataTypes.DATE,
      allowNull: true
    }
  });

  await queryInterface.addIndex('broker_rates', ['broker_id']);
  await queryInterface.addIndex('broker_rates', ['customer_id']);
  await queryInterface.addIndex('broker_rates', ['deal_id'], { unique: true });
};

export const down = async ({queryInterface}) => {
  await queryInterface.dropTable('broker_rates');
};
