export const BROKER_VERIFY_LEVEL = {
  LEVEL_1: 1,
  LEVEL_2: 2,
  LEVEL_3: 3
};

export const brokerVerifySteps = [
  {
    value: BROKER_VERIFY_LEVEL.LEVEL_1,
    shortLabel: 'اطلاعات پایه',
    label: 'در انتظار تکمیل اطلاعات پایه',
    icon: 'fa-solid fa-id-card',
    tone: 'warning',
    description: 'اطلاعات پایه هویتی هنوز تکمیل نشده است.'
  },
  {
    value: BROKER_VERIFY_LEVEL.LEVEL_2,
    shortLabel: 'بارگزاری مدارک',
    label: 'در انتظار بارگزاری مدارک',
    icon: 'fa-solid fa-file-arrow-up',
    tone: 'warning',
    description: 'اطلاعات پایه ثبت شده و مدارک احراز هویت باید بارگزاری شوند.'
  },
  {
    value: BROKER_VERIFY_LEVEL.LEVEL_3,
    shortLabel: 'تایید شده',
    label: 'تایید شده',
    icon: 'fa-solid fa-circle-check',
    tone: 'success',
    description: 'احراز هویت کارگزار تکمیل و تایید شده است.'
  }
];

export const getBrokerVerifyMeta = (level) => {
  const normalized = Number(level) >= BROKER_VERIFY_LEVEL.LEVEL_3
    ? BROKER_VERIFY_LEVEL.LEVEL_3
    : Number(level) === BROKER_VERIFY_LEVEL.LEVEL_2
      ? BROKER_VERIFY_LEVEL.LEVEL_2
      : BROKER_VERIFY_LEVEL.LEVEL_1;

  return brokerVerifySteps.find((item) => item.value === normalized) || brokerVerifySteps[0];
};