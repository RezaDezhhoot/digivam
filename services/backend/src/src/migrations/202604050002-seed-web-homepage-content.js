export const name = '202604050002-seed-web-homepage-content';

const homepageTypes = [
  { title: 'وام بانکی', type: 'banking' },
  { title: 'وام مسکن', type: 'banking' },
  { title: 'خودرو', type: 'banking' },
  { title: 'تامین سرمایه', type: 'none_banking' },
  { title: 'بدون ضامن', type: 'banking' },
  { title: 'اعتبارسنجی سریع', type: 'banking' }
];

const homepageGuarantees = [
  { title: 'سفته', help: 'ارائه سفته معتبر به عنوان ضمانت ثبت درخواست' },
  { title: 'ضامن', help: 'ثبت ضامن معتبر در فرایند انتقال امتیاز وام' },
  { title: 'چک', help: 'چک بانکی یا صیادی برای تکمیل فرایند مورد نیاز است' },
  { title: 'بدون ضمانت', help: 'این فرصت بدون ضمانت سنتی قابل اقدام است' }
];

const homepageValidation = {
  title: 'مرکز اعتبارسنجی مرآت',
  type: 'meraat-center',
  valid_for: 90,
  amount: '250000.000',
  available: true,
  description: 'اعتبارسنجی سریع و آنلاین برای مشتریان دیجی وام'
};

const homepageBroker = {
  name: 'کارگزار امین',
  phone: '09990000001',
  national_code: '1234567890',
  verify_level: 3,
  auth: 1,
  rate: 8.5,
  metadata: {
    startedAtLabel: '1400'
  },
  address: 'تهران، میدان ونک، مجتمع دیجی وام'
};

const homepageFacilities = [
  {
    slug: 'tarh-mehrbani-melli',
    title: 'طرح مهربانی بانک ملی',
    loanTypeTitle: 'وام بانکی',
    institutionName: 'بانک ملی',
    tags: ['وام بانکی', 'وام مسکن'],
    minAmount: '10000000.00',
    maxAmount: '100000000.00',
    withdrawDeadline: 24,
    requestCount: 1230,
    rating: 8.5,
    brokerRequestCount: 723,
    averageReviewHours: 24,
    documentsCount: 5,
    guarantees: ['چک', 'سفته'],
    profits: ['4.00', '10.00', '24.00'],
    installments: [12, 24, 36],
    validationRequired: false,
    body: 'وام بانکی برای متقاضیانی که به دنبال امتیاز آماده با بازپرداخت منعطف هستند.',
    publicContent: {
      description: 'امتیاز آماده با شرایط مناسب برای انتقال سریع و شروع فرآیند دریافت وام.',
      institutionName: 'بانک ملی',
      tags: ['وام بانکی', 'وام مسکن'],
      requestCount: 1230,
      rating: 8.5,
      brokerRequestCount: 723,
      brokerStartedAt: '1400',
      averageReviewHours: 24,
      documentsCount: 5,
      amountOptions: [50000000, 150000000, 300000000],
      brokerFeeText: 'توافقی',
      digiVamFeeText: '0 تومان',
      digiVamFeeValue: 0,
      brokerSummary: 'بر اساس شرایط وام شما، بهترین گزینه را انتخاب کرده‌ایم',
      importantNotes: [
        'انتقال امتیاز وام پس از بررسی مدارک و تایید کارگزار نهایی می‌شود.',
        'در این فرصت نیازی به اعتبارسنجی جداگانه مشتری وجود ندارد.'
      ]
    }
  },
  {
    slug: 'vam-khodro-tejarat',
    title: 'وام خرید خودرو بانک تجارت',
    loanTypeTitle: 'خودرو',
    institutionName: 'بانک تجارت',
    tags: ['وام بانکی', 'خودرو'],
    minAmount: '30000000.00',
    maxAmount: '90000000.00',
    withdrawDeadline: 12,
    requestCount: 860,
    rating: 8.9,
    brokerRequestCount: 601,
    averageReviewHours: 12,
    documentsCount: 4,
    guarantees: ['ضامن', 'چک'],
    profits: ['12.00', '18.00', '21.00'],
    installments: [24, 36, 48],
    validationRequired: true,
    body: 'مناسب برای خرید خودرو با بازپرداخت میان مدت و امکان انتخاب روش اعتبارسنجی.',
    publicContent: {
      description: 'پیشنهادی برای خرید خودرو با سقف مناسب و فرآیند بررسی سریع.',
      institutionName: 'بانک تجارت',
      tags: ['وام بانکی', 'خودرو'],
      requestCount: 860,
      rating: 8.9,
      brokerRequestCount: 601,
      brokerStartedAt: '1399',
      averageReviewHours: 12,
      documentsCount: 4,
      amountOptions: [50000000, 120000000, 300000000],
      brokerFeeText: 'توافقی',
      digiVamFeeText: '0 تومان',
      digiVamFeeValue: 0,
      validation: {
        providerTitle: 'مرکز اعتبارسنجی مرآت',
        introTitle: 'اعتبارسنجی توسط دیجی وام',
        introDescription: 'ثبت اطلاعات و انجام اعتبارسنجی جدید توسط دیجی وام',
        featureLines: ['دریافت گزارش کامل اعتبار سنجی', 'سریع , آسان و بدون دردسر'],
        costText: 'هزینه ثبت نام و اعتبارسنجی : 250,000 تومان',
        secondaryTitle: 'اعتبارسنجی شخصی(خودم انجام میدم)',
        secondaryDescription: 'در سامانه مرآت اعتبارسنجی کرده یا اگر قبلا اعتبارسنجی کرده اید گزارش خود را بارگذاری کنید.',
        secondaryNote: 'بدون هزینه اضافی',
        uploadLabel: 'بارگذاری فایل گزارش'
      }
    }
  },
  {
    slug: 'emtiaz-jaale-maskan',
    title: 'امتیاز جعاله مسکن',
    loanTypeTitle: 'وام مسکن',
    institutionName: 'بانک پارسیان',
    tags: ['وام مسکن', 'بدون ضامن'],
    minAmount: '40000000.00',
    maxAmount: '80000000.00',
    withdrawDeadline: 18,
    requestCount: 640,
    rating: 9.2,
    brokerRequestCount: 723,
    averageReviewHours: 18,
    documentsCount: 3,
    guarantees: ['سفته'],
    profits: ['6.00', '12.00', '18.00'],
    installments: [12, 24, 36],
    validationRequired: false,
    body: 'انتقال امتیاز مسکن با فرآیند کوتاه و مدارک کمتر برای متقاضیان واجد شرایط.',
    publicContent: {
      description: 'برای متقاضیانی که به دنبال امتیاز آماده و بدون اعتبارسنجی اضافه هستند.',
      institutionName: 'بانک پارسیان',
      tags: ['وام مسکن', 'بدون ضامن'],
      requestCount: 640,
      rating: 9.2,
      brokerRequestCount: 723,
      brokerStartedAt: '1400',
      averageReviewHours: 18,
      documentsCount: 3,
      amountOptions: [50000000, 100000000, 200000000],
      brokerFeeText: 'توافقی',
      digiVamFeeText: '0 تومان',
      digiVamFeeValue: 0,
      importantNotes: [
        'قرارداد پس از تایید کارگزار برای امضای الکترونیکی نمایش داده می‌شود.',
        'تمامی مراحل انتقال امتیاز با نظارت دیجی وام انجام می‌شود.'
      ]
    }
  },
  {
    slug: 'sarmaye-dar-gardesh-bazaar',
    title: 'طرح سرمایه در گردش بازار',
    loanTypeTitle: 'تامین سرمایه',
    institutionName: 'صندوق توسعه بازار',
    tags: ['تامین سرمایه', 'وام بانکی'],
    minAmount: '50000000.00',
    maxAmount: '120000000.00',
    withdrawDeadline: 30,
    requestCount: 420,
    rating: 8.7,
    brokerRequestCount: 320,
    averageReviewHours: 30,
    documentsCount: 6,
    guarantees: ['ضامن'],
    profits: ['10.00', '16.00', '22.00'],
    installments: [18, 24, 36],
    validationRequired: true,
    body: 'تسهیلات سرمایه در گردش برای کسب و کارها با امکان اعتبارسنجی آنلاین.',
    publicContent: {
      description: 'مناسب برای کسب و کارهایی که به سرمایه در گردش سریع و پشتیبانی کارگزار نیاز دارند.',
      institutionName: 'صندوق توسعه بازار',
      tags: ['تامین سرمایه', 'وام بانکی'],
      requestCount: 420,
      rating: 8.7,
      brokerRequestCount: 320,
      brokerStartedAt: '1398',
      averageReviewHours: 30,
      documentsCount: 6,
      amountOptions: [60000000, 150000000, 250000000],
      brokerFeeText: 'توافقی',
      digiVamFeeText: '0 تومان',
      digiVamFeeValue: 0,
      validation: {
        providerTitle: 'مرکز اعتبارسنجی مرآت',
        introTitle: 'اعتبارسنجی توسط دیجی وام',
        introDescription: 'برای این طرح انجام اعتبارسنجی آنلاین قبل از ثبت نهایی الزامی است.',
        featureLines: ['ثبت اطلاعات در 4 مرحله ساده', 'دریافت گزارش کامل و قابل استناد'],
        costText: 'هزینه ثبت نام و اعتبارسنجی : 250,000 تومان'
      }
    }
  },
  {
    slug: 'vam-kala-bedone-zamen',
    title: 'وام خرید کالا بدون ضامن',
    loanTypeTitle: 'بدون ضامن',
    institutionName: 'بانک آینده',
    tags: ['بدون ضامن', 'وام بانکی'],
    minAmount: '20000000.00',
    maxAmount: '60000000.00',
    withdrawDeadline: 10,
    requestCount: 715,
    rating: 9.1,
    brokerRequestCount: 508,
    averageReviewHours: 10,
    documentsCount: 2,
    guarantees: ['بدون ضمانت'],
    profits: ['7.00', '12.00', '16.00'],
    installments: [12, 18, 24],
    validationRequired: true,
    body: 'فرصت خرید کالا با حداقل مدارک و بدون نیاز به ضامن سنتی.',
    publicContent: {
      description: 'با حداقل مدارک و بازه بررسی کوتاه، برای خرید کالا اقدام کنید.',
      institutionName: 'بانک آینده',
      tags: ['بدون ضامن', 'وام بانکی'],
      requestCount: 715,
      rating: 9.1,
      brokerRequestCount: 508,
      brokerStartedAt: '1401',
      averageReviewHours: 10,
      documentsCount: 2,
      amountOptions: [20000000, 40000000, 60000000],
      brokerFeeText: 'توافقی',
      digiVamFeeText: '0 تومان',
      digiVamFeeValue: 0,
      validation: {
        providerTitle: 'مرکز اعتبارسنجی مرآت',
        introTitle: 'اعتبارسنجی توسط دیجی وام',
        introDescription: 'برای وام های بدون ضامن، گزارش اعتبارسنجی معتبر پیش‌نیاز شروع فرآیند است.',
        featureLines: ['دریافت گزارش کامل اعتبار سنجی', 'سریع , آسان و بدون دردسر'],
        costText: 'هزینه ثبت نام و اعتبارسنجی : 250,000 تومان'
      }
    }
  },
  {
    slug: 'tashilat-ezdevaj-vije',
    title: 'تسهیلات ازدواج ویژه',
    loanTypeTitle: 'اعتبارسنجی سریع',
    institutionName: 'بانک رفاه',
    tags: ['وام بانکی', 'اعتبارسنجی سریع'],
    minAmount: '30000000.00',
    maxAmount: '70000000.00',
    withdrawDeadline: 8,
    requestCount: 980,
    rating: 9.4,
    brokerRequestCount: 841,
    averageReviewHours: 8,
    documentsCount: 3,
    guarantees: ['سفته'],
    profits: ['4.00', '8.00', '12.00'],
    installments: [24, 36, 60],
    validationRequired: false,
    body: 'فرصت دریافت سریع تسهیلات ازدواج با نرخ سود پایین و امکان پیگیری آنلاین.',
    publicContent: {
      description: 'برای متقاضیانی که سرعت بررسی و ثبت درخواست برایشان اولویت دارد.',
      institutionName: 'بانک رفاه',
      tags: ['وام بانکی', 'اعتبارسنجی سریع'],
      requestCount: 980,
      rating: 9.4,
      brokerRequestCount: 841,
      brokerStartedAt: '1397',
      averageReviewHours: 8,
      documentsCount: 3,
      amountOptions: [30000000, 50000000, 70000000],
      brokerFeeText: 'توافقی',
      digiVamFeeText: '0 تومان',
      digiVamFeeValue: 0
    }
  },
  {
    slug: 'vam-tamirat-maskan',
    title: 'وام تعمیرات مسکن',
    loanTypeTitle: 'وام مسکن',
    institutionName: 'بانک سامان',
    tags: ['وام مسکن', 'چک'],
    minAmount: '20000000.00',
    maxAmount: '60000000.00',
    withdrawDeadline: 20,
    requestCount: 510,
    rating: 8.3,
    brokerRequestCount: 402,
    averageReviewHours: 20,
    documentsCount: 4,
    guarantees: ['چک'],
    profits: ['9.00', '14.00', '18.00'],
    installments: [24, 30, 36],
    validationRequired: true,
    body: 'تسهیلات تعمیرات مسکن با تضمین چک و امکان ثبت درخواست در کوتاه‌ترین زمان.',
    publicContent: {
      description: 'برای تعمیرات و نوسازی واحد مسکونی با فرآیند شفاف و تحت نظارت دیجی وام.',
      institutionName: 'بانک سامان',
      tags: ['وام مسکن', 'چک'],
      requestCount: 510,
      rating: 8.3,
      brokerRequestCount: 402,
      brokerStartedAt: '1399',
      averageReviewHours: 20,
      documentsCount: 4,
      amountOptions: [20000000, 50000000, 100000000],
      brokerFeeText: 'توافقی',
      digiVamFeeText: '0 تومان',
      digiVamFeeValue: 0,
      validation: {
        providerTitle: 'مرکز اعتبارسنجی مرآت',
        introTitle: 'اعتبارسنجی توسط دیجی وام',
        introDescription: 'برای این طرح نیاز به اعتبارسنجی معتبر مشتری وجود دارد.',
        featureLines: ['دریافت گزارش کامل اعتبار سنجی', 'سریع , آسان و بدون دردسر'],
        costText: 'هزینه ثبت نام و اعتبارسنجی : 250,000 تومان'
      }
    }
  },
  {
    slug: 'tashilat-kasbokar-online',
    title: 'تسهیلات کسب و کار آنلاین',
    loanTypeTitle: 'تامین سرمایه',
    institutionName: 'صندوق نوآوری',
    tags: ['تامین سرمایه', 'اعتبارسنجی سریع'],
    minAmount: '60000000.00',
    maxAmount: '90000000.00',
    withdrawDeadline: 8,
    requestCount: 305,
    rating: 9.1,
    brokerRequestCount: 264,
    averageReviewHours: 8,
    documentsCount: 2,
    guarantees: ['سفته', 'بدون ضمانت'],
    profits: ['8.00', '12.00', '16.00'],
    installments: [12, 18, 24],
    validationRequired: true,
    body: 'سرمایه در گردش سریع برای کسب و کارهای آنلاین با حداقل مدارک.',
    publicContent: {
      description: 'مناسب کسب و کارهای آنلاین که به سرمایه در گردش فوری و فرایند اعتبارسنجی سریع نیاز دارند.',
      institutionName: 'صندوق نوآوری',
      tags: ['تامین سرمایه', 'اعتبارسنجی سریع'],
      requestCount: 305,
      rating: 9.1,
      brokerRequestCount: 264,
      brokerStartedAt: '1401',
      averageReviewHours: 8,
      documentsCount: 2,
      amountOptions: [60000000, 90000000, 140000000],
      brokerFeeText: 'توافقی',
      digiVamFeeText: '0 تومان',
      digiVamFeeValue: 0,
      validation: {
        providerTitle: 'مرکز اعتبارسنجی مرآت',
        introTitle: 'اعتبارسنجی توسط دیجی وام',
        introDescription: 'برای این طرح انتخاب روش اعتبارسنجی پیش از ثبت نهایی ضروری است.',
        featureLines: ['ثبت اطلاعات در 4 مرحله ساده', 'دریافت گزارش کامل و قابل استناد'],
        costText: 'هزینه ثبت نام و اعتبارسنجی : 250,000 تومان'
      }
    }
  }
];

const normalizeRows = (rows = []) => Array.isArray(rows) ? rows : [];
const serializeJsonValue = (value) => (value == null ? null : JSON.stringify(value));

const findRowByField = async ({ queryInterface, table, field, value, transaction }) => {
  const [rows] = await queryInterface.sequelize.query(`SELECT id FROM ${table} WHERE ${field} = ? LIMIT 1`, {
    replacements: [value],
    transaction
  });

  return normalizeRows(rows)[0] || null;
};

const ensureType = async ({ queryInterface, item, now, transaction }) => {
  const found = await findRowByField({ queryInterface, table: 'types', field: 'title', value: item.title, transaction });

  if (found) {
    await queryInterface.bulkUpdate(
      'types',
      {
        type: item.type,
        updated_at: now
      },
      { id: found.id },
      { transaction }
    );

    return found.id;
  }

  await queryInterface.bulkInsert(
    'types',
    [
      {
        title: item.title,
        type: item.type,
        body: null,
        contract_template: null,
        created_at: now,
        updated_at: now
      }
    ],
    { transaction }
  );

  const fresh = await findRowByField({ queryInterface, table: 'types', field: 'title', value: item.title, transaction });
  return fresh?.id || null;
};

const ensureGuarantee = async ({ queryInterface, item, now, transaction }) => {
  const found = await findRowByField({ queryInterface, table: 'guarantees', field: 'title', value: item.title, transaction });

  if (found) {
    await queryInterface.bulkUpdate(
      'guarantees',
      {
        help: item.help || null,
        updated_at: now
      },
      { id: found.id },
      { transaction }
    );

    return found.id;
  }

  await queryInterface.bulkInsert(
    'guarantees',
    [
      {
        title: item.title,
        help: item.help || null,
        created_at: now,
        updated_at: now
      }
    ],
    { transaction }
  );

  const fresh = await findRowByField({ queryInterface, table: 'guarantees', field: 'title', value: item.title, transaction });
  return fresh?.id || null;
};

const ensureValidation = async ({ queryInterface, item, now, transaction }) => {
  const found = await findRowByField({ queryInterface, table: 'validations', field: 'title', value: item.title, transaction });

  const payload = {
    title: item.title,
    type: item.type,
    valid_for: item.valid_for,
    amount: item.amount,
    available: item.available ? 1 : 0,
    description: item.description || null,
    updated_at: now
  };

  if (found) {
    await queryInterface.bulkUpdate('validations', payload, { id: found.id }, { transaction });
    return found.id;
  }

  await queryInterface.bulkInsert(
    'validations',
    [
      {
        ...payload,
        created_at: now,
        deleted_at: null
      }
    ],
    { transaction }
  );

  const fresh = await findRowByField({ queryInterface, table: 'validations', field: 'title', value: item.title, transaction });
  return fresh?.id || null;
};

const ensureBroker = async ({ queryInterface, item, now, transaction }) => {
  const found = await findRowByField({ queryInterface, table: 'brokers', field: 'phone', value: item.phone, transaction });

  const payload = {
    name: item.name,
    national_code: item.national_code,
    verify_level: item.verify_level,
    auth: item.auth,
    rate: item.rate,
    metadata: serializeJsonValue(item.metadata),
    address: item.address || null,
    updated_at: now
  };

  if (found) {
    await queryInterface.bulkUpdate('brokers', payload, { id: found.id }, { transaction });
    return found.id;
  }

  await queryInterface.bulkInsert(
    'brokers',
    [
      {
        ...payload,
        phone: item.phone,
        password: null,
        remember_token: null,
        birthdate: null,
        sheba: null,
        postal_code: null,
        deleted_at: null,
        created_at: now
      }
    ],
    { transaction }
  );

  const fresh = await findRowByField({ queryInterface, table: 'brokers', field: 'phone', value: item.phone, transaction });
  return fresh?.id || null;
};

const upsertFacility = async ({ queryInterface, item, brokerId, typeId, validationId, now, transaction }) => {
  const found = await findRowByField({ queryInterface, table: 'facilities', field: 'slug', value: item.slug, transaction });

  const payload = {
    title: item.title,
    slug: item.slug,
    type: homepageTypes.find((typeItem) => typeItem.title === item.loanTypeTitle)?.type || 'banking',
    sub_type: item.loanTypeTitle,
    min_amount: item.minAmount,
    max_amount: item.maxAmount,
    withdraw_dead_line: item.withdrawDeadline,
    views: Math.max(Math.round(item.requestCount / 3), 12),
    broker_id: brokerId,
    results: serializeJsonValue({
      seeded: true,
      reviewedAt: now.toISOString(),
      note: 'Seeded for dynamic web homepage'
    }),
    saved: 1,
    body: item.body,
    status: 'published',
    auth: null,
    payment_type: 'cash',
    sub_type_id: typeId,
    validation_id: item.validationRequired ? validationId : null,
    public_content: serializeJsonValue(item.publicContent),
    updated_at: now
  };

  if (found) {
    await queryInterface.bulkUpdate('facilities', payload, { id: found.id }, { transaction });
    return found.id;
  }

  await queryInterface.bulkInsert(
    'facilities',
    [
      {
        ...payload,
        deleted_at: null,
        created_at: now
      }
    ],
    { transaction }
  );

  const fresh = await findRowByField({ queryInterface, table: 'facilities', field: 'slug', value: item.slug, transaction });
  return fresh?.id || null;
};

const syncFacilityCollections = async ({ queryInterface, facilityId, guaranteeIds, profits, installments, now, transaction }) => {
  await queryInterface.bulkDelete('facilities_guarantees', { facilities_id: facilityId }, { transaction });
  await queryInterface.bulkDelete('facilities_profits', { facilities_id: facilityId }, { transaction });
  await queryInterface.bulkDelete('facilities_installments', { facilities_id: facilityId }, { transaction });

  if (guaranteeIds.length) {
    await queryInterface.bulkInsert(
      'facilities_guarantees',
      guaranteeIds.map((guaranteeId) => ({
        facilities_id: facilityId,
        guarantee_id: guaranteeId,
        model_type: null,
        model_id: null
      })),
      { transaction }
    );
  }

  if (profits.length) {
    await queryInterface.bulkInsert(
      'facilities_profits',
      profits.map((percent) => ({
        facilities_id: facilityId,
        percent,
        deleted_at: null,
        created_at: now,
        updated_at: now
      })),
      { transaction }
    );
  }

  if (installments.length) {
    await queryInterface.bulkInsert(
      'facilities_installments',
      installments.map((month) => ({
        facilities_id: facilityId,
        month,
        deleted_at: null,
        created_at: now,
        updated_at: now
      })),
      { transaction }
    );
  }
};

export const up = async ({ queryInterface, transaction }) => {
  const now = new Date();
  const typeMap = new Map();
  const guaranteeMap = new Map();

  for (const typeItem of homepageTypes) {
    const id = await ensureType({ queryInterface, item: typeItem, now, transaction });
    typeMap.set(typeItem.title, id);
  }

  for (const guaranteeItem of homepageGuarantees) {
    const id = await ensureGuarantee({ queryInterface, item: guaranteeItem, now, transaction });
    guaranteeMap.set(guaranteeItem.title, id);
  }

  const validationId = await ensureValidation({ queryInterface, item: homepageValidation, now, transaction });
  const brokerId = await ensureBroker({ queryInterface, item: homepageBroker, now, transaction });

  for (const facilityItem of homepageFacilities) {
    const facilityId = await upsertFacility({
      queryInterface,
      item: facilityItem,
      brokerId,
      typeId: typeMap.get(facilityItem.loanTypeTitle),
      validationId,
      now,
      transaction
    });

    await syncFacilityCollections({
      queryInterface,
      facilityId,
      guaranteeIds: facilityItem.guarantees.map((title) => guaranteeMap.get(title)).filter(Boolean),
      profits: facilityItem.profits,
      installments: facilityItem.installments,
      now,
      transaction
    });
  }
};

export const down = async ({ queryInterface, transaction }) => {
  const facilitySlugs = homepageFacilities.map((item) => item.slug);
  const facilityIds = [];

  for (const slug of facilitySlugs) {
    const found = await findRowByField({ queryInterface, table: 'facilities', field: 'slug', value: slug, transaction });
    if (found?.id) {
      facilityIds.push(found.id);
    }
  }

  for (const facilityId of facilityIds) {
    await queryInterface.bulkDelete('facilities_guarantees', { facilities_id: facilityId }, { transaction });
    await queryInterface.bulkDelete('facilities_profits', { facilities_id: facilityId }, { transaction });
    await queryInterface.bulkDelete('facilities_installments', { facilities_id: facilityId }, { transaction });
  }

  await queryInterface.bulkDelete('facilities', { slug: facilitySlugs }, { transaction });
};