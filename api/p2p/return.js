export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { orderId, errorCode } = req.query;

  console.log('=== P2P RETURN HANDLER ===');
  console.log('orderId:', orderId);
  console.log('errorCode:', errorCode);

  // Если есть ошибка в параметрах
  if (errorCode && errorCode !== '0') {
    return res.redirect(302, `/p2p/status.html?orderId=${orderId}&error=${errorCode}`);
  }

  if (!orderId) {
    return res.status(400).json({ error: 'orderId not provided' });
  }

  try {
    // Запрашиваем статус заказа
    const statusParams = new URLSearchParams();
    statusParams.append('userName', process.env.ALFA_USERNAME || 'ABB_3-api');
    statusParams.append('password', process.env.ALFA_PASSWORD || 'ABB_3*?1');
    statusParams.append('orderId', orderId);

    const statusResponse = await fetch('https://abby.rbsuat.com/payment/rest/getP2PStatus.do', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: statusParams.toString()
    });

    const statusData = await statusResponse.json();
    console.log('P2P Status:', statusData);

    // Перенаправляем на страницу статуса с orderId
    // Страница сама запросит детали
    res.redirect(302, `/p2p/status.html?orderId=${orderId}`);

  } catch (error) {
    console.error('Return handler error:', error);
    res.redirect(302, `/p2p/status.html?orderId=${orderId}&error=1`);
  }
}
