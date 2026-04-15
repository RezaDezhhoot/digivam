export const name = '202604150001-add-user-model-to-invoices';

const USER_MODELS = new Set(['admin', 'broker', 'customer']);

const normalizeUserModel = (value) => {
    const normalized = String(value || '').trim().toLowerCase();
    return USER_MODELS.has(normalized) ? normalized : null;
};

const parsePayableData = (value) => {
    if (!value) {
        return null;
    }

    if (typeof value === 'object') {
        return value;
    }

    try {
        return JSON.parse(value);
    } catch {
        return null;
    }
};

export const up = async ({ queryInterface, Sequelize, transaction }) => {
    const tableDefinition = await queryInterface.describeTable('invoices', { transaction });

    if (!tableDefinition.user_model) {
        await queryInterface.addColumn(
            'invoices',
            'user_model',
            {
                type: Sequelize.STRING,
                allowNull: true,
                after: 'user_id'
            },
            { transaction }
        );
        await queryInterface.addIndex('invoices', ['user_model', 'user_id'], {
            name: 'invoices_user_model_user_id_index',
            transaction
        });
    }

    const invoices = await queryInterface.sequelize.query(
        'SELECT id, payable_type AS payableType, payable_data AS payableData FROM invoices WHERE user_model IS NULL OR user_model = ""',
        {
            type: Sequelize.QueryTypes.SELECT,
            transaction
        }
    );

    for (const invoice of invoices) {
        const payableData = parsePayableData(invoice.payableData);
        const inferredUserModel =
            normalizeUserModel(payableData?.holderType) ||
            normalizeUserModel(payableData?.userModel) ||
            (String(invoice.payableType || '').trim().toLowerCase() === 'customer_validation' ? 'customer' : null) ||
            (String(invoice.payableType || '').trim().toLowerCase() === 'deal_cash_payment' ? 'customer' : null);

        if (!inferredUserModel) {
            continue;
        }

        await queryInterface.bulkUpdate(
            'invoices',
            { user_model: inferredUserModel },
            { id: invoice.id },
            { transaction }
        );
    }
};

export const down = async ({ queryInterface, transaction }) => {
    await queryInterface.removeIndex('invoices', 'invoices_user_model_user_id_index', { transaction });
    await queryInterface.removeColumn('invoices', 'user_model', { transaction });
};