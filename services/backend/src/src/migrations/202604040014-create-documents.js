export const name = '202604040014-create-documents';

export const up = async ({ queryInterface, Sequelize, transaction }) => {
  const tables = await queryInterface.showAllTables({ transaction });
  const tableNames = tables.map((table) =>
    typeof table === 'string' ? table.toLowerCase() : String(table.tableName || '').toLowerCase()
  );

  if (tableNames.includes('documents')) {
    return;
  }

  await queryInterface.createTable(
    'documents',
    {
      id: {
        type: Sequelize.BIGINT.UNSIGNED,
        allowNull: false,
        autoIncrement: true,
        primaryKey: true
      },
      title: {
        type: Sequelize.STRING,
        allowNull: false
      },
      type: {
        type: Sequelize.STRING,
        allowNull: false
      },
      mimes: {
        type: Sequelize.STRING,
        allowNull: true
      },
      max: {
        type: Sequelize.BIGINT.UNSIGNED,
        allowNull: true
      },
      help: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      deleted_at: {
        type: Sequelize.DATE,
        allowNull: true
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: true
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: true
      },
      subject: {
        type: Sequelize.STRING,
        allowNull: true
      },
      required: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false
      },
      category: {
        type: Sequelize.STRING,
        allowNull: true
      }
    },
    { transaction }
  );

  await queryInterface.addIndex('documents', ['subject'], {
    name: 'documents_subject_index',
    transaction
  });

  await queryInterface.addIndex('documents', ['category'], {
    name: 'documents_category_index',
    transaction
  });

  const now = new Date();
  await queryInterface.bulkInsert(
    'documents',
    [
      { id: 1, title: 'تصویر کارت ملی', type: 'file', mimes: 'png,jpg,jpeg', max: 2048, help: 'asdadaasdsad', deleted_at: null, created_at: now, updated_at: now, subject: 'loan', required: true, category: null },
      { id: 2, title: 'نام پدر', type: 'text', mimes: '', max: 10, help: 'asdsadsad', deleted_at: null, created_at: now, updated_at: now, subject: 'loan', required: false, category: null },
      { id: 3, title: 'asdwww', type: 'number', mimes: '', max: 10, help: 'asdsad', deleted_at: null, created_at: now, updated_at: now, subject: 'loan', required: false, category: null },
      { id: 4, title: 'تاریخ تولد', type: 'date', mimes: '', max: null, help: 'sadasdsad', deleted_at: null, created_at: now, updated_at: now, subject: 'loan', required: true, category: null },
      { id: 5, title: 'nm2', type: 'number', mimes: '', max: null, help: 'asdasdasd', deleted_at: null, created_at: now, updated_at: now, subject: 'loan', required: false, category: null },
      { id: 6, title: 'تصویر شناسنامه', type: 'file', mimes: '', max: null, help: null, deleted_at: null, created_at: now, updated_at: now, subject: 'validation', required: false, category: 'personal_data' },
      { id: 7, title: 'نام پدر', type: 'text', mimes: '', max: null, help: null, deleted_at: null, created_at: now, updated_at: now, subject: 'validation', required: false, category: 'job_data' },
      { id: 8, title: 'شماره شناسنامه', type: 'number', mimes: '', max: 10, help: null, deleted_at: null, created_at: now, updated_at: now, subject: 'validation', required: true, category: 'income_data' },
      { id: 9, title: 'تاریخ تولد', type: 'date', mimes: '', max: null, help: null, deleted_at: null, created_at: now, updated_at: now, subject: 'validation', required: true, category: 'personal_data' }
    ],
    { transaction }
  );
};

export const down = async ({ queryInterface, transaction }) => {
  await queryInterface.dropTable('documents', { transaction });
};