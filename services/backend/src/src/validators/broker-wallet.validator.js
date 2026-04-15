import { body } from 'express-validator';
import { toEnglishDigits } from '../utils/digits.js';

export const BROKER_WALLET_CHARGE_AMOUNTS = [500000, 1000000, 5000000, 10000000];

export const BROKER_WALLET_WITHDRAWAL_MIN = 100000;

export const createBrokerWalletChargeValidator = [
  body('amount')
    .customSanitizer((value) => toEnglishDigits(value))
    .notEmpty()
    .withMessage('مبلغ شارژ الزامی است')
    .bail()
    .isInt({ gt: 0 })
    .withMessage('مبلغ شارژ نامعتبر است')
    .bail()
    .custom((value) => BROKER_WALLET_CHARGE_AMOUNTS.includes(Number(value)))
    .withMessage('فقط مبالغ از پیش تعریف شده قابل پرداخت هستند')
];

export const verifyBrokerWalletChargeValidator = [
  body('Authority')
    .customSanitizer((value) => toEnglishDigits(value))
    .notEmpty()
    .withMessage('شناسه پرداخت الزامی است')
    .bail()
    .isLength({ max: 255 })
    .withMessage('شناسه پرداخت نامعتبر است'),
  body('Status')
    .optional({ values: 'falsy' })
    .isString()
    .withMessage('وضعیت بازگشت پرداخت نامعتبر است')
    .isLength({ max: 50 })
    .withMessage('وضعیت بازگشت پرداخت نامعتبر است')
];

export const createBrokerWithdrawalValidator = [
  body('amount')
    .customSanitizer((value) => toEnglishDigits(value))
    .notEmpty()
    .withMessage('مبلغ برداشت الزامی است')
    .bail()
    .isInt({ min: BROKER_WALLET_WITHDRAWAL_MIN })
    .withMessage(`مبلغ برداشت حداقل ${BROKER_WALLET_WITHDRAWAL_MIN.toLocaleString()} تومان است`)
];