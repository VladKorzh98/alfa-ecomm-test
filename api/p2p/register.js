export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { amount, currency, orderNumber, clientId } = req.body;

  console.log('=== P2P REGISTER ===');
  console.log('amount:', amount);
  console.log('currency:', currency);
  console.log('orderNumber:', orderNumber);
  console.log('clientId:', clientId);

  const amountMinor = Math.round(parseFloat(amount) * 100);
  
  // Используем относительный путь для returnUrl
  const baseUrl = process.env.BASE_URL || '';
  const returnUrl = baseUrl + '/api/p2p/return';

  const requestBody = {
    username: process.env.ALFA_USERNAME || 'ABB_3-api',
    password: process.env.ALFA_PASSWORD || 'ABB_3*?1',
    amount: amountMinor,
    currency: currency || '933',
    orderNumber: orderNumber,
    returnUrl: returnUrl,
    clientId: clientId,
    features: {
      feature: ['FORCE_SSL']
    }
  };

  try {
    const response = await fetch('https://abby.rbsuat.com/payment/rest/api/p2p/registerP2P.do', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody)
    });

    const data = await response.json();
    console.log('P2P Register response:', data);

    if (data.errorCode !== 0 || data.error) {
      throw new Error(data.errorMessage || 'Ошибка регистрации');
    }

    return res.status(200).json({
      orderId: data.orderId,
      orderNumber: data.orderNumber,
      formUrl: data.formUrl
    });

  } catch (error) {
    console.error('P2P Register error:', error);
    return res.status(500).json({ error: error.message });
  }
}
