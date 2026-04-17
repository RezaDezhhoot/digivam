import { Router } from 'express';
import { requireAuth } from '../middlewares/auth.js';
import { upload, uploadDocuments, uploadMedia } from '../middlewares/upload.js';
import { validateRequest } from '../middlewares/validate-request.js';
import {
  createAdminFacility,
  deleteAdminFacility,
  getAdminFacilityOptions,
  listAdminFacilities,
  reviewAdminFacility,
  updateAdminFacility
} from '../controllers/admin-facility.controller.js';
import {
  createDocument,
  deleteDocument,
  listDocumentOptions,
  listDocuments,
  updateDocument
} from '../controllers/admin-document.controller.js';
import {
  listAdminInvoiceTransactions,
  listAdminWalletTransactions
} from '../controllers/admin-transaction.controller.js';
import {
  createValidation,
  deleteValidation,
  listValidations,
  updateValidation
} from '../controllers/admin-validation.controller.js';
import {
  deleteAdminCustomerValidation,
  getAdminCustomerValidation,
  getAdminCustomerValidationSummary,
  listAdminCustomerValidations,
  updateAdminCustomerValidation
} from '../controllers/admin-customer-validation.controller.js';
import {
  createAdminNotification,
  getAdminNotificationOptions,
  listAdminNotifications
} from '../controllers/admin-notification.controller.js';
import {
  getAdminDeal,
  getAdminDealSummary,
  listAdminDeals,
  refreshAdminDealContract,
  removeAdminDealSignature,
  updateAdminDeal
} from '../controllers/admin-deal.controller.js';
import {
  getAdminConversations,
  getAdminDealMessages,
  sendAdminDealMessage,
  getAdminUnreadCount
} from '../controllers/deal-chat.controller.js';
import {
  createAdmin,
  deleteAdmin,
  deleteBroker,
  deleteCustomer,
  getAdminSummary,
  getAdminDealAnalytics,
  getPageViews,
  listAdmins,
  listBrokers,
  listCustomers,
  updateAdmin,
  updateBrokerSuspension,
  updateCustomerSuspension,
  updateBrokerVerifyLevel
} from '../controllers/admin-panel.controller.js';
import { getAdminSettings, updateAdminSettings } from '../controllers/admin-settings.controller.js';
import {
  createGuarantee,
  deleteGuarantee,
  listGuarantees,
  updateGuarantee
} from '../controllers/admin-guarantee.controller.js';
import {
  createLoanType,
  deleteLoanType,
  listLoanTypes,
  updateLoanType
} from '../controllers/admin-type.controller.js';
import {
  getAdminTicketThread,
  listAdminTickets,
  replyAdminTicket
} from '../controllers/admin-ticket.controller.js';
import {
  adminIdValidator,
  brokerIdValidator,
  createAdminValidator,
  customerIdValidator,
  updateAdminValidator,
  updateBrokerSuspensionValidator,
  updateCustomerSuspensionValidator,
  updateBrokerLevelValidator
} from '../validators/admin-panel.validator.js';
import { createAdminNotificationValidator } from '../validators/admin-notification.validator.js';
import { updateSettingsValidator } from '../validators/admin-settings.validator.js';
import { adminDealIdValidator, updateAdminDealValidator } from '../validators/admin-deal.validator.js';
import { facilityIdValidator, reviewAdminFacilityValidator, upsertAdminFacilityValidator } from '../validators/admin-facility.validator.js';
import { documentIdValidator, upsertDocumentValidator } from '../validators/admin-document.validator.js';
import { guaranteeIdValidator, upsertGuaranteeValidator } from '../validators/admin-guarantee.validator.js';
import { adminReplyTicketValidator, adminTicketIdValidator } from '../validators/admin-ticket.validator.js';
import { loanTypeIdValidator, upsertLoanTypeValidator } from '../validators/admin-type.validator.js';
import { upsertValidationValidator, validationIdValidator } from '../validators/admin-validation.validator.js';
import {
  customerValidationIdValidator,
  updateCustomerValidationValidator
} from '../validators/admin-customer-validation.validator.js';
import { createTutorial, deleteTutorial, listTutorials, updateTutorial } from '../controllers/admin-tutorial.controller.js';
import { tutorialIdValidator, upsertTutorialValidator } from '../validators/admin-tutorial.validator.js';
import { listAdminWithdrawals, updateAdminWithdrawal } from '../controllers/admin-withdrawal.controller.js';
import { adminBrokerWalletDeposit, adminBrokerWalletWithdraw } from '../controllers/admin-wallet.controller.js';
import { updateAdminWithdrawalValidator } from '../validators/admin-withdrawal.validator.js';
import { adminBrokerWalletOperationValidator } from '../validators/admin-wallet.validator.js';

export const adminPanelRouter = Router();

adminPanelRouter.use(requireAuth('admin'));

adminPanelRouter.get('/summary', getAdminSummary);
adminPanelRouter.get('/deals/summary', getAdminDealSummary);
adminPanelRouter.get('/deals/conversations', getAdminConversations);
adminPanelRouter.get('/deals/analytics', (req, res, next) => {
  const period = String(req.query.period || 'daily').toLowerCase();
  if (!['daily', 'weekly', 'monthly', 'yearly'].includes(period)) {
    return res.status(422).json({ message: 'دوره نامعتبر است' });
  }
  return next();
}, getAdminDealAnalytics);
adminPanelRouter.get('/deals', listAdminDeals);
adminPanelRouter.get('/deals/:id', adminDealIdValidator, validateRequest, getAdminDeal);
adminPanelRouter.patch('/deals/:id', updateAdminDealValidator, validateRequest, updateAdminDeal);
adminPanelRouter.post('/deals/:id/refresh-contract', adminDealIdValidator, validateRequest, refreshAdminDealContract);
adminPanelRouter.delete('/deals/:id/signature/:role', adminDealIdValidator, validateRequest, removeAdminDealSignature);
adminPanelRouter.get('/deals/:id/messages', adminDealIdValidator, validateRequest, getAdminDealMessages);
adminPanelRouter.post('/deals/:id/messages', adminDealIdValidator, validateRequest, sendAdminDealMessage);
adminPanelRouter.get('/deals/:id/messages/unread', adminDealIdValidator, validateRequest, getAdminUnreadCount);
adminPanelRouter.get('/page-views', getPageViews);
adminPanelRouter.get('/notifications/options', getAdminNotificationOptions);
adminPanelRouter.get('/notifications', listAdminNotifications);
adminPanelRouter.post('/notifications', createAdminNotificationValidator, validateRequest, createAdminNotification);
adminPanelRouter.get('/brokers', listBrokers);
adminPanelRouter.patch('/brokers/:id/verify-level', updateBrokerLevelValidator, validateRequest, updateBrokerVerifyLevel);
adminPanelRouter.patch('/brokers/:id/suspension', updateBrokerSuspensionValidator, validateRequest, updateBrokerSuspension);
adminPanelRouter.delete('/brokers/:id', brokerIdValidator, validateRequest, deleteBroker);

adminPanelRouter.get('/customers', listCustomers);
adminPanelRouter.patch('/customers/:id/suspension', updateCustomerSuspensionValidator, validateRequest, updateCustomerSuspension);
adminPanelRouter.delete('/customers/:id', customerIdValidator, validateRequest, deleteCustomer);

adminPanelRouter.get('/admins', listAdmins);
adminPanelRouter.post('/admins', createAdminValidator, validateRequest, createAdmin);
adminPanelRouter.put('/admins/:id', updateAdminValidator, validateRequest, updateAdmin);
adminPanelRouter.delete('/admins/:id', adminIdValidator, validateRequest, deleteAdmin);

adminPanelRouter.get('/settings', getAdminSettings);
adminPanelRouter.put(
  '/settings',
  upload.fields([
    { name: 'siteLogo', maxCount: 1 },
    { name: 'licensesImages', maxCount: 30 }
  ]),
  updateSettingsValidator,
  validateRequest,
  updateAdminSettings
);

adminPanelRouter.get('/guarantees', listGuarantees);
adminPanelRouter.post('/guarantees', upsertGuaranteeValidator, validateRequest, createGuarantee);
adminPanelRouter.put('/guarantees/:id', [...guaranteeIdValidator, ...upsertGuaranteeValidator], validateRequest, updateGuarantee);
adminPanelRouter.delete('/guarantees/:id', guaranteeIdValidator, validateRequest, deleteGuarantee);

adminPanelRouter.get('/documents/options', listDocumentOptions);
adminPanelRouter.get('/documents', listDocuments);
adminPanelRouter.post('/documents', upsertDocumentValidator, validateRequest, createDocument);
adminPanelRouter.put('/documents/:id', [...documentIdValidator, ...upsertDocumentValidator], validateRequest, updateDocument);
adminPanelRouter.delete('/documents/:id', documentIdValidator, validateRequest, deleteDocument);

adminPanelRouter.get('/facilities/options', getAdminFacilityOptions);
adminPanelRouter.get('/facilities', listAdminFacilities);
adminPanelRouter.post('/facilities', upsertAdminFacilityValidator, validateRequest, createAdminFacility);
adminPanelRouter.put('/facilities/:id', [...facilityIdValidator, ...upsertAdminFacilityValidator], validateRequest, updateAdminFacility);
adminPanelRouter.patch('/facilities/:id/review', [...facilityIdValidator, ...reviewAdminFacilityValidator], validateRequest, reviewAdminFacility);
adminPanelRouter.delete('/facilities/:id', facilityIdValidator, validateRequest, deleteAdminFacility);

adminPanelRouter.get('/validations', listValidations);
adminPanelRouter.post(
  '/validations',
  uploadMedia.fields([{ name: 'trainingVideo', maxCount: 1 }]),
  upsertValidationValidator,
  validateRequest,
  createValidation
);
adminPanelRouter.put(
  '/validations/:id',
  uploadMedia.fields([{ name: 'trainingVideo', maxCount: 1 }]),
  [...validationIdValidator, ...upsertValidationValidator],
  validateRequest,
  updateValidation
);
adminPanelRouter.delete('/validations/:id', validationIdValidator, validateRequest, deleteValidation);

adminPanelRouter.get('/loan-types', listLoanTypes);
adminPanelRouter.get('/transactions/invoices', listAdminInvoiceTransactions);
adminPanelRouter.get('/transactions/wallets', listAdminWalletTransactions);
adminPanelRouter.post(
  '/loan-types',
  upload.fields([{ name: 'logo', maxCount: 1 }, { name: 'banner', maxCount: 1 }, { name: 'contractBackground', maxCount: 1 }]),
  upsertLoanTypeValidator,
  validateRequest,
  createLoanType
);
adminPanelRouter.put(
  '/loan-types/:id',
  upload.fields([{ name: 'logo', maxCount: 1 }, { name: 'banner', maxCount: 1 }, { name: 'contractBackground', maxCount: 1 }]),
  [...loanTypeIdValidator, ...upsertLoanTypeValidator],
  validateRequest,
  updateLoanType
);
adminPanelRouter.delete('/loan-types/:id', loanTypeIdValidator, validateRequest, deleteLoanType);

adminPanelRouter.get('/tickets', listAdminTickets);
adminPanelRouter.get('/tickets/:id', adminTicketIdValidator, validateRequest, getAdminTicketThread);
adminPanelRouter.post('/tickets/:id/replies', adminReplyTicketValidator, validateRequest, replyAdminTicket);

adminPanelRouter.get('/customer-validations/summary', getAdminCustomerValidationSummary);
adminPanelRouter.get('/customer-validations', listAdminCustomerValidations);
adminPanelRouter.get('/customer-validations/:id', customerValidationIdValidator, validateRequest, getAdminCustomerValidation);
adminPanelRouter.put(
  '/customer-validations/:id',
  uploadDocuments.single('adminAttachment'),
  [...customerValidationIdValidator, ...updateCustomerValidationValidator],
  validateRequest,
  updateAdminCustomerValidation
);
adminPanelRouter.delete('/customer-validations/:id', customerValidationIdValidator, validateRequest, deleteAdminCustomerValidation);

adminPanelRouter.get('/tutorials', listTutorials);
adminPanelRouter.post(
  '/tutorials',
  uploadMedia.fields([{ name: 'video', maxCount: 1 }]),
  upsertTutorialValidator,
  validateRequest,
  createTutorial
);
adminPanelRouter.put(
  '/tutorials/:id',
  uploadMedia.fields([{ name: 'video', maxCount: 1 }]),
  [...tutorialIdValidator, ...upsertTutorialValidator],
  validateRequest,
  updateTutorial
);
adminPanelRouter.delete('/tutorials/:id', tutorialIdValidator, validateRequest, deleteTutorial);

adminPanelRouter.get('/withdrawals', listAdminWithdrawals);
adminPanelRouter.put(
  '/withdrawals/:id',
  upload.single('adminFile'),
  updateAdminWithdrawalValidator,
  validateRequest,
  updateAdminWithdrawal
);

// Admin broker wallet operations
adminPanelRouter.post(
  '/brokers/:id/wallet/deposit',
  adminBrokerWalletOperationValidator,
  validateRequest,
  adminBrokerWalletDeposit
);
adminPanelRouter.post(
  '/brokers/:id/wallet/withdraw',
  adminBrokerWalletOperationValidator,
  validateRequest,
  adminBrokerWalletWithdraw
);
