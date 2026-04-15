import { Op } from 'sequelize';
import { createWebHomePayload, findPublishedWebFacilityBySlug, listPublishedWebFacilities } from '../services/web-public.service.js';
import { loadPublicSiteSettings } from '../services/site-settings.service.js';
import { trackFacilityView } from './customer-recently-viewed.controller.js';
import { Tutorial } from '../models/tutorial.model.js';
import { File } from '../models/file.model.js';
import { Setting } from '../models/setting.model.js';
import { env } from '../config/env.js';
import path from 'node:path';

export const getWebHome = async (req, res, next) => {
  try {
    const filters = {
      category: req.query.category || '',
      guarantee: req.query.guarantee || '',
      credit: req.query.credit || '',
      minAmount: req.query.minAmount ? Number(req.query.minAmount) : 0,
      maxAmount: req.query.maxAmount ? Number(req.query.maxAmount) : 0,
      sort: req.query.sort || ''
    };
    const payload = await createWebHomePayload(filters);
    return res.status(200).json(payload);
  } catch (error) {
    return next(error);
  }
};

export const listWebFacilities = async (req, res, next) => {
  try {
    const page = Math.max(Number(req.query.page) || 1, 1);
    const limit = Math.min(Math.max(Number(req.query.limit) || 12, 1), 50);
    const search = String(req.query.search || '').trim();
    const filters = {
      category: req.query.category || '',
      guarantee: req.query.guarantee || '',
      credit: req.query.credit || '',
      minAmount: req.query.minAmount ? Number(req.query.minAmount) : 0,
      maxAmount: req.query.maxAmount ? Number(req.query.maxAmount) : 0,
      sort: req.query.sort || ''
    };
    const [allItems, preFilteredItems, site] = await Promise.all([
      listPublishedWebFacilities(),
      listPublishedWebFacilities(filters),
      loadPublicSiteSettings()
    ]);
    const categories = [...new Set(allItems.flatMap((item) => item.tags || []).map((item) => String(item || '').trim()).filter(Boolean))];
    const guarantees = [...new Set(allItems.flatMap((item) => item.guaranteeBadges || []).map((item) => String(item || '').trim()).filter(Boolean))];
    const amountValues = allItems
      .flatMap((item) => [Number(item.minAmount || 0) / 1000000, Number(item.maxAmount || 0) / 1000000])
      .filter((value) => Number.isFinite(value) && value > 0);
    const amountBounds = amountValues.length
      ? {
          min: Math.floor(Math.min(...amountValues)),
          max: Math.ceil(Math.max(...amountValues))
        }
      : { min: 10, max: 120 };
    const totalRequests = allItems.reduce((sum, item) => sum + Number(item.requestCount || 0), 0);
    const averageRating = allItems.length
      ? Number((allItems.reduce((sum, item) => sum + Number(item.rating || 0), 0) / allItems.length).toFixed(1))
      : 0;
    const filtered = search
      ? preFilteredItems.filter((item) => [item.title, item.institutionName, ...(item.tags || [])].join(' ').includes(search))
      : preFilteredItems;
    const total = filtered.length;
    const offset = (page - 1) * limit;
    const items = filtered.slice(offset, offset + limit);
    return res.status(200).json({
      items,
      total,
      page,
      limit,
      hasMore: offset + limit < total,
      site,
      seo: site.marketSeo,
      categories,
      guarantees,
      amountBounds,
      summary: {
        publishedFacilities: allItems.length,
        totalRequests,
        averageRating
      }
    });
  } catch (error) {
    return next(error);
  }
};

export const getWebFacilityBySlug = async (req, res, next) => {
  try {
    const [item, site] = await Promise.all([findPublishedWebFacilityBySlug(req.params.slug), loadPublicSiteSettings()]);

    if (!item) {
      return res.status(404).json({ message: 'امتیاز وام مورد نظر یافت نشد' });
    }

    if (req.auth?.role === 'customer' && req.auth?.sub) {
      trackFacilityView(req.auth.sub, item.id);
    }

    return res.status(200).json({ item, site });
  } catch (error) {
    return next(error);
  }
};

const uploadsRoot = path.resolve(process.cwd(), 'src', 'uploads');

const tutorialFileUrl = (file) => {
  if (!file) return null;
  const rawPath = String(file.path || '').replace(/\\/g, '/');
  if (/^https?:\/\//i.test(rawPath)) return rawPath;
  const relativePath = rawPath.startsWith(uploadsRoot)
    ? rawPath.slice(uploadsRoot.length).replace(/^\/+/, '')
    : rawPath.replace(/^\/+/, '');
  return `${env.backendBaseUrl}/uploads/${relativePath}`;
};

export const listPublicTutorials = async (req, res, next) => {
  try {
    const search = String(req.query.search || '').trim();
    const where = { status: 'active' };

    if (search) {
      where.title = { [Op.like]: `%${search}%` };
    }

    const items = await Tutorial.findAll({
      where,
      include: [{ model: File, as: 'video', attributes: ['id', 'path', 'mimeType', 'size'] }],
      order: [['sort', 'ASC'], ['id', 'DESC']]
    });

    return res.status(200).json({
      items: items.map((item) => ({
        id: item.id,
        title: item.title,
        description: item.description || '',
        videoUrl: tutorialFileUrl(item.video),
        createdAt: item.createdAt
      }))
    });
  } catch (error) {
    return next(error);
  }
};

export const getAboutUs = async (req, res, next) => {
  try {
    const setting = await Setting.findOne({ where: { name: 'about_us_content' } });
    let content = {};
    try { content = JSON.parse(setting?.value || '{}'); } catch { content = { description: setting?.value || '' }; }
    return res.status(200).json({ content });
  } catch (error) {
    return next(error);
  }
};

export const getLicenses = async (_req, res, next) => {
  try {
    const site = await loadPublicSiteSettings();
    return res.status(200).json({
      content: site.licensesContent || {}
    });
  } catch (error) {
    return next(error);
  }
};

export const getSiteConfig = async (_req, res, next) => {
  try {
    const site = await loadPublicSiteSettings();
    return res.status(200).json({
      site: {
        siteName: site.siteName,
        siteLogoUrl: site.siteLogoUrl,
        faviconUrl: site.faviconUrl
      }
    });
  } catch (error) {
    return next(error);
  }
};