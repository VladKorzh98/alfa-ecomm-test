export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { orderId } = req.body;

  console.log('=== CANCEL ORDER ===');
  console.log('orderId:', orderId);

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
    const bankResponse = await fetch('https://abby.rbsuat.com/payment/rest/reverse.do', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: params.toString()
    });

    console.log('Bank HTTP status:', bankResponse.status);
    
    const bankData = await bankResponse.json();
    console.log('Reverse response:', bankData);

    if (!bankResponse.ok || bankData.errorCode) {
      throw new Error(bankData.errorMessage || 'Ошибка от Альфа-Банка');
    }

    return res.status(200).json({
      status: 'success',
      message: 'Заказ успешно отменён',
      ...bankData
    });

  } catch (error) {
    console.error('=== CATCH ERROR ===');
    console.error(error);
    
    return res.status(500).json({
      error: 'cancel_failed',
      message: 'Не удалось отменить заказ: ' + error.message
    });
  }
}
