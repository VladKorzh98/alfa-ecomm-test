export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { bindingId, mdOrder, tii } = req.body;

  console.log('=== PAYMENT ORDER BINDING ===');
  console.log('bindingId:', bindingId);
  console.log('mdOrder:', mdOrder);
  console.log('tii:', tii);

  if (!bindingId || !mdOrder) {
    return res.status(400).json({
      error: 'missing_parameters',
      message: 'Не указаны обязательные параметры'
    });
  }

  const params = new URLSearchParams();
  params.append('userName', process.env.ALFA_USERNAME || 'ABB_3-api');
  params.append('password', process.env.ALFA_PASSWORD || 'ABB_3*?1');
  params.append('bindingId', bindingId);
  params.append('mdOrder', mdOrder);
  if (tii) {
    params.append('tii', tii);
  }

  try {
    const response = await fetch('https://abby.rbsuat.com/payment/rest/paymentOrderBinding.do', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: params.toString()
    });

    console.log('Bank HTTP status:', response.status);
    
    const data = await response.json();
    console.log('Payment order binding response:', data);

    if (data.errorCode && data.errorCode !== '0' && data.errorCode !== 0) {
      throw new Error(data.errorMessage || 'Ошибка от Альфа-Банка');
    }

    return res.status(200).json({
      status: 'success',
      redirect: data.redirect || null
    });

  } catch (error) {
    console.error('=== CATCH ERROR ===');
    console.error(error);
    
    return res.status(500).json({
      error: 'payment_order_binding_failed',
      message: 'Не удалось выполнить привязку платежа: ' + error.message
    });
  }
}
