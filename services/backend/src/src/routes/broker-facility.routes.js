import { Router } from 'express';
import {
  createBrokerFacility,
  getBrokerFacilityDailyViews,
  getBrokerFacilityOptions,
  getBrokerFacilitySummary,
  listBrokerFacilities,
  updateBrokerFacility
} from '../controllers/broker-facility.controller.js';
import { requireAuth } from '../middlewares/auth.js';
import { validateRequest } from '../middlewares/validate-request.js';
import { brokerFacilityIdValidator, upsertBrokerFacilityValidator } from '../validators/broker-facility.validator.js';

export const brokerFacilityRouter = Router();

brokerFacilityRouter.use(requireAuth('broker'));

brokerFacilityRouter.get('/options', getBrokerFacilityOptions);
brokerFacilityRouter.get('/summary', getBrokerFacilitySummary);
brokerFacilityRouter.get('/daily-views', getBrokerFacilityDailyViews);
brokerFacilityRouter.get('/', listBrokerFacilities);
brokerFacilityRouter.post('/', upsertBrokerFacilityValidator, validateRequest, createBrokerFacility);
brokerFacilityRouter.put('/:id', [...brokerFacilityIdValidator, ...upsertBrokerFacilityValidator], validateRequest, updateBrokerFacility);