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
  params.append('amount', toMinorUnits(amount));  // Конвертируем в минорные единицы

  try {
    const bankResponse = await fetch('https://abby.rbsuat.com/payment/rest/deposit.do', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: params.toString()
    });

    console.log('Bank HTTP status:', bankResponse.status);
    
    const bankData = await bankResponse.json();
    console.log('Deposit response:', bankData);

    if (!bankResponse.ok || bankData.errorCode) {
      throw new Error(bankData.errorMessage || 'Ошибка от Альфа-Банка');
    }

    return res.status(200).json({
      status: 'success',
      message: 'Заказ успешно завершён',
      completedAmount: amount,  // Возвращаем сумму завершения для отображения
      ...bankData
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
