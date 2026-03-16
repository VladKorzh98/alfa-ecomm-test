// Карта валют: цифровой код -> буквенный
const CURRENCY_NAMES = {
  '933': 'BYN',
  '840': 'USD',
  '978': 'EUR',
  '643': 'RUB'
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { orderId } = req.body;

  if (!orderId) {
    return res.status(400).json({
      error: 'missing_order_id',
      message: 'Не указан orderId'
    });
  }

  console.log('Checking status for orderId:', orderId);

  // Формируем параметры запроса
  const params = new URLSearchParams();
  params.append('userName', process.env.ALFA_USERNAME || 'ABB_3-api');
  params.append('password', process.env.ALFA_PASSWORD || 'ABB_3*?1');
  params.append('orderId', orderId);

  try {
    // Отправляем запрос в Альфа-Банк
    const bankResponse = await fetch('https://abby.rbsuat.com/payment/rest/getOrderStatusExtended.do', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: params.toString()
    });

    const bankData = await bankResponse.json();
    console.log('Alfa Bank status response:', bankData);

    if (!bankResponse.ok || bankData.errorCode) {
      throw new Error(bankData.errorMessage || 'Ошибка от Альфа-Банка');
    }

    // Формируем ответ с нужными полями
    return res.status(200).json({
      orderStatus: bankData.orderStatus,
      orderNumber: bankData.orderNumber,
      amount: bankData.amount,
      currency: bankData.currency,
      currencyName: CURRENCY_NAMES[bankData.currency] || bankData.currency,
      authCode: bankData.authCode || null,
      cardAuthInfo: {
        cardholderName: bankData.cardAuthInfo?.cardholderName || null,
        panLast: bankData.cardAuthInfo?.panLast || null,
        expiration: bankData.cardAuthInfo?.expiration || null
      },
      // Дополнительные поля
      orderDescription: bankData.orderDescription || null,
      ipAddress: bankData.ipAddress || null,
      date: bankData.date || null
    });

  } catch (error) {
    console.error('Status check error:', error);
    return res.status(500).json({
      error: 'status_check_failed',
      message: 'Не удалось получить статус заказа: ' + error.message
    });
  }
}
