import { env } from '../../../config/env.js';
import { Driver } from '../driver.js';
import { PaymentDrivers } from '../enums/payment-drivers.js';
import { PaymentStatus } from '../enums/payment-status.js';

const getApiUrl = (path) => `${String(env.zarinpalApiBaseUrl || '').replace(/\/+$/, '')}/${path}`;
const getGatewayUrl = (authority) => `${String(env.zarinpalGatewayBaseUrl || '').replace(/\/+$/, '')}/${authority}`;

const parseGatewayError = (payload) => {
  if (payload?.data?.message) {
    return payload.data.message;
  }

  if (payload?.errors?.message) {
    return payload.errors.message;
  }

  if (Array.isArray(payload?.errors) && payload.errors[0]?.message) {
    return payload.errors[0].message;
  }

  return 'ارتباط با درگاه پرداخت ناموفق بود';
};

export class Zarin extends Driver {
  static DRIVER_NAME = 'App\\Services\\Payment\\Drivers\\Zarin';

  static DRIVER_KEY = PaymentDrivers.ZARINPAL;

  async execute(data = {}, callback = null) {
    try {
      if (!env.zarinpalMerchantId) {
        const error = new Error('شناسه مرچنت زرین پال تنظیم نشده است');
        error.status = 503;
        throw error;
      }

      const payable = this.getPayable() || {};
      const description =
        data.description ||
        payable.description ||
        'شارژ کیف پول کارگزار';

      const response = await fetch(getApiUrl('request.json'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json'
        },
        body: JSON.stringify({
          merchant_id: env.zarinpalMerchantId,
          amount: this.getAmount(),
          callback_url: callback,
          description,
          metadata: {
            mobile: data.mobile || payable.phone || undefined,
            order_id: String(this.invoice?.id || '') || undefined
          }
        })
      });

      const payload = await response.json().catch(() => ({}));
      const responseCode = Number(payload?.data?.code);

      if (!response.ok || responseCode !== 100 || !payload?.data?.authority) {
        const error = new Error(parseGatewayError(payload));
        error.status = 502;
        throw error;
      }

      const authority = String(payload.data.authority);
      const paymentLink = getGatewayUrl(authority);

      this.addDataToInvoice('transactionId', authority)
        .addCustomData({
          gateway: Zarin.DRIVER_KEY,
          callbackUrl: callback,
          paymentLink,
          requestPayload: payload.data
        })
        .setPaymentLink(paymentLink)
        .setSuccessful();

      await this.save();
      return this;
    } catch (error) {
      this.addCustomData({
        executeError: error.message
      }).setStatus(PaymentStatus.ERROR);
      await this.save();
      throw error;
    }
  }

  async verify(data = {}) {
    try {
      const invoice = this.getInvoice();
      const authority = String(data.authority || invoice?.transactionId || '').trim();

      const response = await fetch(getApiUrl('verify.json'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json'
        },
        body: JSON.stringify({
          merchant_id: env.zarinpalMerchantId,
          amount: this.getAmount(),
          authority
        })
      });

      const payload = await response.json().catch(() => ({}));
      const responseCode = Number(payload?.data?.code);

      if (!response.ok || ![100, 101].includes(responseCode) || !payload?.data?.ref_id) {
        const error = new Error(parseGatewayError(payload));
        error.status = 502;
        throw error;
      }

      this.addDataToInvoice('paymentRef', String(payload.data.ref_id))
        .addCustomData({
          verifyPayload: payload.data
        })
        .setSuccessful();

      return this;
    } catch (error) {
      this.addCustomData({
        verifyError: error.message
      }).setStatus(PaymentStatus.ERROR);
      await this.save();
      throw error;
    }
  }
}