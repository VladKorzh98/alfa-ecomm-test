export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { clientId } = req.body;

  console.log('=== GET BINDINGS ===');
  console.log('clientId:', clientId);

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

    console.log('Bank response status:', response.status);
    
    const data = await response.json();
    console.log('Bank response:', data);

    if (data.errorCode && data.errorCode !== '0' && data.errorCode !== 0) {
      throw new Error(data.errorMessage || 'Ошибка от банка');
    }

    // Извлекаем bindings из ответа
    const bindings = data.bindings || [];
    
    console.log('✅ Found bindings:', bindings.length);
    bindings.forEach((binding, idx) => {
      console.log(`  Card ${idx + 1}:`, binding.maskedPan, '- BindingId:', binding.bindingId);
    });

    return res.status(200).json({ 
      bindings: bindings,
      count: bindings.length,
      message: bindings.length > 0 ? 'Карты найдены' : 'Привязанные карты не найдены для clientId ' + clientId
    });

  } catch (error) {
    console.error('=== GET BINDINGS ERROR ===');
    console.error(error);
    
    return res.status(500).json({ 
      error: 'get_bindings_failed',
      message: error.message 
    });
  }
}
