import { sequelize } from '../../config/database.js';
import { PaymentDriver } from './interfaces/payment-driver.js';
import { PaymentStatus } from './enums/payment-status.js';

export class Driver extends PaymentDriver {
  constructor(payable = null) {
    super();
    this.invoice = null;
    this.status = null;
    this.payable = payable;
    this.successful = false;
    this.paymentLink = null;
    this.amountValue = 0;
    this.extraData = {};
    this.payload = {};
  }

  async get(invoice) {
    this.invoice = invoice;
    this.payable = invoice?.payableData || this.payable;
    this.status = invoice?.status || null;
    this.amountValue = Number(invoice?.amount || 0);
    return this;
  }

  async make(invoice, context = {}) {
    this.invoice = invoice;
    this.invoice.status = PaymentStatus.PENDING;
    this.invoice.driver = this.constructor.DRIVER_NAME || this.constructor.name;
    this.invoice.amount = this.amountValue;
    this.invoice.totalAmount = this.getAmount();
    this.invoice.payableData = this.payable || null;
    this.invoice.userId = context.userId || null;
    this.invoice.userModel = context.userModel || null;
    this.invoice.ip = context.ip || null;
    this.invoice.payableType = context.payableType || null;
    this.invoice.payableId = context.payableId || null;
    this.status = PaymentStatus.PENDING;
    await this.save();
    return this;
  }

  isSuccessful() {
    return this.successful;
  }

  fill(data = {}) {
    this.payload = {
      ...this.payload,
      ...data
    };
    return this;
  }

  addCustomData(data = {}) {
    const currentData = this.payload.data && typeof this.payload.data === 'object' ? this.payload.data : {};

    this.payload.data = {
      ...currentData,
      ...data
    };

    return this;
  }

  addDataToInvoice(name, value) {
    this.extraData[name] = value;
    return this;
  }

  amount(amount) {
    this.amountValue = Math.max(Math.round(Number(amount || 0)), 0);
    return this;
  }

  setSuccessful() {
    this.successful = true;
    return this;
  }

  setStatus(status) {
    this.invoice.status = status;
    this.status = status;
    return this;
  }

  getPayable() {
    return this.payable;
  }

  getAmount() {
    return Math.max(this.amountValue, 0);
  }

  getInvoice() {
    return this.invoice;
  }

  getStatus() {
    return this.status;
  }

  getPaymentLink() {
    return this.paymentLink;
  }

  setPaymentLink(paymentLink) {
    this.paymentLink = paymentLink;
    return this;
  }

  async save(options = {}) {
    this.invoice.set({
      ...this.extraData,
      ...this.payload
    });
    await this.invoice.save(options);
    return this.invoice;
  }

  async success(cb = null) {
    await sequelize.transaction(async (transaction) => {
      this.addDataToInvoice('paidAt', new Date())
        .setStatus(PaymentStatus.PAID)
        .setSuccessful();

      await this.save({ transaction });

      if (cb) {
        await cb(this.getInvoice(), transaction);
      }
    });
  }

  getAll() {
    return {
      status: this.status,
      paymentLink: this.paymentLink
    };
  }
}