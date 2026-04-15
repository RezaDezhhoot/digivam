export { User } from './user.model.js';
export { Customer } from './customer.model.js';
export { Broker } from './broker.model.js';
export { File } from './file.model.js';
export { Setting } from './setting.model.js';
export { Guarantee } from './guarantee.model.js';
export { Ticket } from './ticket.model.js';
export { Type } from './type.model.js';
export { Wallet } from './wallet.model.js';
export { Transaction } from './transaction.model.js';
export { Invoice } from './invoice.model.js';
export { Document } from './document.model.js';
export { Validation } from './validation.model.js';
export { ValidationDocument } from './validation-document.model.js';
export { Facility } from './facility.model.js';
export { FacilityGuarantee } from './facility-guarantee.model.js';
export { FacilityInstallment } from './facility-installment.model.js';
export { FacilityProfit } from './facility-profit.model.js';
export { Notification } from './notification.model.js';
export { CustomerValidation } from './customer-validation.model.js';
export { PageView } from './page-view.model.js';
export { FacilityDailyView } from './facility-daily-view.model.js';
export { FacilityBookmark } from './facility-bookmark.model.js';
export { FacilityDocument } from './facility-document.model.js';
export { RecentlyViewed } from './recently-viewed.model.js';
export { Deal } from './deal.model.js';
export { DealPaymentType } from './deal-payment-type.model.js';
export { DealMessage } from './deal-message.model.js';
export { DealMessageRead } from './deal-message-read.model.js';
export { Tutorial } from './tutorial.model.js';
export { BrokerRate } from './broker-rate.model.js';
export { BrokerWithdrawal } from './broker-withdrawal.model.js';

import { User } from './user.model.js';
import { Customer } from './customer.model.js';
import { Broker } from './broker.model.js';
import { File } from './file.model.js';
import { Guarantee } from './guarantee.model.js';
import { Ticket } from './ticket.model.js';
import { Type } from './type.model.js';
import { Wallet } from './wallet.model.js';
import { Transaction } from './transaction.model.js';
import { Invoice } from './invoice.model.js';
import { Document } from './document.model.js';
import { Validation } from './validation.model.js';
import { ValidationDocument } from './validation-document.model.js';
import { Facility } from './facility.model.js';
import { FacilityGuarantee } from './facility-guarantee.model.js';
import { FacilityInstallment } from './facility-installment.model.js';
import { FacilityProfit } from './facility-profit.model.js';
import { Notification } from './notification.model.js';
import { CustomerValidation } from './customer-validation.model.js';
import { FacilityBookmark } from './facility-bookmark.model.js';
import { FacilityDocument } from './facility-document.model.js';
import { RecentlyViewed } from './recently-viewed.model.js';
import { Deal } from './deal.model.js';
import { DealPaymentType } from './deal-payment-type.model.js';
import { DealMessage } from './deal-message.model.js';
import { DealMessageRead } from './deal-message-read.model.js';
import { Tutorial } from './tutorial.model.js';
import { BrokerRate } from './broker-rate.model.js';
import { BrokerWithdrawal } from './broker-withdrawal.model.js';

Broker.hasOne(File, {
	as: 'avatar',
	foreignKey: 'fileable_id',
	constraints: false,
	scope: { fileable_type: 'broker', subject: Broker.AVATAR_SUBJECT }
});

Broker.hasOne(File, {
	as: 'idCart',
	foreignKey: 'fileable_id',
	constraints: false,
	scope: { fileable_type: 'broker', subject: Broker.ID_CART_IMAGE_SUBJECT }
});

Broker.hasOne(File, {
	as: 'birthCertificate',
	foreignKey: 'fileable_id',
	constraints: false,
	scope: { fileable_type: 'broker', subject: Broker.BIRTH_CERTIFICATE_IMAGE_SUBJECT }
});

Customer.hasOne(File, {
	as: 'avatar',
	foreignKey: 'fileable_id',
	constraints: false,
	scope: { fileable_type: 'customer', subject: Customer.AVATAR_SUBJECT }
});

Type.hasOne(File, {
	as: 'logo',
	foreignKey: 'fileable_id',
	constraints: false,
	scope: { fileable_type: 'type', subject: Type.LOGO_SUBJECT }
});

Type.hasOne(File, {
	as: 'banner',
	foreignKey: 'fileable_id',
	constraints: false,
	scope: { fileable_type: 'type', subject: Type.BANNER_SUBJECT }
});

Type.hasOne(File, {
	as: 'contractBackground',
	foreignKey: 'fileable_id',
	constraints: false,
	scope: { fileable_type: 'type', subject: Type.CONTRACT_BACKGROUND_SUBJECT }
});

Broker.hasMany(Facility, {
	as: 'facilities',
	foreignKey: 'broker_id'
});

Facility.belongsTo(Broker, {
	as: 'broker',
	foreignKey: 'broker_id'
});

Type.hasMany(Facility, {
	as: 'facilities',
	foreignKey: 'sub_type_id'
});

Facility.belongsTo(Type, {
	as: 'subTypeModel',
	foreignKey: 'sub_type_id'
});

Validation.hasMany(Facility, {
	as: 'facilities',
	foreignKey: 'validation_id'
});

Facility.belongsTo(Validation, {
	as: 'validation',
	foreignKey: 'validation_id'
});

Facility.belongsToMany(Guarantee, {
	as: 'guarantees',
	through: FacilityGuarantee,
	foreignKey: 'facilities_id',
	otherKey: 'guarantee_id',
	constraints: false
});

Guarantee.belongsToMany(Facility, {
	as: 'facilities',
	through: FacilityGuarantee,
	foreignKey: 'guarantee_id',
	otherKey: 'facilities_id',
	constraints: false
});

Facility.hasMany(FacilityInstallment, {
	as: 'installments',
	foreignKey: 'facilities_id'
});

FacilityInstallment.belongsTo(Facility, {
	as: 'facility',
	foreignKey: 'facilities_id'
});

Facility.hasMany(FacilityProfit, {
	as: 'profits',
	foreignKey: 'facilities_id'
});

FacilityProfit.belongsTo(Facility, {
	as: 'facility',
	foreignKey: 'facilities_id'
});

Validation.hasOne(File, {
	as: 'trainingVideo',
	foreignKey: 'fileable_id',
	constraints: false,
	scope: { fileable_type: 'validation', subject: Validation.TRAINING_VIDEO_SUBJECT }
});

User.hasMany(File, {
	as: 'files',
	foreignKey: 'fileable_id',
	constraints: false,
	scope: { fileable_type: 'user' }
});

User.hasOne(Wallet, {
	as: 'wallet',
	foreignKey: 'holder_id',
	constraints: false,
	scope: { holder_type: Wallet.HOLDER_TYPES.ADMIN }
});

Broker.hasOne(Wallet, {
	as: 'wallet',
	foreignKey: 'holder_id',
	constraints: false,
	scope: { holder_type: Wallet.HOLDER_TYPES.BROKER }
});

Customer.hasOne(Wallet, {
	as: 'wallet',
	foreignKey: 'holder_id',
	constraints: false,
	scope: { holder_type: Wallet.HOLDER_TYPES.CUSTOMER }
});

Wallet.hasMany(Transaction, {
	as: 'transactions',
	foreignKey: 'wallet_id'
});

Wallet.hasMany(Invoice, {
	as: 'invoices',
	foreignKey: 'payable_id',
	constraints: false,
	scope: { payable_type: 'wallet' }
});

Transaction.belongsTo(Wallet, {
	as: 'wallet',
	foreignKey: 'wallet_id'
});

Invoice.belongsTo(Wallet, {
	as: 'wallet',
	foreignKey: 'payable_id',
	constraints: false
});

Validation.belongsToMany(Document, {
	as: 'documents',
	through: ValidationDocument,
	foreignKey: 'validation_id',
	otherKey: 'document_id',
	constraints: false
});

Document.belongsToMany(Validation, {
	as: 'validations',
	through: ValidationDocument,
	foreignKey: 'document_id',
	otherKey: 'validation_id',
	constraints: false
});

Validation.hasMany(ValidationDocument, {
	as: 'documentLinks',
	foreignKey: 'validation_id'
});

Customer.hasMany(CustomerValidation, {
	as: 'customerValidations',
	foreignKey: 'customer_id'
});

CustomerValidation.belongsTo(Customer, {
	as: 'customer',
	foreignKey: 'customer_id'
});

Validation.hasMany(CustomerValidation, {
	as: 'customerValidations',
	foreignKey: 'validation_id'
});

CustomerValidation.belongsTo(Validation, {
	as: 'validation',
	foreignKey: 'validation_id'
});

Document.hasMany(ValidationDocument, {
	as: 'validationLinks',
	foreignKey: 'document_id'
});

ValidationDocument.belongsTo(Validation, {
	as: 'validation',
	foreignKey: 'validation_id'
});

ValidationDocument.belongsTo(Document, {
	as: 'document',
	foreignKey: 'document_id'
});

Ticket.belongsTo(Ticket, {
	as: 'parent',
	foreignKey: 'parent_id',
	constraints: false
});

Ticket.hasMany(Ticket, {
	as: 'replies',
	foreignKey: 'parent_id',
	constraints: false
});

Customer.hasMany(FacilityBookmark, {
	as: 'bookmarks',
	foreignKey: 'customer_id'
});

FacilityBookmark.belongsTo(Customer, {
	as: 'customer',
	foreignKey: 'customer_id'
});

Facility.hasMany(FacilityBookmark, {
	as: 'bookmarks',
	foreignKey: 'facility_id'
});

FacilityBookmark.belongsTo(Facility, {
	as: 'facility',
	foreignKey: 'facility_id'
});

Customer.hasMany(Deal, {
	as: 'deals',
	foreignKey: 'customer_id'
});

Deal.belongsTo(Customer, {
	as: 'customer',
	foreignKey: 'customer_id'
});

Broker.hasMany(Deal, {
	as: 'deals',
	foreignKey: 'broker_id'
});

Deal.belongsTo(Broker, {
	as: 'broker',
	foreignKey: 'broker_id'
});

Deal.hasMany(DealPaymentType, {
	as: 'paymentTypes',
	foreignKey: 'deal_id'
});

DealPaymentType.belongsTo(Deal, {
	as: 'deal',
	foreignKey: 'deal_id'
});

Deal.hasMany(DealMessage, {
	as: 'messages',
	foreignKey: 'deal_id'
});

DealMessage.belongsTo(Deal, {
	as: 'deal',
	foreignKey: 'deal_id'
});

Deal.hasMany(DealMessageRead, {
	as: 'messageReads',
	foreignKey: 'deal_id'
});

DealMessageRead.belongsTo(Deal, {
	as: 'deal',
	foreignKey: 'deal_id'
});

Facility.hasMany(Deal, {
	as: 'deals',
	foreignKey: 'facility_id'
});

Deal.belongsTo(Facility, {
	as: 'facility',
	foreignKey: 'facility_id'
});

Facility.belongsToMany(Document, {
	as: 'requiredDocuments',
	through: FacilityDocument,
	foreignKey: 'facility_id',
	otherKey: 'document_id',
	constraints: false
});

Document.belongsToMany(Facility, {
	as: 'facilities',
	through: FacilityDocument,
	foreignKey: 'document_id',
	otherKey: 'facility_id',
	constraints: false
});

Facility.hasMany(FacilityDocument, {
	as: 'documentLinks',
	foreignKey: 'facility_id'
});

FacilityDocument.belongsTo(Facility, {
	as: 'facility',
	foreignKey: 'facility_id'
});

FacilityDocument.belongsTo(Document, {
	as: 'document',
	foreignKey: 'document_id'
});

Customer.hasMany(RecentlyViewed, {
	as: 'recentlyViewed',
	foreignKey: 'customer_id'
});

RecentlyViewed.belongsTo(Customer, {
	as: 'customer',
	foreignKey: 'customer_id'
});

Facility.hasMany(RecentlyViewed, {
	as: 'recentViews',
	foreignKey: 'facility_id'
});

RecentlyViewed.belongsTo(Facility, {
	as: 'facility',
	foreignKey: 'facility_id'
});

Broker.hasMany(BrokerRate, {
	as: 'rates',
	foreignKey: 'broker_id'
});

BrokerRate.belongsTo(Broker, {
	as: 'broker',
	foreignKey: 'broker_id'
});

Deal.hasOne(BrokerRate, {
	as: 'brokerRate',
	foreignKey: 'deal_id'
});

BrokerRate.belongsTo(Deal, {
	as: 'deal',
	foreignKey: 'deal_id'
});

Customer.hasMany(BrokerRate, {
	as: 'brokerRates',
	foreignKey: 'customer_id'
});

BrokerRate.belongsTo(Customer, {
	as: 'customer',
	foreignKey: 'customer_id'
});

Broker.hasMany(BrokerWithdrawal, {
	as: 'withdrawals',
	foreignKey: 'broker_id'
});

BrokerWithdrawal.belongsTo(Broker, {
	as: 'broker',
	foreignKey: 'broker_id'
});

Wallet.hasMany(BrokerWithdrawal, {
	as: 'withdrawals',
	foreignKey: 'wallet_id'
});

BrokerWithdrawal.belongsTo(Wallet, {
	as: 'wallet',
	foreignKey: 'wallet_id'
});

BrokerWithdrawal.belongsTo(Transaction, {
	as: 'transaction',
	foreignKey: 'transaction_id'
});

BrokerWithdrawal.hasOne(File, {
	as: 'adminFile',
	foreignKey: 'fileable_id',
	constraints: false,
	scope: { fileable_type: 'broker_withdrawal', subject: 'admin_file' }
});

Tutorial.hasOne(File, {
	as: 'video',
	foreignKey: 'fileable_id',
	constraints: false,
	scope: { fileable_type: 'tutorial', subject: Tutorial.VIDEO_SUBJECT }
});
