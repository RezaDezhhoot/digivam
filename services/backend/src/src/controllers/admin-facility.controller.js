import { Op } from 'sequelize';
import { sequelize } from '../config/database.js';
import { Facility } from '../models/facility.model.js';
import { Notification } from '../models/notification.model.js';
import {
  buildFacilityInput,
  facilityBaseInclude,
  getFacilityOptionsPayload,
  loadFacilityById,
  normalizeSearch,
  serializeFacility,
  syncFacilityCollections,
  uniquePositiveInts
} from '../services/facility.service.js';
import { createNotification } from '../services/notification.service.js';
import { createPaginationResult, getPagination } from '../utils/pagination.js';

export const getAdminFacilityOptions = async (_req, res, next) => {
  try {
    const options = await getFacilityOptionsPayload({ includeBrokers: true, admin: true });
    return res.status(200).json(options);
  } catch (error) {
    return next(error);
  }
};

export const listAdminFacilities = async (req, res, next) => {
  try {
    const search = normalizeSearch(req.query.search);
    const status = normalizeSearch(req.query.status);
    const type = normalizeSearch(req.query.type);
    const brokerId = req.query.brokerId ? Number(req.query.brokerId) : null;
    const loanTypeId = req.query.loanTypeId ? Number(req.query.loanTypeId) : null;
    const { page, limit, offset } = getPagination(req.query);
    const where = {};

    if (status) {
      where.status = status;
    }

    if (type) {
      where.type = type;
    }

    if (brokerId) {
      where.brokerId = brokerId;
    }

    if (loanTypeId) {
      where.subTypeId = loanTypeId;
    }

    if (search) {
      where[Op.or] = [
        { title: { [Op.like]: `%${search}%` } },
        { slug: { [Op.like]: `%${search}%` } },
        { subType: { [Op.like]: `%${search}%` } },
        { '$broker.name$': { [Op.like]: `%${search}%` } },
        { '$broker.phone$': { [Op.like]: `%${search}%` } }
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

export const createAdminFacility = async (req, res, next) => {
  try {
    const item = await sequelize.transaction(async (transaction) => {
      const input = await buildFacilityInput({
        payload: req.body,
        brokerId: req.body.brokerId,
        allowSeo: true,
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
      message: 'امتیاز وام ثبت شد',
      item: serializeFacility(fresh)
    });
  } catch (error) {
    return next(error);
  }
};

export const updateAdminFacility = async (req, res, next) => {
  try {
    const item = await Facility.findByPk(req.params.id);

    if (!item) {
      return res.status(404).json({ message: 'امتیاز وام یافت نشد' });
    }

    await sequelize.transaction(async (transaction) => {
      const input = await buildFacilityInput({
        payload: req.body,
        brokerId: req.body.brokerId,
        excludeId: item.id,
        allowSeo: true,
        currentPublicContent: item.publicContent,
        transaction
      });

      await item.update(input.payload, { transaction });

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
      message: 'امتیاز وام بروزرسانی شد',
      item: serializeFacility(fresh)
    });
  } catch (error) {
    return next(error);
  }
};

export const reviewAdminFacility = async (req, res, next) => {
  try {
    const item = await Facility.findByPk(req.params.id);

    if (!item) {
      return res.status(404).json({ message: 'امتیاز وام یافت نشد' });
    }

    const reason = String(req.body.reason || '').trim();

    await item.update({
      status: req.body.status,
      results: {
        reason,
        reviewedById: req.auth.sub,
        reviewedAt: new Date().toISOString()
      }
    });

    if (req.body.status === Facility.STATUSES.PUBLISHED) {
      await createNotification({
        category: Notification.CATEGORIES.INFO,
        title: 'تایید امتیاز وام',
        body: `کارگزار گرامی، امتیاز شما با عنوان «${item.title}» مورد تایید قرار گرفت و اکنون در وضعیت تایید شده قرار دارد.`,
        modelType: Notification.MODEL_TYPES.BROKER,
        modelId: item.brokerId,
        senderType: Notification.MODEL_TYPES.ADMIN,
        senderId: req.auth.sub,
        metadata: {
          facilityId: item.id,
          status: req.body.status
        }
      });
    }

    if (req.body.status === Facility.STATUSES.REJECTED) {
      await createNotification({
        category: Notification.CATEGORIES.ATTENTION,
        title: 'رد امتیاز وام',
        body: `کارگزار گرامی، امتیاز شما با عنوان «${item.title}» رد شد. دلیل رد: ${reason}`,
        modelType: Notification.MODEL_TYPES.BROKER,
        modelId: item.brokerId,
        senderType: Notification.MODEL_TYPES.ADMIN,
        senderId: req.auth.sub,
        metadata: {
          facilityId: item.id,
          status: req.body.status,
          reason
        }
      });
    }

    const fresh = await loadFacilityById(item.id);

    return res.status(200).json({
      message: req.body.status === Facility.STATUSES.PUBLISHED ? 'امتیاز وام تایید شد' : 'امتیاز وام رد شد',
      item: serializeFacility(fresh)
    });
  } catch (error) {
    return next(error);
  }
};

export const deleteAdminFacility = async (req, res, next) => {
  try {
    const item = await Facility.findByPk(req.params.id);

    if (!item) {
      return res.status(404).json({ message: 'امتیاز وام یافت نشد' });
    }

    await sequelize.transaction(async (transaction) => {
      await syncFacilityCollections({
        facilityId: item.id,
        guaranteeIds: [],
        profits: [],
        installments: [],
        transaction
      });
      await item.destroy({ transaction });
    });

    return res.status(200).json({ message: 'امتیاز وام حذف شد' });
  } catch (error) {
    return next(error);
  }
};