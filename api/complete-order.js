function toMinorUnits(amount) {
  return Math.round(parseFloat(amount) * 100).toString();
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { orderId, amount } = req.body;

  console.log('=== COMPLETE ORDER ===');
  console.log('orderId:', orderId);
  console.log('amount:', amount);

  if (!orderId) {
    return res.status(400).json({
      error: 'missing_order_id',
      message: 'Не указан orderId'
    });
  }

  if (!amount || !/^\d+(\.\d{1,2})?$/.test(amount)) {
    return res.status(400).json({
      error: 'invalid_amount',
      message: 'Некорректная сумма'
    });
  }

  const params = new URLSearchParams();
  params.append('userName', process.env.ALFA_USERNAME || 'ABB_3-api');
  params.append('password', process.env.ALFA_PASSWORD || 'ABB_3*?1');
  params.append('orderId', orderId);
  params.append('amount', toMinorUnits(amount));

  try {
    // 1. Отправляем запрос на завершение (deposit)
    const depositResponse = await fetch('https://abby.rbsuat.com/payment/rest/deposit.do', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: params.toString()
    });

    console.log('Deposit HTTP status:', depositResponse.status);
    
    const depositData = await depositResponse.json();
    console.log('Deposit response:', depositData);

    // ИСПРАВЛЕННАЯ ПРОВЕРКА: errorCode=0 означает успех
    if (depositData.errorCode && depositData.errorCode !== '0' && depositData.errorCode !== 0) {
      throw new Error(depositData.errorMessage || 'Ошибка от Альфа-Банка');
    }

    console.log('Deposit successful!');

    // 2. Запрашиваем статус заказа после завершения
    const statusParams = new URLSearchParams();
    statusParams.append('userName', process.env.ALFA_USERNAME || 'ABB_3-api');
    statusParams.append('password', process.env.ALFA_PASSWORD || 'ABB_3*?1');
    statusParams.append('orderId', orderId);

    const statusResponse = await fetch('https://abby.rbsuat.com/payment/rest/getOrderStatusExtended.do', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: statusParams.toString()
    });

    console.log('Status HTTP status:', statusResponse.status);
    
    const statusData = await statusResponse.json();
    console.log('Status after complete:', statusData);

    if (statusData.errorCode && statusData.errorCode !== '0' && statusData.errorCode !== 0) {
      console.warn('Warning: Could not get status after complete:', statusData.errorMessage);
    }

    // 3. Возвращаем данные
    return res.status(200).json({
      status: 'success',
      message: 'Заказ успешно завершён',
      completedAmount: amount,
      orderStatus: statusData.orderStatus,
      orderId: statusData.orderId || orderId,
      orderNumber: statusData.orderNumber,
      amount: statusData.amount,
      currency: statusData.currency,
      authCode: statusData.authCode || null,
      cardAuthInfo: {
        maskedPan: statusData.cardAuthInfo?.maskedPan || null,
        cardholderName: statusData.cardAuthInfo?.cardholderName || null,
        panLast: statusData.cardAuthInfo?.panLast || null,
        expiration: statusData.cardAuthInfo?.expiration || null
      }
    });

  } catch (error) {
    console.error('=== CATCH ERROR ===');
    console.error(error);
    
    return res.status(500).json({
      error: 'complete_failed',
      message: 'Не удалось завершить заказ: ' + error.message
    });
  }
}
