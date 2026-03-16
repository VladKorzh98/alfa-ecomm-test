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

  console.log('=== CHECK STATUS API START ===');
  console.log('orderId:', orderId);
  console.log('ALFA_USERNAME:', process.env.ALFA_USERNAME || 'default');

  if (!orderId) {
    console.error('Missing orderId');
    return res.status(400).json({
      error: 'missing_order_id',
      message: 'Не указан orderId'
    });
  }

  const params = new URLSearchParams();
  params.append('userName', process.env.ALFA_USERNAME || 'ABB_3-api');
  params.append('password', process.env.ALFA_PASSWORD || 'ABB_3*?1');
  params.append('orderId', orderId);

  console.log('Sending request to Alfa Bank...');

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
      console.error('Bank error:', bankData.errorMessage);
      throw new Error(bankData.errorMessage || 'Ошибка от Альфа-Банка');
    }

    console.log('Success! orderStatus:', bankData.orderStatus);

    return res.status(200).json({
      orderId: bankData.orderId,           // Уникальный ID заказа
      orderNumber: bankData.orderNumber,   // Номер заказа
      orderStatus: bankData.orderStatus,
      amount: bankData.amount,
      currency: bankData.currency,
      authCode: bankData.authCode || null,
      cardAuthInfo: {
        maskedPan: bankData.cardAuthInfo?.maskedPan || null,  // Маска карты
        cardholderName: bankData.cardAuthInfo?.cardholderName || null,
        panLast: bankData.cardAuthInfo?.panLast || null,
        expiration: bankData.cardAuthInfo?.expiration || null
      },
      orderDescription: bankData.orderDescription || null,
      ipAddress: bankData.ipAddress || null,
      date: bankData.date || null
    });

  } catch (error) {
    console.error('=== CATCH ERROR ===');
    console.error(error);
    console.error('Error message:', error.message);
    console.error('==================');
    
    return res.status(500).json({
      error: 'status_check_failed',
      message: 'Не удалось получить статус заказа: ' + error.message
    });
  }
}
