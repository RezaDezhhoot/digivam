import { Broker } from '../models/broker.model.js';
import { Wallet } from '../models/wallet.model.js';
import { creditWallet, debitWallet, ensureWallet, normalizeMoneyAmount, serializeWallet } from '../services/wallet.service.js';

export const adminBrokerWalletDeposit = async (req, res, next) => {
  try {
    const brokerId = Number(req.params.id);
    const broker = await Broker.findByPk(brokerId, { attributes: ['id', 'name', 'phone'] });
    if (!broker) return res.status(404).json({ message: 'کارگزار یافت نشد' });

    const amount = normalizeMoneyAmount(req.body.amount);
    if (!amount || amount <= 0) return res.status(422).json({ message: 'مبلغ واریز نامعتبر است' });

    const description = String(req.body.description || '').trim().slice(0, 500) || null;

    const wallet = await ensureWallet({
      holderType: Wallet.HOLDER_TYPES.BROKER,
      holderId: brokerId,
      name: `کیف پول ${broker.name || 'کارگزار'}`
    });

    const result = await creditWallet({
      walletId: wallet.id,
      amount,
      payableType: 'admin_deposit',
      payableId: Date.now(),
      meta: { adminId: req.auth.sub, description }
    });

    return res.status(200).json({
      message: `مبلغ ${amount.toLocaleString('fa-IR')} تومان به کیف پول کارگزار واریز شد`,
      wallet: serializeWallet(result.wallet)
    });
  } catch (error) {
    return next(error);
  }
};

export const adminBrokerWalletWithdraw = async (req, res, next) => {
  try {
    const brokerId = Number(req.params.id);
    const broker = await Broker.findByPk(brokerId, { attributes: ['id', 'name', 'phone'] });
    if (!broker) return res.status(404).json({ message: 'کارگزار یافت نشد' });

    const amount = normalizeMoneyAmount(req.body.amount);
    if (!amount || amount <= 0) return res.status(422).json({ message: 'مبلغ برداشت نامعتبر است' });

    const description = String(req.body.description || '').trim().slice(0, 500) || null;

    const wallet = await ensureWallet({
      holderType: Wallet.HOLDER_TYPES.BROKER,
      holderId: brokerId,
      name: `کیف پول ${broker.name || 'کارگزار'}`
    });

    const result = await debitWallet({
      walletId: wallet.id,
      amount,
      payableType: 'admin_withdraw',
      payableId: Date.now(),
      meta: { adminId: req.auth.sub, description }
    });

    return res.status(200).json({
      message: `مبلغ ${amount.toLocaleString('fa-IR')} تومان از کیف پول کارگزار برداشت شد`,
      wallet: serializeWallet(result.wallet)
    });
  } catch (error) {
    return next(error);
  }
};
