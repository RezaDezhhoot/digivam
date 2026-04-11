import { FacilityBookmark } from '../models/facility-bookmark.model.js';
import { Facility } from '../models/facility.model.js';
import { Broker } from '../models/broker.model.js';
import { createPaginationResult, getPagination } from '../utils/pagination.js';

export const toggleBookmark = async (req, res, next) => {
  try {
    const customerId = Number(req.auth.sub);
    const facilityId = Number(req.params.facilityId);

    if (!facilityId || !Number.isInteger(facilityId) || facilityId <= 0) {
      return res.status(422).json({ message: 'شناسه امتیاز وام نامعتبر است' });
    }

    const facility = await Facility.findByPk(facilityId);

    if (!facility || facility.status !== Facility.STATUSES.PUBLISHED) {
      return res.status(404).json({ message: 'امتیاز وام یافت نشد' });
    }

    const existing = await FacilityBookmark.findOne({
      where: { customerId, facilityId }
    });

    if (existing) {
      await existing.destroy();
      return res.status(200).json({ bookmarked: false, message: 'نشان برداشته شد' });
    }

    await FacilityBookmark.create({ customerId, facilityId });
    return res.status(200).json({ bookmarked: true, message: 'نشان شد' });
  } catch (error) {
    return next(error);
  }
};

export const getBookmarkStatus = async (req, res, next) => {
  try {
    const customerId = Number(req.auth.sub);
    const facilityId = Number(req.params.facilityId);

    if (!facilityId || !Number.isInteger(facilityId) || facilityId <= 0) {
      return res.status(200).json({ bookmarked: false });
    }

    const existing = await FacilityBookmark.findOne({
      where: { customerId, facilityId }
    });

    return res.status(200).json({ bookmarked: Boolean(existing) });
  } catch (error) {
    return next(error);
  }
};

export const getMyBookmarks = async (req, res, next) => {
  try {
    const customerId = Number(req.auth.sub);
    const { page, limit, offset } = getPagination(req.query);

    const { rows, count } = await FacilityBookmark.findAndCountAll({
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
      order: [['createdAt', 'DESC']],
      limit,
      offset,
      distinct: true
    });

    const items = rows.map((bookmark) => {
      const raw = typeof bookmark.facility?.toJSON === 'function' ? bookmark.facility.toJSON() : bookmark.facility;

      return {
        bookmarkId: bookmark.id,
        bookmarkedAt: bookmark.createdAt,
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

    return res.status(200).json(
      createPaginationResult({ items, total: count, page, limit })
    );
  } catch (error) {
    return next(error);
  }
};
