export const PaymentStatus = Object.freeze({
  PENDING: 'pending',
  ERROR: 'error',
  PAID: 'paid'
});

export const paymentStatusLabel = (status) => {
  const labels = {
    [PaymentStatus.PENDING]: 'در انتظار پرداخت',
    [PaymentStatus.ERROR]: 'ناموفق',
    [PaymentStatus.PAID]: 'پرداخت شده'
  };

  return labels[status] || status;
};