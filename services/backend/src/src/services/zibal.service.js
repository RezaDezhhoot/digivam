import { env } from '../config/env.js';

const normalizeBaseUrl = (value) => String(value || '').replace(/\/+$/, '');

const createConfigError = () => {
  const error = new Error('تنظیمات سرویس Zibal کامل نیست');
  error.status = 503;
  return error;
};

export class ZibalService {
  constructor() {
    this.baseUrl = normalizeBaseUrl(env.zbalBaseUrl);
    this.apiToken = String(env.zbalApiToken || '').trim();
  }

  ensureConfigured() {
    if (!this.baseUrl || !this.apiToken) {
      throw createConfigError();
    }
  }

  async request(endpoint, payload) {
    this.ensureConfigured();

    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiToken}`
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok || Number(data?.result) !== 1) {
      return false;
    }

    return Boolean(data?.data?.matched);
  }

  matchingCountryCodeAndMobileNumber(phone, nationalCode) {
    return this.request('/shahkarInquiry', {
      mobile: String(phone || '').trim(),
      nationalCode: String(nationalCode || '').trim()
    });
  }

  matchingBirthdateAndNationalCode(nationalCode, birthDate) {
    return this.request('/nationalIdentityInquiry', {
      nationalCode: String(nationalCode || '').trim(),
      birthDate: String(birthDate || '').replace(/-/g, '/')
    });
  }

  matchingCountryCodeAndShebaNumberAndBirthdate(nationalCode, sheba, birthDate = '1390/07/02') {
    return this.request('/checkIbanWithNationalCode', {
      IBAN: String(sheba || '')
        .replace(/[\s-]+/g, '')
        .trim(),
      nationalCode: String(nationalCode || '').trim(),
      birthDate: String(birthDate || '').replace(/-/g, '/')
    });
  }
}

export const zibalService = new ZibalService();