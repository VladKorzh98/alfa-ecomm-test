export default function handler(req, res) {
  const { operation, registrationType, stageType, amount, currency } = req.body;

  console.log('API Request:', { operation, registrationType, stageType, amount, currency });

  if (operation === 'ecom') {
    // Валидация суммы
    if (amount && !/^\d+(\.\d{1,2})?$/.test(amount)) {
      return res.status(400).json({
        error: 'invalid_amount',
        message: 'Некорректная сумма. Используйте формат с двумя знаками после запятой'
      });
    }

    // Валидация валюты
    const validCurrencies = ['BYN', 'USD', 'EUR', 'RUB'];
    if (currency && !validCurrencies.includes(currency)) {
      return res.status(400).json({
        error: 'invalid_currency',
        message: 'Недопустимая валюта'
      });
    }

    // Имитация ответа от Альфа-Банка для ECOM
    return res.status(200).json({
      status: 'success',
      message: 'Заказ зарегистрирован',
      orderId: 'ORD-' + Date.now(),
      amount: amount || '1.00',
      currency: currency || 'BYN',
      registrationType: registrationType,
      stageType: stageType,
      paymentUrl: 'https://example.com/payment' // Заглушка для теста
    });
  }

  return res.status(400).json({
    error: 'unknown_operation',
    message: 'Неизвестная операция'
  });
}
