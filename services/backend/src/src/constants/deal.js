export const DEAL_LOAN_TYPES = {
  BANKING: 'banking',
  NON_BANKING: 'none_banking'
};

export const DEAL_LOAN_TYPE_LABELS = {
  [DEAL_LOAN_TYPES.BANKING]: 'بانکی',
  [DEAL_LOAN_TYPES.NON_BANKING]: 'غیربانکی'
};

export const DEAL_STATUSES = {
  IN_PROGRESS: 'in_progress',
  FAILED: 'failed',
  SUSPENDED: 'suspended',
  DONE: 'done'
};

export const DEAL_STATUS_LABELS = {
  [DEAL_STATUSES.IN_PROGRESS]: 'در جریان',
  [DEAL_STATUSES.FAILED]: 'ناموفق',
  [DEAL_STATUSES.SUSPENDED]: 'متوقف',
  [DEAL_STATUSES.DONE]: 'انجام شده'
};

export const DEAL_STEPS = {
  SUBMIT: 'submit',
  VERIFY_BROKER: 'verify_broker',
  CONTRACT: 'contract',
  PAYMENT: 'payment',
  TRANSFER: 'transfer',
  VERIFY_CUSTOMER: 'verify_customer',
  FINISHED: 'finished'
};

export const DEAL_STEP_LABELS = {
  [DEAL_STEPS.SUBMIT]: 'ارسال مدارک توسط مشتری',
  [DEAL_STEPS.VERIFY_BROKER]: 'تایید مدارک توسط کارگزار',
  [DEAL_STEPS.CONTRACT]: 'بررسی و امضای قرارداد',
  [DEAL_STEPS.PAYMENT]: 'پرداخت هزینه توسط مشتری',
  [DEAL_STEPS.TRANSFER]: 'انتقال امتیاز توسط کارگزار',
  [DEAL_STEPS.VERIFY_CUSTOMER]: 'تایید انتقال توسط مشتری',
  [DEAL_STEPS.FINISHED]: 'اتمام'
};

export const DEAL_STEP_LEVELS = {
  [DEAL_STEPS.SUBMIT]: 1,
  [DEAL_STEPS.VERIFY_BROKER]: 2,
  [DEAL_STEPS.CONTRACT]: 3,
  [DEAL_STEPS.PAYMENT]: 4,
  [DEAL_STEPS.TRANSFER]: 5,
  [DEAL_STEPS.VERIFY_CUSTOMER]: 6,
  [DEAL_STEPS.FINISHED]: 7
};

export const DEAL_ACT_BY = {
  ADMIN: 'admin',
  CUSTOMER: 'customer',
  BROKER: 'broker',
  CUSTOMER_BROKER: 'customer_broker'
};

export const DEAL_ACT_BY_LABELS = {
  [DEAL_ACT_BY.ADMIN]: 'ادمین',
  [DEAL_ACT_BY.CUSTOMER]: 'مشتری',
  [DEAL_ACT_BY.BROKER]: 'کارگزار',
  [DEAL_ACT_BY.CUSTOMER_BROKER]: 'مشتری و کارگزار'
};

export const DEAL_RESULT_ACTIONS = {
  CREATE: 'create',
  SUBMIT: 'submit',
  APPROVE: 'approve',
  REJECT: 'reject',
  UPDATE: 'update',
  NOTE: 'note'
};

export const PaymentTypes = {
  CASH: 'cash',
  CHECK: 'check'
};

export const PaymentTypeLabels = {
  [PaymentTypes.CASH]: 'پرداخت نقدی',
  [PaymentTypes.CHECK]: 'پرداخت با چک'
};

export const PaymentTypeDescriptions = {
  [PaymentTypes.CASH]: 'مشتری باید مبلغ تعیین شده را پرداخت نماید',
  [PaymentTypes.CHECK]: 'مشتری باید اسناد چک یا سفته را بارگذاری کند'
};

export const DEAL_PAYMENT_STATUSES = {
  DONE: 'done',
  PENDING: 'pending'
};

export const DEAL_PAYMENT_STATUS_LABELS = {
  [DEAL_PAYMENT_STATUSES.DONE]: 'انجام شده',
  [DEAL_PAYMENT_STATUSES.PENDING]: 'در انتظار'
};

export const getDealStepLevel = (step) => DEAL_STEP_LEVELS[step] || 1;