export const name = '202604100003-add-admin-attachment-to-customer-validations';

export const up = async (queryInterface) => {
  await queryInterface.sequelize.query(`
    ALTER TABLE customer_validations
      ADD COLUMN admin_attachemnt BIGINT UNSIGNED NULL AFTER self_validation_file_id
  `);
};

export const down = async (queryInterface) => {
  await queryInterface.sequelize.query(`
    ALTER TABLE customer_validations
      DROP COLUMN admin_attachemnt
  `);
};
