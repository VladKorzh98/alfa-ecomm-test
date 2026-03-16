// Карта валют: код валюты -> цифровой код (ISO 4217)
const CURRENCY_CODES = {
  'BYN': '933',
  'USD': '840', 
  'EUR': '978',
  'RUB': '643'
};

// Генерация уникального orderNumber (макс 12 символов)
function generateOrderNumber() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = 'ORD';
  for (let i = 0; i < 9; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// Конвертация суммы в минорные единицы
function toMinorUnits(amount) {
  return Math.round(parseFloat(amount) * 100).toString();
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { operation, registrationType, stageType, amount, currency } = req.body;

  console.log('API Request:', { operation, registrationType, stageType, amount, currency });

  if (operation === 'ecom') {
    
    // Валидация
    if (!amount || !/^\d+(\.\d{1,2})?$/.test(amount)) {
      return res.status(400).json({
        error: 'invalid_amount',
        message: 'Некорректная сумма. Используйте формат: 0.00'
      });
    }

    if (!currency || !CURRENCY_CODES[currency]) {
      return res.status(400).json({
        error: 'invalid_currency',
        message: 'Недопустимая валюта'
      });
    }

    // Подготовка параметров
    const orderNumber = generateOrderNumber();
    const amountMinor = toMinorUnits(amount);
    const currencyCode = CURRENCY_CODES[currency];
    
    const host = req.headers.host || process.env.VERCEL_URL || 'localhost';
    const protocol = process.env.VERCEL_ENV === 'production' ? 'https' : 'http';
    const returnUrl = `${protocol}://${host}/`;

    const params = new URLSearchParams();
    params.append('userName', process.env.ALFA_USERNAME || 'ABB_3-api');
    params.append('password', process.env.ALFA_PASSWORD || 'ABB_3*?1');
    params.append('amount', amountMinor);
    params.append('currency', currencyCode);
    params.append('orderNumber', orderNumber);
    params.append('returnUrl', returnUrl);
    
    if (stageType === 'one-stage') {
      params.append('orderBinding', 'false');
    }
    if (registrationType === 'with-binding') {
      params.append('orderBinding', 'true');
      params.append('clientId', 'client_' + Date.now());
    }

    console.log('Sending to Alfa Bank:', { orderNumber, amountMinor, currencyCode });

    try {
      const bankResponse = await fetch('https://abby.rbsuat.com/payment/rest/register.do', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: params.toString()
      });

      const bankData = await bankResponse.json();
      console.log('Alfa Bank response:', bankData);

      if (!bankResponse.ok || bankData.errorCode) {
        throw new Error(bankData.errorMessage || 'Ошибка от Альфа-Банка');
      }

      return res.status(200).json({
        status: 'success',
        message: 'Заказ зарегистрирован',
        orderId: orderNumber,
        amount: amount,
        currency: currency,
        formUrl: bankData.formUrl
      });

    } catch (error) {
      console.error('Alfa Bank API error:', error);
      return res.status(500).json({
        error: 'bank_connection_error',
        message: 'Не удалось связаться с Альфа-Банком: ' + error.message
      });
    }
  }

  return res.status(400).json({
    error: 'unknown_operation',
    message: 'Неизвестная операция'
  });
}
