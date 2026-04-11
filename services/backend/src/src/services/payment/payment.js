export class Payment {
  constructor(driver) {
    this.driver = driver;
  }

  static make(driver) {
    return new Payment(driver);
  }

  amount(amount) {
    if (typeof amount === 'function') {
      amount(this);
    } else {
      this.driver = this.driver.amount(amount);
    }

    return this;
  }

  syncData(data = {}, customData = {}) {
    this.driver = this.driver.fill(data).addCustomData(customData);
    return this;
  }

  execute(data = {}, callback = null) {
    return this.driver.execute(data, callback);
  }

  makeInvoice(invoice, context = {}) {
    return this.driver.make(invoice, context);
  }

  getInvoice(invoice) {
    return this.driver.get(invoice);
  }

  verify(data = {}) {
    return this.driver.verify(data);
  }
}