function toMinorUnits(amount) {
  return Math.round(parseFloat(amount) * 100).toString();
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { orderId, amount } = req.body;

  console.log('=== REFUND ORDER ===');
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
    console.log('Sending reverse request to Alfa Bank...');
    
    const reverseResponse = await fetch('https://abby.rbsuat.com/payment/rest/reverse.do', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: params.toString()
    });

    console.log('Reverse HTTP status:', reverseResponse.status);
    
    const reverseData = await reverseResponse.json();
    console.log('Reverse response:', reverseData);

    if (reverseData.errorCode && reverseData.errorCode !== '0' && reverseData.errorCode !== 0) {
      throw new Error(reverseData.errorMessage || 'Ошибка от Альфа-Банка');
    }

    console.log('Reverse successful!');

    // Запрашиваем статус после отмены
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
    console.log('Status after refund:', statusData);

    return res.status(200).json({
      status: 'success',
      message: 'Отмена успешно выполнена',
      refundedAmount: amount,
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
      error: 'refund_failed',
      message: 'Не удалось отменить сумму: ' + error.message
    });
  }
}
