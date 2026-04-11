import { RecentlyViewed } from '../models/recently-viewed.model.js';
import { Facility } from '../models/facility.model.js';
import { Broker } from '../models/broker.model.js';
import { sequelize } from '../config/database.js';

export const trackFacilityView = async (customerId, facilityId) => {
  if (!customerId || !facilityId) return;

  try {
    const existing = await RecentlyViewed.findOne({
      where: { customerId: Number(customerId), facilityId: Number(facilityId) }
    });

    if (existing) {
      await existing.update({ viewedAt: new Date() });
    } else {
      await RecentlyViewed.create({
        customerId: Number(customerId),
        facilityId: Number(facilityId),
        viewedAt: new Date()
      });
    }
  } catch {
    /* non-blocking */
  }
};

export const getMyRecentlyViewed = async (req, res, next) => {
  try {
    const customerId = Number(req.auth.sub);
    const limit = Math.min(Math.max(Number(req.query.limit) || 20, 1), 50);

    const rows = await RecentlyViewed.findAll({
      where: { customerId },
      include: [
        {
          model: Facility,
          as: 'facility',
          required: true,
          where: { status: Facility.STATUSES.PUBLISHED },
          include: [
            {
              model: Broker,
              as: 'broker',
              required: false,
              attributes: ['id', 'name', 'phone']
            }
          ]
        }
      ],
      order: [['viewedAt', 'DESC']],
      limit
    });

    const items = rows.map((record) => {
      const raw = typeof record.facility?.toJSON === 'function' ? record.facility.toJSON() : record.facility;

      return {
        viewedAt: record.viewedAt,
        id: raw.id,
        title: raw.title,
        slug: raw.slug,
        minAmount: String(raw.minAmount || 0),
        maxAmount: String(raw.maxAmount || 0),
        views: Number(raw.views || 0),
        brokerName: raw.broker?.name || '-',
        status: raw.status
      };
    });

    return res.status(200).json({ items });
  } catch (error) {
    return next(error);
  }
};
