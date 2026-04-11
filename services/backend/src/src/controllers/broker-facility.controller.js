import { Op } from 'sequelize';
import { sequelize } from '../config/database.js';
import { Broker } from '../models/broker.model.js';
import { Facility } from '../models/facility.model.js';
import { FacilityDailyView } from '../models/facility-daily-view.model.js';
import {
  buildFacilityInput,
  createFacilityViewsSummary,
  createStatusSummary,
  facilityBaseInclude,
  getFacilityOptionsPayload,
  loadFacilityById,
  normalizeSearch,
  serializeFacility,
  syncFacilityCollections,
  uniquePositiveInts
} from '../services/facility.service.js';
import { createPaginationResult, getPagination } from '../utils/pagination.js';

const ensureVerifiedBroker = async (brokerId) => {
  const broker = await Broker.findByPk(brokerId);

  if (!broker) {
    const error = new Error('کارگزار یافت نشد');
    error.status = 404;
    throw error;
  }

  if (Number(broker.verifyLevel) < 3) {
    const error = new Error('برای ثبت امتیاز وام باید احراز هویت نهایی تکمیل شده باشد');
    error.status = 403;
    throw error;
  }

  return broker;
};

export const getBrokerFacilityOptions = async (req, res, next) => {
  try {
    const options = await getFacilityOptionsPayload();
    const broker = await Broker.findByPk(req.auth.sub, { attributes: ['id', 'verifyLevel'] });

    return res.status(200).json({
      ...options,
      broker: {
        id: broker?.id || null,
        verifyLevel: Number(broker?.verifyLevel || 0),
        canSubmit: Number(broker?.verifyLevel || 0) >= 3
      }
    });
  } catch (error) {
    return next(error);
  }
};

export const getBrokerFacilitySummary = async (req, res, next) => {
  try {
    const rows = await Facility.findAll({
      where: { brokerId: req.auth.sub },
      include: facilityBaseInclude,
      order: [['updatedAt', 'DESC'], ['id', 'DESC']]
    });

    const items = rows.map(serializeFacility);
    const viewSummary = createFacilityViewsSummary(items);

    return res.status(200).json({
      summary: {
        ...createStatusSummary(items),
        totalViews: viewSummary.totalViews
      },
      latest: items.slice(0, 4),
      topViewed: viewSummary.topViewed
    });
  } catch (error) {
    return next(error);
  }
};

export const getBrokerFacilityDailyViews = async (req, res, next) => {
  try {
    const days = Math.min(Math.max(Number(req.query.days) || 10, 1), 365);
    const endDate = req.query.endDate ? new Date(req.query.endDate) : new Date();
    const startDate = new Date(endDate);
    startDate.setDate(startDate.getDate() - days + 1);

    const format = (d) => d.toISOString().slice(0, 10);

    const facilityIds = (
      await Facility.findAll({
        where: { brokerId: req.auth.sub },
        attributes: ['id'],
        raw: true
      })
    ).map((r) => r.id);

    let rows = [];
    if (facilityIds.length) {
      rows = await FacilityDailyView.findAll({
        attributes: [
          'date',
          [sequelize.fn('SUM', sequelize.col('count')), 'total']
        ],
        where: {
          facilityId: { [Op.in]: facilityIds },
          date: { [Op.between]: [format(startDate), format(endDate)] }
        },
        group: ['date'],
        order: [['date', 'ASC']],
        raw: true
      });
    }

    const map = new Map(rows.map((r) => [r.date, Number(r.total)]));
    const items = [];
    const cursor = new Date(startDate);
    while (cursor <= endDate) {
      const key = format(cursor);
      items.push({ date: key, count: map.get(key) || 0 });
      cursor.setDate(cursor.getDate() + 1);
    }

    return res.status(200).json({ items });
  } catch (error) {
    return next(error);
  }
};

export const listBrokerFacilities = async (req, res, next) => {
  try {
    const search = normalizeSearch(req.query.search);
    const status = normalizeSearch(req.query.status);
    const { page, limit, offset } = getPagination(req.query);
    const where = { brokerId: req.auth.sub };

    if (status) {
      where.status = status;
    }

    if (search) {
      where[Op.or] = [
        { title: { [Op.like]: `%${search}%` } },
        { slug: { [Op.like]: `%${search}%` } },
        { subType: { [Op.like]: `%${search}%` } }
      ];
    }

    const { rows, count } = await Facility.findAndCountAll({
      where,
      attributes: {
        include: [
          [sequelize.literal('(SELECT COUNT(*) FROM facility_bookmarks WHERE facility_bookmarks.facility_id = Facility.id)'), 'bookmarkCount']
        ]
      },
      include: facilityBaseInclude,
      distinct: true,
      order: [['updatedAt', 'DESC'], ['id', 'DESC']],
      limit,
      offset
    });

    return res.status(200).json(
      createPaginationResult({
        items: rows.map(serializeFacility),
        total: count,
        page,
        limit
      })
    );
  } catch (error) {
    return next(error);
  }
};

export const createBrokerFacility = async (req, res, next) => {
  try {
    await ensureVerifiedBroker(req.auth.sub);

    const item = await sequelize.transaction(async (transaction) => {
      const input = await buildFacilityInput({
        payload: req.body,
        brokerId: req.auth.sub,
        transaction
      });

      const facility = await Facility.create(
        {
          ...input.payload,
          status: Facility.STATUSES.PENDING,
          results: null
        },
        { transaction }
      );

      await syncFacilityCollections({
        facilityId: facility.id,
        guaranteeIds: input.guarantees.map((guarantee) => guarantee.id),
        profits: input.profits,
        installments: input.installments,
        documentIds: uniquePositiveInts(req.body.documentIds || []),
        transaction
      });

      return facility;
    });

    const fresh = await loadFacilityById(item.id);

    return res.status(201).json({
      message: 'امتیاز وام ثبت شد و در وضعیت در حال بررسی قرار گرفت',
      item: serializeFacility(fresh)
    });
  } catch (error) {
    return next(error);
  }
};

export const updateBrokerFacility = async (req, res, next) => {
  try {
    await ensureVerifiedBroker(req.auth.sub);

    const item = await Facility.findOne({ where: { id: req.params.id, brokerId: req.auth.sub } });

    if (!item) {
      return res.status(404).json({ message: 'امتیاز وام یافت نشد' });
    }

    await sequelize.transaction(async (transaction) => {
      const input = await buildFacilityInput({
        payload: req.body,
        brokerId: req.auth.sub,
        excludeId: item.id,
        transaction
      });

      await item.update(
        {
          ...input.payload,
          status: Facility.STATUSES.PENDING,
          results: null
        },
        { transaction }
      );

      await syncFacilityCollections({
        facilityId: item.id,
        guaranteeIds: input.guarantees.map((guarantee) => guarantee.id),
        profits: input.profits,
        installments: input.installments,
        documentIds: uniquePositiveInts(req.body.documentIds || []),
        transaction
      });
    });

    const fresh = await loadFacilityById(item.id);

    return res.status(200).json({
      message: 'امتیاز وام بروزرسانی شد و دوباره در صف بررسی قرار گرفت',
      item: serializeFacility(fresh)
    });
  } catch (error) {
    return next(error);
  }
};