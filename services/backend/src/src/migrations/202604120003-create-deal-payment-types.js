export const name = '202604120003-create-deal-payment-types';

export const up = async (queryInterface) => {
  await queryInterface.sequelize.query(`
    CREATE TABLE deal_payment_types (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      deal_id BIGINT UNSIGNED NOT NULL,
      payment_type VARCHAR(255) NOT NULL,
      amount DECIMAL(40, 2) NOT NULL DEFAULT 0,
      \`values\` JSON NULL,
      status VARCHAR(255) NOT NULL DEFAULT 'pending',
      done_at DATETIME NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      KEY deal_payment_types_deal_id_index (deal_id),
      CONSTRAINT deal_payment_types_deal_id_foreign
        FOREIGN KEY (deal_id) REFERENCES deals(id)
        ON DELETE CASCADE ON UPDATE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
};

export const down = async (queryInterface) => {
  await queryInterface.sequelize.query('DROP TABLE IF EXISTS deal_payment_types');
};