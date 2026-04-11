export class PaymentDriver {
  execute() {
    throw new Error('execute must be implemented');
  }

  verify() {
    throw new Error('verify must be implemented');
  }

  success() {
    throw new Error('success must be implemented');
  }

  getStatus() {
    throw new Error('getStatus must be implemented');
  }

  getInvoice() {
    throw new Error('getInvoice must be implemented');
  }

  getPaymentLink() {
    throw new Error('getPaymentLink must be implemented');
  }

  getAll() {
    throw new Error('getAll must be implemented');
  }

  isSuccessful() {
    throw new Error('isSuccessful must be implemented');
  }

  amount() {
    throw new Error('amount must be implemented');
  }

  fill() {
    throw new Error('fill must be implemented');
  }

  addCustomData() {
    throw new Error('addCustomData must be implemented');
  }
}