export default function handler(req, res) {
  const { operation, registrationType, stageType } = req.body;

  console.log('API Request:', { operation, registrationType, stageType });

  if (operation === 'ecom') {
    // Имитация ответа от Альфа-Банка для ECOM
    return res.status(200).json({
      status: 'success',
      message: 'Заказ зарегистрирован',
      orderId: 'ORD-' + Date.now(),
      amount: '1.00 BYN',
      registrationType: registrationType,
      stageType: stageType,
      paymentUrl: 'https://example.com/payment' // Заглушка
    });
  }

  return res.status(400).json({
    error: 'unknown_operation',
    message: 'Неизвестная операция'
  });
}
