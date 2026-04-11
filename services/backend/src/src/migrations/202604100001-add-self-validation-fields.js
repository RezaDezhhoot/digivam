export const name = '202604100001-add-self-validation-fields';

export const up = async (queryInterface) => {
  // validations table: selfValidation, selfValidationGuide, selfValidationNote, selfValidationUploadLabel
  await queryInterface.sequelize.query(`
    ALTER TABLE validations
      ADD COLUMN self_validation BOOLEAN NOT NULL DEFAULT 0 AFTER stages,
      ADD COLUMN self_validation_guide TEXT AFTER self_validation,
      ADD COLUMN self_validation_note TEXT AFTER self_validation_guide,
      ADD COLUMN self_validation_upload_label VARCHAR(500) AFTER self_validation_note
  `);

  // customer_validations table: selfValidation, selfValidationFileId
  await queryInterface.sequelize.query(`
    ALTER TABLE customer_validations
      ADD COLUMN self_validation BOOLEAN NOT NULL DEFAULT 0 AFTER expires_at,
      ADD COLUMN self_validation_file_id BIGINT UNSIGNED AFTER self_validation
  `);
};

export const down = async (queryInterface) => {
  await queryInterface.sequelize.query(`
    ALTER TABLE validations
      DROP COLUMN self_validation,
      DROP COLUMN self_validation_guide,
      DROP COLUMN self_validation_note,
      DROP COLUMN self_validation_upload_label
  `);

  await queryInterface.sequelize.query(`
    ALTER TABLE customer_validations
      DROP COLUMN self_validation,
      DROP COLUMN self_validation_file_id
  `);
};
