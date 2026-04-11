import { env } from '../config/env.js';

const hasSmsConfig = () => Boolean(env.smsApiKey);

const parseResponse = async (response) => {
  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(payload?.message || payload?.Message || payload?.error || 'ارسال پیامک با خطا مواجه شد');
  }

  return payload;
};

export const sendSms = async ({ phones = [], message }) => {
  const normalizedPhones = [...new Set((Array.isArray(phones) ? phones : [phones]).map((item) => String(item || '').trim()).filter(Boolean))];
  const normalizedMessage = String(message || '').trim();

  if (!normalizedPhones.length || !normalizedMessage) {
    return null;
  }

  if (!hasSmsConfig()) {
    console.log(`پیامک محیط توسعه برای ${normalizedPhones.join(', ')}: ${normalizedMessage}`);
    return null;
  }

  const response = await fetch(`${env.smsBaseUrl}/bulk`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      'X-API-KEY': env.smsApiKey
    },
    body: JSON.stringify({
      lineNumber: env.smsLineNumber,
      MessageText: normalizedMessage,
      Mobiles: normalizedPhones,
      sendDateTime: null
    })
  });

  return parseResponse(response);
};

export const sendOtpSms = async (phone, otp, options = {}) => {
  const normalizedPhone = String(phone || '').trim();
  const code = String(otp || '').trim();
  const templateId = String(options.templateId || env.smsOtpTemplateId || '').trim();
  const parameterName = String(options.parameterName || env.smsOtpParameterName || 'Code').trim() || 'Code';

  if (!normalizedPhone || !code) {
    return null;
  }

  if (!hasSmsConfig()) {
    console.log(`کد تایید محیط توسعه برای ${normalizedPhone}: ${code}`);
    return null;
  }

  if (!templateId) {
    return sendSms({
      phones: [normalizedPhone],
      message: `کد تایید شما: ${code}`
    });
  }

  const response = await fetch(`${env.smsBaseUrl}/verify`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      'X-API-KEY': env.smsApiKey
    },
    body: JSON.stringify({
      TemplateId: Number(templateId),
      Mobile: normalizedPhone,
      Parameters: [
        {
          name: parameterName,
          value: code
        }
      ]
    })
  });

  return parseResponse(response);
};
