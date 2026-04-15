import path from 'node:path';
import {
  SETTING_KEYS,
  loadSettingsItems,
  serializeAdminSettings,
  upsertSetting
} from '../services/site-settings.service.js';

const uploadsRoot = path.resolve(process.cwd(), 'src', 'uploads');

const toRelativeUploadPath = (filePath) =>
  path.relative(uploadsRoot, String(filePath || '')).replace(/\\/g, '/');

const parseJson = (value, fallback) => {
  try {
    const parsed = JSON.parse(String(value || ''));
    return parsed == null ? fallback : parsed;
  } catch {
    return fallback;
  }
};

export const getAdminSettings = async (_req, res, next) => {
  try {
    const items = await loadSettingsItems();
    return res.status(200).json({ settings: serializeAdminSettings(items) });
  } catch (error) {
    return next(error);
  }
};

export const updateAdminSettings = async (req, res, next) => {
  try {
    const currentItems = await loadSettingsItems();
    const current = serializeAdminSettings(currentItems);
    const files = req.files || {};

    let siteLogo = current.siteLogo || '';
    const siteLogoFile = Array.isArray(files.siteLogo) ? files.siteLogo[0] : req.file;
    if (siteLogoFile?.path) {
      siteLogo = toRelativeUploadPath(siteLogoFile.path);
    }

    if (!siteLogo) {
      return res.status(422).json({ message: 'لوگوی سایت الزامی است' });
    }

    const licensesContentInput = parseJson(req.body.licensesContent, {});
    const licenseItems = Array.isArray(licensesContentInput.items) ? licensesContentInput.items : [];
    const uploadedLicenseImages = Array.isArray(files.licensesImages) ? files.licensesImages : [];
    const imageIndexes = parseJson(req.body.licensesImageIndexes, []);

    const uploadedByIndex = new Map();
    uploadedLicenseImages.forEach((file, index) => {
      const itemIndex = Number(imageIndexes[index]);
      if (Number.isInteger(itemIndex) && itemIndex >= 0 && file?.path) {
        uploadedByIndex.set(itemIndex, toRelativeUploadPath(file.path));
      }
    });

    const normalizedLicensesContent = {
      heroTitle: String(licensesContentInput.heroTitle || '').trim(),
      heroDescription: String(licensesContentInput.heroDescription || '').trim(),
      items: licenseItems.map((item, index) => ({
        title: String(item?.title || '').trim(),
        description: String(item?.description || '').trim(),
        imageUrl: uploadedByIndex.get(index) || String(item?.imageUrl || '').trim(),
        verifyUrl: String(item?.verifyUrl || '').trim()
      }))
    };

    await Promise.all([
      upsertSetting(SETTING_KEYS.SITE_NAME, String(req.body.siteName || '').trim()),
      upsertSetting(SETTING_KEYS.SITE_LOGO, siteLogo),
      upsertSetting(SETTING_KEYS.SITE_DESCRIPTION, String(req.body.siteDescription || '').trim()),
      upsertSetting(SETTING_KEYS.MAINTENANCE_MESSAGE, String(req.body.maintenanceMessage || '').trim()),
      upsertSetting(SETTING_KEYS.WEB_PANEL_MAINTENANCE, req.body.webPanelMaintenance === '1' ? '1' : '0'),
      upsertSetting(SETTING_KEYS.CUSTOMER_PANEL_MAINTENANCE, req.body.customerPanelMaintenance === '1' ? '1' : '0'),
      upsertSetting(SETTING_KEYS.BROKER_PANEL_MAINTENANCE, req.body.brokerPanelMaintenance === '1' ? '1' : '0'),
      upsertSetting(SETTING_KEYS.DECREASE_VALIDITY, String(Number(req.body.decreaseValidity || 0))),
      upsertSetting(SETTING_KEYS.LOAN_ADMIN_CONFIRM1, req.body.loanAdminConfirm1 === '1' ? '1' : '0'),
      upsertSetting(SETTING_KEYS.LOAN_ADMIN_CONFIRM2, req.body.loanAdminConfirm2 === '1' ? '1' : '0'),
      upsertSetting(SETTING_KEYS.DEFAULT_META_TITLE, String(req.body.defaultMetaTitle || '').trim()),
      upsertSetting(SETTING_KEYS.DEFAULT_META_DESCRIPTION, String(req.body.defaultMetaDescription || '').trim()),
      upsertSetting(SETTING_KEYS.DEFAULT_META_KEYWORDS, String(req.body.defaultMetaKeywords || '').trim()),
      upsertSetting(SETTING_KEYS.HOME_META_TITLE, String(req.body.homeMetaTitle || '').trim()),
      upsertSetting(SETTING_KEYS.HOME_META_DESCRIPTION, String(req.body.homeMetaDescription || '').trim()),
      upsertSetting(SETTING_KEYS.HOME_META_KEYWORDS, String(req.body.homeMetaKeywords || '').trim()),
      upsertSetting(SETTING_KEYS.MARKET_META_TITLE, String(req.body.marketMetaTitle || '').trim()),
      upsertSetting(SETTING_KEYS.MARKET_META_DESCRIPTION, String(req.body.marketMetaDescription || '').trim()),
      upsertSetting(SETTING_KEYS.MARKET_META_KEYWORDS, String(req.body.marketMetaKeywords || '').trim()),
      upsertSetting(SETTING_KEYS.HOME_FEATURE_CARDS, String(req.body.homeFeatureCards || '[]').trim() || '[]'),
      upsertSetting(SETTING_KEYS.FOOTER_CONTENT, String(req.body.footerContent || '{}').trim() || '{}'),
      upsertSetting(SETTING_KEYS.FEATURED_FACILITY_ID, req.body.featuredFacilityId ? String(Number(req.body.featuredFacilityId || 0)) : ''),
      upsertSetting(SETTING_KEYS.ABOUT_US_CONTENT, String(req.body.aboutUsContent || '{}').trim() || '{}'),
      upsertSetting(SETTING_KEYS.WELCOME_MESSAGE_CUSTOMER, String(req.body.welcomeMessageCustomer || '').trim()),
      upsertSetting(SETTING_KEYS.WELCOME_MESSAGE_BROKER, String(req.body.welcomeMessageBroker || '').trim()),
      upsertSetting(SETTING_KEYS.LICENSES_CONTENT, JSON.stringify(normalizedLicensesContent))
    ]);

    const items = await loadSettingsItems();
    return res.status(200).json({
      message: 'تنظیمات پایه با موفقیت بروزرسانی شد',
      settings: serializeAdminSettings(items)
    });
  } catch (error) {
    return next(error);
  }
};