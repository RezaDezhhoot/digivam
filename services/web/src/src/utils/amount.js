const persianDigitMap = {
  '۰': '0',
  '۱': '1',
  '۲': '2',
  '۳': '3',
  '۴': '4',
  '۵': '5',
  '۶': '6',
  '۷': '7',
  '۸': '8',
  '۹': '9',
  '٠': '0',
  '١': '1',
  '٢': '2',
  '٣': '3',
  '٤': '4',
  '٥': '5',
  '٦': '6',
  '٧': '7',
  '٨': '8',
  '٩': '9'
};

const ones = ['', 'یک', 'دو', 'سه', 'چهار', 'پنج', 'شش', 'هفت', 'هشت', 'نه'];
const teens = ['ده', 'یازده', 'دوازده', 'سیزده', 'چهارده', 'پانزده', 'شانزده', 'هفده', 'هجده', 'نوزده'];
const tens = ['', '', 'بیست', 'سی', 'چهل', 'پنجاه', 'شصت', 'هفتاد', 'هشتاد', 'نود'];
const hundreds = ['', 'یکصد', 'دویست', 'سیصد', 'چهارصد', 'پانصد', 'ششصد', 'هفتصد', 'هشتصد', 'نهصد'];
const scales = ['', 'هزار', 'میلیون', 'میلیارد', 'تریلیون', 'کوادریلیون'];

export const normalizeDigits = (value) =>
  String(value ?? '').replace(/[۰-۹٠-٩]/g, (digit) => persianDigitMap[digit] || digit);

export const extractRawAmountInput = (value) => {
  const digits = normalizeDigits(value).replace(/[^\d]/g, '');

  if (!digits) {
    return '';
  }

  return digits.replace(/^0+(?=\d)/, '');
};

export const formatAmountInputDisplay = (value) => {
  const rawValue = extractRawAmountInput(value);
  return rawValue ? new Intl.NumberFormat('fa-IR').format(Number(rawValue)) : '';
};

const underThousandToWords = (value) => {
  const parts = [];
  const number = Number(value || 0);

  if (!number) {
    return '';
  }

  const hundred = Math.floor(number / 100);
  const remainder = number % 100;

  if (hundred) {
    parts.push(hundreds[hundred]);
  }

  if (remainder >= 10 && remainder < 20) {
    parts.push(teens[remainder - 10]);
  } else {
    const ten = Math.floor(remainder / 10);
    const one = remainder % 10;

    if (ten) {
      parts.push(tens[ten]);
    }

    if (one) {
      parts.push(ones[one]);
    }
  }

  return parts.filter(Boolean).join(' و ');
};

export const numberToPersianWords = (value) => {
  const rawValue = extractRawAmountInput(value);

  if (!rawValue) {
    return '';
  }

  if (rawValue === '0') {
    return 'صفر';
  }

  const groups = [];
  for (let index = rawValue.length; index > 0; index -= 3) {
    groups.unshift(rawValue.slice(Math.max(0, index - 3), index));
  }

  const parts = groups
    .map((group, index) => {
      const groupValue = Number(group || 0);
      if (!groupValue) {
        return '';
      }

      const scale = scales[groups.length - index - 1];
      return [underThousandToWords(groupValue), scale].filter(Boolean).join(' ');
    })
    .filter(Boolean);

  return parts.join(' و ');
};

export const formatAmountInWords = (value, currency = 'تومان') => {
  const words = numberToPersianWords(value);
  return words ? `${words} ${currency}` : '';
};

export const isAmountLikeField = (item) => {
  const haystack = [item?.title, item?.label, item?.help, item?.placeholder, item?.typeLabel, item?.fieldTypeLabel]
    .map((entry) => String(entry || '').trim())
    .filter(Boolean)
    .join(' ');

  return /مبلغ|هزینه|قیمت|اعتبار|تومان|ریال/.test(haystack);
};

export const humanizeAmount = (value) => {
  const num = Number(value || 0);
  if (!num || !Number.isFinite(num)) return '۰';
  const fmt = (v) => new Intl.NumberFormat('fa-IR', { maximumFractionDigits: 1 }).format(v);
  if (num >= 1_000_000_000) return `${fmt(num / 1_000_000_000)} میلیارد`;
  if (num >= 1_000_000) return `${fmt(num / 1_000_000)} میلیون`;
  if (num >= 1_000) return `${fmt(num / 1_000)} هزار`;
  return fmt(num);
};