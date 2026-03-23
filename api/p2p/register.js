export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { cardFrom, cardTo, amount, currency } = req.body;

  console.log('=== P2P REGISTER ===');
  console.log('cardFrom:', cardFrom);
  console.log('cardTo:', cardTo);
  console.log('amount:', amount);
  console.log('currency:', currency);

  // Конвертируем сумму в минорные единицы
  const amountMinor = Math.round(parseFloat(amount) * 100).toString();

  const params = new URLSearchParams();
  params.append('userName', process.env.ALFA_USERNAME || 'ABB_3-api');
  params.append('password', process.env.ALFA_PASSWORD || 'ABB_3*?1');
  params.append('amount', amountMinor);
  params.append('currency', currency || 'BYN');
  params.append('cardFrom', cardFrom);
  params.append('cardTo', cardTo);

  try {
    const response = await fetch('https://abby.rbsuat.com/payment/rest/p2p/register.do', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: params.toString()
    });

    const data = await response.json();
    console.log('P2P response:', data);

    if (data.errorCode && data.errorCode !== '0') {
      throw new Error(data.errorMessage || 'Ошибка от банка');
    }

    return res.status(200).json({
      status: 'success',
      orderId: data.orderId,
      formUrl: data.formUrl
    });

  } catch (error) {
    console.error('P2P error:', error);
    return res.status(500).json({
      error: 'p2p_registration_failed',
      message: error.message
    });
  }
}
