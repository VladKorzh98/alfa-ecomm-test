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

  const { orderId, orderNumber } = req.body;

  console.log('=== CHECK STATUS API START ===');
  console.log('orderId:', orderId);
  console.log('orderNumber:', orderNumber);

  if (!orderId) {
    return res.status(400).json({
      error: 'missing_order_id',
      message: 'Не указан orderId'
    });
  }

  const params = new URLSearchParams();
  params.append('userName', process.env.ALFA_USERNAME || 'ABB_3-api');
  params.append('password', process.env.ALFA_PASSWORD || 'ABB_3*?1');
  params.append('orderId', orderId);

  try {
    const bankResponse = await fetch('https://abby.rbsuat.com/payment/rest/getOrderStatusExtended.do', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: params.toString()
    });

    console.log('Bank HTTP status:', bankResponse.status);
    
    const bankData = await bankResponse.json();
    console.log('=== BANK RESPONSE ===');
    console.log(JSON.stringify(bankData, null, 2));
    console.log('====================');

    if (bankData.errorCode && bankData.errorCode !== '0' && bankData.errorCode !== 0) {
      throw new Error(bankData.errorMessage || 'Ошибка от Альфа-Банка');
    }

    console.log('Success!');
    console.log('bankData.orderId:', bankData.orderId);
    console.log('bankData.orderStatus:', bankData.orderStatus);
    console.log('bankData.bindingInfo:', bankData.bindingInfo);
    
    // Извлекаем bindingId из bindingInfo.bindingId
    const bindingId = bankData.bindingInfo?.bindingId || null;
    console.log('Extracted bindingId:', bindingId);

    // Возвращаем данные с bindingId
    return res.status(200).json({
      orderId: bankData.orderId || orderId,
      orderNumber: orderNumber,
      orderStatus: bankData.orderStatus,
      amount: bankData.amount,
      currency: bankData.currency,
      authCode: bankData.authCode || null,
      actionCodeDescription: bankData.actionCodeDescription || null,
      bindingId: bindingId,
      cardAuthInfo: {
        maskedPan: bankData.cardAuthInfo?.maskedPan || null,
        cardholderName: bankData.cardAuthInfo?.cardholderName || null,
        panLast: bankData.cardAuthInfo?.panLast || null,
        expiration: bankData.cardAuthInfo?.expiration || null
      }
    });

  } catch (error) {
    console.error('=== CATCH ERROR ===');
    console.error(error);
    
    return res.status(500).json({
      error: 'status_check_failed',
      message: 'Не удалось получить статус заказа: ' + error.message
    });
  }
}
