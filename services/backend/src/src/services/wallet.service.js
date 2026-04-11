import crypto from 'node:crypto';
import { Op } from 'sequelize';
import { sequelize } from '../config/database.js';
import { Transaction } from '../models/transaction.model.js';
import { Wallet } from '../models/wallet.model.js';

export const holderKey = (holderType, holderId) => `${holderType}:${Number(holderId)}`;

export const normalizeMoneyAmount = (value) => {
  const parsed = Number(value || 0);

  if (!Number.isFinite(parsed)) {
    return 0;
  }

  return Math.max(Math.round(parsed), 0);
};

export const serializeWallet = (wallet) => ({
  id: wallet?.id || null,
  name: wallet?.name || Wallet.DEFAULT_NAME,
  slug: wallet?.slug || Wallet.DEFAULT_SLUG,
  balance: String(wallet?.balance || 0),
  decimalPlaces: Number(wallet?.decimalPlaces || 2),
  unit: Wallet.CURRENCY_LABEL,
  uuid: wallet?.uuid || null
});

export const ensureWallet = async ({ holderType, holderId, name, description = null, meta = null }) => {
  const [wallet] = await Wallet.findOrCreate({
    where: {
      holderType,
      holderId: Number(holderId),
      slug: Wallet.DEFAULT_SLUG
    },
    defaults: {
      holderType,
      holderId: Number(holderId),
      name: name || Wallet.DEFAULT_NAME,
      slug: Wallet.DEFAULT_SLUG,
      uuid: crypto.randomUUID(),
      description,
      meta,
      balance: 0,
      decimalPlaces: 2
    }
  });

  return wallet;
};

export const ensureWalletsForHolders = async (holders = []) => {
  const uniqueHolders = [...new Map(
    holders
      .filter((item) => item?.holderType && Number(item?.holderId))
      .map((item) => [holderKey(item.holderType, item.holderId), item])
  ).values()];

  const wallets = new Map();

  if (!uniqueHolders.length) {
    return wallets;
  }

  const existing = await Wallet.findAll({
    where: {
      [Op.or]: uniqueHolders.map((item) => ({
        holderType: item.holderType,
        holderId: Number(item.holderId),
        slug: Wallet.DEFAULT_SLUG
      }))
    }
  });

  existing.forEach((wallet) => {
    wallets.set(holderKey(wallet.holderType, wallet.holderId), wallet);
  });

  const missing = uniqueHolders.filter((item) => !wallets.has(holderKey(item.holderType, item.holderId)));

  if (missing.length) {
    const created = await Promise.all(missing.map((item) => ensureWallet(item)));
    created.forEach((wallet) => {
      wallets.set(holderKey(wallet.holderType, wallet.holderId), wallet);
    });
  }

  return wallets;
};

const applyWalletCredit = async ({ walletId, amount, payableType, payableId, meta = null, transaction }) => {
  const normalizedAmount = normalizeMoneyAmount(amount);

  const wallet = await Wallet.findByPk(walletId, {
    transaction,
    lock: transaction?.LOCK?.UPDATE
  });

  if (!wallet) {
    throw new Error('کیف پول یافت نشد');
  }

  const existing = await Transaction.findOne({
    where: {
      walletId,
      payableType,
      payableId,
      type: Transaction.TYPES.DEPOSIT
    },
    transaction,
    lock: transaction?.LOCK?.UPDATE
  });

  if (existing) {
    await wallet.reload({ transaction });
    return {
      wallet,
      transaction: existing,
      created: false
    };
  }

  await wallet.increment('balance', {
    by: normalizedAmount,
    transaction
  });

  const createdTransaction = await Transaction.create(
    {
      payableType,
      payableId,
      walletId,
      type: Transaction.TYPES.DEPOSIT,
      amount: normalizedAmount,
      confirmed: true,
      meta,
      uuid: crypto.randomUUID()
    },
    { transaction }
  );

  await wallet.reload({ transaction });

  return {
    wallet,
    transaction: createdTransaction,
    created: true
  };
};

export const creditWallet = async ({ walletId, amount, payableType, payableId, meta = null, transaction = null }) => {
  if (transaction) {
    return applyWalletCredit({ walletId, amount, payableType, payableId, meta, transaction });
  }

  return sequelize.transaction((managedTransaction) =>
    applyWalletCredit({
      walletId,
      amount,
      payableType,
      payableId,
      meta,
      transaction: managedTransaction
    })
  );
};