export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { clientId } = req.body;

  console.log('=== GET BINDINGS ===');
  console.log('clientId:', clientId);

  if (!clientId) {
    return res.status(400).json({
      error: 'missing_client_id',
      message: 'Не указан clientId'
    });
  }

  const params = new URLSearchParams();
  params.append('userName', process.env.ALFA_USERNAME || 'ABB_3-api');
  params.append('password', process.env.ALFA_PASSWORD || 'ABB_3*?1');
  params.append('clientId', clientId);

  try {
    const response = await fetch('https://abby.rbsuat.com/payment/rest/getBindings.do', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: params.toString()
    });

    console.log('Bank HTTP status:', response.status);
    
    const data = await response.json();
    console.log('Bindings response:', data);

    if (data.errorCode && data.errorCode !== '0' && data.errorCode !== 0) {
      throw new Error(data.errorMessage || 'Ошибка от Альфа-Банка');
    }

    return res.status(200).json({
      status: 'success',
      bindings: data.bindings || []
    });

  } catch (error) {
    console.error('=== CATCH ERROR ===');
    console.error(error);
    
    return res.status(500).json({
      error: 'get_bindings_failed',
      message: 'Не удалось получить список привязок: ' + error.message
    });
  }
}
