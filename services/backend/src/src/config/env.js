import dotenv from 'dotenv';

dotenv.config();

export const env = {
  mode: process.env.BACKEND_MODE || 'dev',
  port: Number(process.env.BACKEND_PORT || 3000),
  backendBaseUrl: process.env.BACKEND_BASE_URL || process.env.BACKEND_URL || 'http://localhost:3000',
  brokerBaseUrl: process.env.BROKER_URL || 'http://localhost:3012',
  webBaseUrl: process.env.WEB_URL || process.env.WEB_BASE_URL || 'http://localhost:3010',
  dbHost: process.env.DB_HOST || 'db',
  dbPort: Number(process.env.DB_PORT || 3306),
  dbName: process.env.DB_DATABASE || 'dgvam',
  dbUser: process.env.DB_USERNAME || 'root',
  dbPassword: process.env.DB_PASSWORD || 'secret',
  jwtSecret: process.env.JWT_SECRET || 'change-me',
  adminSeedPhone: process.env.ADMIN_SEED_PHONE || '09120000000',
  adminSeedPassword: process.env.ADMIN_SEED_PASSWORD || '123456',
  smsApiKey: process.env.SMSIR_API_KEY || '',
  smsLineNumber: process.env.SMSIR_LINE_NUMBER || '',
  smsBaseUrl: process.env.SMSIR_BASE_URL || 'https://api.sms.ir/v1/send',
  smsOtpTemplateId: process.env.SMSIR_OTP_TEMPLATE_ID || '',
  smsBrokerOtpTemplateId: process.env.SMSIR_BROKER_OTP_TEMPLATE_ID || '',
  smsCustomerOtpTemplateId: process.env.SMSIR_CUSTOMER_OTP_TEMPLATE_ID || '',
  smsOtpParameterName: process.env.SMSIR_OTP_PARAMETER_NAME || 'Code',
  zbalApiToken: process.env.ZBAL_API_TOKEN || '',
  zbalBaseUrl: process.env.ZBAL_BASE_URL || '',
  zarinpalMerchantId: process.env.ZARINPAL_MERCHANT_ID || '',
  zarinpalSandbox: String(process.env.ZARINPAL_SANDBOX || '1') === '1',
  zarinpalApiBaseUrl:
    process.env.ZARINPAL_API_BASE_URL ||
    (String(process.env.ZARINPAL_SANDBOX || '1') === '1'
      ? 'https://sandbox.zarinpal.com/pg/v4/payment'
      : 'https://payment.zarinpal.com/pg/v4/payment'),
  zarinpalGatewayBaseUrl:
    process.env.ZARINPAL_GATEWAY_BASE_URL ||
    (String(process.env.ZARINPAL_SANDBOX || '1') === '1'
      ? 'https://sandbox.zarinpal.com/pg/StartPay/'
      : 'https://payment.zarinpal.com/pg/StartPay/')
};
