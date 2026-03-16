// Карта валют: код валюты -> цифровой код (ISO 4217)
const CURRENCY_CODES = {
  'BYN': '933',
  'USD': '840', 
  'EUR': '978',
  'RUB': '643'
};

// Генерация уникального orderNumber (макс 12 символов, буквы+цифры)
function generateOrderNumber() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = 'ORD';
  for (let i = 0; i < 9; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result; // Пример: ORDA7K9M2X1
}

// Конвертация суммы в минорные единицы (10.21 -> 1021)
function toMinorUnits(amount) {
  return Math.round(parseFloat(amount) * 100).toString();
}

export default async function handler(req, res) {
  // Разрешаем только POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { operation, registrationType, stageType, amount, currency } = req.body;

  console.log('API Request:', { operation, registrationType, stageType, amount, currency });

  if (operation === 'ecom') {
    
    // === Валидация входных данных ===
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

    // === Подготовка параметров для Альфа-Банка ===
    const orderNumber = generateOrderNumber();
    const amountMinor = toMinorUnits(amount);
    const currencyCode = CURRENCY_CODES[currency];
    
    // Получаем домен сайта для returnUrl (из заголовка или env)
    const host = req.headers.host || process.env.VERCEL_URL || 'localhost';
    const protocol = process.env.VERCEL_ENV === 'production' ? 'https' : 'http';
    const returnUrl = `${protocol}://${host}/`;

    // Формируем тело запроса (x-www-form-urlencoded)
    const params = new URLSearchParams();
    params.append('userName', process.env.ALFA_USERNAME || 'ABB_3-api');
    params.append('password', process.env.ALFA_PASSWORD || 'ABB_3*?1');
    params.append('amount', amountMinor);
    params.append('currency', currencyCode);
    params.append('orderNumber', orderNumber);
    params.append('returnUrl', returnUrl);
    
    // Дополнительные параметры для одностадийного платежа
    if (stageType === 'one-stage') {
      params.append('orderBinding', 'false'); // Без привязки
    }
    if (registrationType === 'with-binding') {
      params.append('orderBinding', 'true');
      params.append('clientId', 'client_' + Date.now()); // ID клиента для привязки
    }

    console.log('Sending to Alfa Bank:', { orderNumber, amountMinor, currencyCode, returnUrl });

    try {
      // === Отправка запроса в Альфа-Банк ===
      const bankResponse = await fetch('https://abby.rbsuat.com/payment/rest/register.do', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: params.toString()
      });

      const bankData = await bankResponse.json();
      console.log('Alfa Bank response:', bankData);

      // Обработка ошибок от банка
      if (!bankResponse.ok || bankData.errorCode) {
        throw new Error(bankData.errorMessage || 'Ошибка от Альфа-Банка');
      }

      // === Успешный ответ ===
      return res.status(200).json({
        status: 'success',
        message: 'Заказ зарегистрирован',
        orderId: orderNumber,
        amount: amount,
        currency: currency,
        formUrl: bankData.formUrl, // Ссылка на платежную страницу
        // Для отладки (в продакшене можно убрать):
        _debug: { amountMinor, currencyCode, returnUrl }
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
