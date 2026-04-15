import { DataTypes } from 'sequelize';

export const up = async ({queryInterface}) => {
  await queryInterface.createTable('broker_withdrawals', {
    id: {
      type: DataTypes.BIGINT.UNSIGNED,
      autoIncrement: true,
      primaryKey: true
    },
    broker_id: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false
    },
    wallet_id: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false
    },
    transaction_id: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: true
    },
    amount: {
      type: DataTypes.DECIMAL(40, 2),
      allowNull: false
    },
    status: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: 'pending'
    },
    admin_message: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    admin_file_id: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: true
    },
    resolved_at: {
      type: DataTypes.DATE,
      allowNull: true
    },
    resolved_by: {
      type: DataTypes.BIGINT.UNSIGNED,
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

  await queryInterface.addIndex('broker_withdrawals', ['broker_id']);
  await queryInterface.addIndex('broker_withdrawals', ['status']);
};

export const down = async ({queryInterface}) => {
  await queryInterface.dropTable('broker_withdrawals');
};
