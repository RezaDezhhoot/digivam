import path from 'node:path';
import { env } from '../config/env.js';
import { Setting } from '../models/setting.model.js';

export const SETTING_KEYS = {
  SITE_NAME: 'site_name',
  SITE_LOGO: 'site_logo',
  SITE_DESCRIPTION: 'site_description',
  MAINTENANCE_MESSAGE: 'maintenance_message',
  WEB_PANEL_MAINTENANCE: 'web_panel_maintenance',
  CUSTOMER_PANEL_MAINTENANCE: 'customer_panel_maintenance',
  BROKER_PANEL_MAINTENANCE: 'broker_panel_maintenance',
  DECREASE_VALIDITY: 'decrease_validity',
  LOAN_ADMIN_CONFIRM1: 'loan_admin_confirm1',
  LOAN_ADMIN_CONFIRM2: 'loan_admin_confirm2',
  DEFAULT_META_TITLE: 'default_meta_title',
  DEFAULT_META_DESCRIPTION: 'default_meta_description',
  DEFAULT_META_KEYWORDS: 'default_meta_keywords',
  HOME_META_TITLE: 'home_meta_title',
  HOME_META_DESCRIPTION: 'home_meta_description',
  HOME_META_KEYWORDS: 'home_meta_keywords',
  MARKET_META_TITLE: 'market_meta_title',
  MARKET_META_DESCRIPTION: 'market_meta_description',
  MARKET_META_KEYWORDS: 'market_meta_keywords',
  HOME_FEATURE_CARDS: 'home_feature_cards',
  FOOTER_CONTENT: 'footer_content',
  FEATURED_FACILITY_ID: 'featured_facility_id'
};

const uploadsRoot = path.resolve(process.cwd(), 'src', 'uploads').replace(/\\/g, '/');

const normalizeString = (value) => String(value || '').trim();

const DEFAULT_HOME_FEATURE_CARDS = [
  {
    title: 'کشف سریع فرصت مناسب',
    description: 'فیلترهای ترکیبی بر اساس مبلغ، ضمانت و نوع اعتبارسنجی، انتخاب را از حالت آزمون و خطا خارج می‌کنند.'
  },
  {
    title: 'تصویر روشن از هر پیشنهاد',
    description: 'روی هر کارت، نرخ، بازه مبلغ، مدارک، زمان پاسخ‌دهی و تعداد نشان‌شدن در یک نگاه دیده می‌شود.'
  },
  {
    title: 'مسیر تصمیم‌گیری نرم و شفاف',
    description: 'کاربر از صفحه اصلی تا انتخاب نهایی، در یک روایت یکپارچه و بدون پرش بین UIهای ناسازگار حرکت می‌کند.'
  }
];

const DEFAULT_FOOTER_CONTENT = {
  aboutTitle: 'درباره دیجی‌وام',
  aboutText:
    'دیجی‌وام یک راهکار هوشمند برای کشف، مقایسه و پیگیری فرصت‌های وام است؛ جایی که انتخاب وام با داده‌های روشن، مسیر اعتبارسنجی مشخص و تجربه‌ای آرام‌تر همراه می‌شود.',
  socialTitle: 'ما را دنبال کنید',
  socialLinks: [
    { label: 'اینستاگرام', url: '#' },
    { label: 'تلگرام', url: '#' },
    { label: 'روبیکا', url: '#' }
  ],
  supportTitle: 'پشتیبانی',
  supportLinks: [
    { label: 'پشتیبانی واتساپ', url: '#' },
    { label: '02128426150', url: 'tel:02128426150' },
    { label: '@digivam_support', url: '#' }
  ],
  copyrightText: '© کلیه حقوق برای دیجی‌وام محفوظ است. هرگونه استفاده از محتوا بدون ذکر منبع غیرمجاز است.'
};

const DEFAULT_MAINTENANCE_MESSAGE = 'در حال بروزرسانی هستیم، بعدا مراجعه کنید';

const parseJson = (value, fallback) => {
  if (!value) {
    return fallback;
  }

  try {
    const parsed = JSON.parse(String(value));
    return parsed == null ? fallback : parsed;
  } catch {
    return fallback;
  }
};

const normalizeLinkItems = (items, fallback = []) => {
  const list = Array.isArray(items) ? items : [];
  const normalized = list
    .map((item) => ({
      label: normalizeString(item?.label),
      url: normalizeString(item?.url)
    }))
    .filter((item) => item.label);

  return normalized.length ? normalized : fallback;
};

const normalizeHomeFeatureCards = (items) => {
  const list = Array.isArray(items) ? items : [];
  const normalized = list
    .map((item) => ({
      title: normalizeString(item?.title),
      description: normalizeString(item?.description)
    }))
    .filter((item) => item.title || item.description);

  return normalized.length ? normalized : DEFAULT_HOME_FEATURE_CARDS;
};

const normalizeFooterContent = (value) => {
  const parsed = value && typeof value === 'object' && !Array.isArray(value) ? value : {};

  return {
    aboutTitle: normalizeString(parsed.aboutTitle) || DEFAULT_FOOTER_CONTENT.aboutTitle,
    aboutText: normalizeString(parsed.aboutText) || DEFAULT_FOOTER_CONTENT.aboutText,
    socialTitle: normalizeString(parsed.socialTitle) || DEFAULT_FOOTER_CONTENT.socialTitle,
    socialLinks: normalizeLinkItems(parsed.socialLinks, DEFAULT_FOOTER_CONTENT.socialLinks),
    supportTitle: normalizeString(parsed.supportTitle) || DEFAULT_FOOTER_CONTENT.supportTitle,
    supportLinks: normalizeLinkItems(parsed.supportLinks, DEFAULT_FOOTER_CONTENT.supportLinks),
    copyrightText: normalizeString(parsed.copyrightText) || DEFAULT_FOOTER_CONTENT.copyrightText
  };
};

const normalizeBooleanSetting = (value) => ['1', 'true', 'yes', 'on'].includes(String(value || '').trim().toLowerCase());

const fileUrl = (value) => {
  if (!value) {
    return null;
  }

  const rawPath = String(value).replace(/\\/g, '/');
  if (/^https?:\/\//i.test(rawPath)) {
    return rawPath;
  }

  const relativePath = rawPath.startsWith(uploadsRoot)
    ? rawPath.slice(uploadsRoot.length).replace(/^\/+/, '')
    : rawPath.replace(/^\/+/, '');

  return `${env.backendBaseUrl}/uploads/${relativePath}`;
};

const toMap = (items) => new Map(items.map((item) => [item.name, item.value]));

const createSeoConfig = ({ title, description, keywords }, fallback) => ({
  title: normalizeString(title) || fallback.title,
  description: normalizeString(description) || fallback.description,
  keywords: normalizeString(keywords) || fallback.keywords
});

export const serializeAdminSettings = (items) => {
  const map = toMap(items);
  const homeFeatureCards = normalizeHomeFeatureCards(parseJson(map.get(SETTING_KEYS.HOME_FEATURE_CARDS), DEFAULT_HOME_FEATURE_CARDS));
  const footerContent = normalizeFooterContent(parseJson(map.get(SETTING_KEYS.FOOTER_CONTENT), DEFAULT_FOOTER_CONTENT));
  const featuredFacilityId = Number(map.get(SETTING_KEYS.FEATURED_FACILITY_ID) || 0) || '';
  const maintenanceMessage = normalizeString(map.get(SETTING_KEYS.MAINTENANCE_MESSAGE)) || DEFAULT_MAINTENANCE_MESSAGE;

  return {
    siteName: map.get(SETTING_KEYS.SITE_NAME) || '',
    siteLogo: map.get(SETTING_KEYS.SITE_LOGO) || '',
    siteLogoUrl: fileUrl(map.get(SETTING_KEYS.SITE_LOGO)),
    siteDescription: map.get(SETTING_KEYS.SITE_DESCRIPTION) || '',
    maintenanceMessage,
    webPanelMaintenance: normalizeBooleanSetting(map.get(SETTING_KEYS.WEB_PANEL_MAINTENANCE)),
    customerPanelMaintenance: normalizeBooleanSetting(map.get(SETTING_KEYS.CUSTOMER_PANEL_MAINTENANCE)),
    brokerPanelMaintenance: normalizeBooleanSetting(map.get(SETTING_KEYS.BROKER_PANEL_MAINTENANCE)),
    decreaseValidity: Number(map.get(SETTING_KEYS.DECREASE_VALIDITY) || 0),
    loanAdminConfirm1: String(map.get(SETTING_KEYS.LOAN_ADMIN_CONFIRM1) || '0') === '1',
    loanAdminConfirm2: String(map.get(SETTING_KEYS.LOAN_ADMIN_CONFIRM2) || '0') === '1',
    defaultMetaTitle: map.get(SETTING_KEYS.DEFAULT_META_TITLE) || '',
    defaultMetaDescription: map.get(SETTING_KEYS.DEFAULT_META_DESCRIPTION) || '',
    defaultMetaKeywords: map.get(SETTING_KEYS.DEFAULT_META_KEYWORDS) || '',
    homeMetaTitle: map.get(SETTING_KEYS.HOME_META_TITLE) || '',
    homeMetaDescription: map.get(SETTING_KEYS.HOME_META_DESCRIPTION) || '',
    homeMetaKeywords: map.get(SETTING_KEYS.HOME_META_KEYWORDS) || '',
    marketMetaTitle: map.get(SETTING_KEYS.MARKET_META_TITLE) || '',
    marketMetaDescription: map.get(SETTING_KEYS.MARKET_META_DESCRIPTION) || '',
    marketMetaKeywords: map.get(SETTING_KEYS.MARKET_META_KEYWORDS) || '',
    homeFeatureCards,
    footerContent,
    featuredFacilityId
  };
};

export const serializePublicSiteSettings = (items) => {
  const settings = serializeAdminSettings(items);
  const siteName = normalizeString(settings.siteName) || 'دی جی وام';
  const siteDescription =
    normalizeString(settings.siteDescription) || 'سامانه مدیریت امتیاز وام و بررسی فرصت های تاییدشده';
  const defaultSeo = createSeoConfig(
    {
      title: settings.defaultMetaTitle,
      description: settings.defaultMetaDescription,
      keywords: settings.defaultMetaKeywords
    },
    {
      title: siteName,
      description: siteDescription,
      keywords: 'وام, امتیاز وام, دی جی وام'
    }
  );

  return {
    siteName,
    siteDescription,
    siteLogoUrl: settings.siteLogoUrl,
    faviconUrl: settings.siteLogoUrl,
    homeFeatureCards: normalizeHomeFeatureCards(settings.homeFeatureCards),
    footer: normalizeFooterContent(settings.footerContent),
    featuredFacilityId: Number(settings.featuredFacilityId || 0) || null,
    maintenanceMessage: settings.maintenanceMessage,
    maintenance: {
      web: Boolean(settings.webPanelMaintenance),
      customer: Boolean(settings.customerPanelMaintenance),
      broker: Boolean(settings.brokerPanelMaintenance)
    },
    defaultSeo,
    homeSeo: createSeoConfig(
      {
        title: settings.homeMetaTitle,
        description: settings.homeMetaDescription,
        keywords: settings.homeMetaKeywords
      },
      defaultSeo
    ),
    marketSeo: createSeoConfig(
      {
        title: settings.marketMetaTitle,
        description: settings.marketMetaDescription,
        keywords: settings.marketMetaKeywords
      },
      defaultSeo
    )
  };
};

export const loadSettingsItems = () => Setting.findAll({ order: [['id', 'ASC']] });

export const loadPublicSiteSettings = async () => serializePublicSiteSettings(await loadSettingsItems());

export const loadMaintenanceSettings = async () => {
  const settings = serializeAdminSettings(await loadSettingsItems());

  return {
    message: settings.maintenanceMessage,
    web: Boolean(settings.webPanelMaintenance),
    customer: Boolean(settings.customerPanelMaintenance),
    broker: Boolean(settings.brokerPanelMaintenance)
  };
};

export const upsertSetting = async (name, value) => {
  const [setting] = await Setting.findOrCreate({ where: { name }, defaults: { value } });
  if (setting.value !== value) {
    setting.value = value;
    await setting.save();
  }
};