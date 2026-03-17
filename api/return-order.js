export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { orderId, amount } = req.body;

  console.log('=== RETURN ORDER (REFUND) ===');
  console.log('orderId:', orderId);
  console.log('amount:', amount);

  if (!orderId || !amount) {
    return res.status(400).json({
      error: 'missing_parameters',
      message: 'Не указаны orderId или amount'
    });
  }

  // Конвертируем сумму в минорные единицы (копейки/центы)
  const amountMinor = Math.round(parseFloat(amount) * 100).toString();

  const params = new URLSearchParams();
  params.append('userName', process.env.ALFA_USERNAME || 'ABB_3-api');
  params.append('password', process.env.ALFA_PASSWORD || 'ABB_3*?1');
  params.append('amount', amountMinor);
  params.append('orderId', orderId);

  try {
    const response = await fetch('https://abby.rbsuat.com/payment/rest/refund.do', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: params.toString()
    });

    console.log('Bank HTTP status:', response.status);
    
    const data = await response.json();
    console.log('Refund response:', data);

    if (data.errorCode && data.errorCode !== '0' && data.errorCode !== 0) {
      throw new Error(data.errorMessage || 'Ошибка от Альфа-Банка');
    }

    return res.status(200).json({
      status: 'success',
      message: 'Возврат выполнен успешно',
      refundedAmount: amount,
      orderId: orderId
    });

  } catch (error) {
    console.error('=== CATCH ERROR ===');
    console.error(error);
    
    return res.status(500).json({
      error: 'return_failed',
      message: 'Не удалось выполнить возврат: ' + error.message
    });
  }
}
