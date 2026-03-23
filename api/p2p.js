export default async function handler(req, res) {
  const { action } = req.query;

  // GET запросы (return handler)
  if (req.method === 'GET') {
    return handleP2PReturn(req, res);
  }

  // POST запросы
  if (req.method === 'POST') {
    const { action } = req.body;
    
    switch (action) {
      case 'get-bindings':
        return handleGetBindings(req, res);
      case 'register':
        return handleRegister(req, res);
      case 'perform':
        return handlePerform(req, res);
      case 'status':
        return handleStatus(req, res);
      default:
        return res.status(400).json({ error: 'Invalid action' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

// ===== GET: Return Handler =====
async function handleP2PReturn(req, res) {
  const { orderId, errorCode } = req.query;

  console.log('=== P2P RETURN HANDLER ===');
  console.log('orderId:', orderId);
  console.log('errorCode:', errorCode);

  if (errorCode && errorCode !== '0') {
    return res.redirect(302, `/p2p/status.html?orderId=${orderId}&error=${errorCode}`);
  }

  if (!orderId) {
    return res.status(400).json({ error: 'orderId not provided' });
  }

  try {
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

    res.redirect(302, `/p2p/status.html?orderId=${orderId}`);

  } catch (error) {
    console.error('Return handler error:', error);
    res.redirect(302, `/p2p/status.html?orderId=${orderId}&error=1`);
  }
}

// ===== POST: Get Bindings =====
async function handleGetBindings(req, res) {
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
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString()
    });

    const data = await response.json();
    console.log('Bank response:', data);

    if (data.errorCode && data.errorCode !== '0' && data.errorCode !== 0) {
      throw new Error(data.errorMessage || 'Ошибка от банка');
    }

    const bindings = data.bindings || [];
    console.log('✅ Found bindings:', bindings.length);

    return res.status(200).json({ 
      bindings: bindings,
      count: bindings.length
    });

  } catch (error) {
    console.error('=== GET BINDINGS ERROR ===');
    console.error(error);
    
    return res.status(500).json({ error: error.message });
  }
}

// ===== POST: Register P2P =====
async function handleRegister(req, res) {
  const { amount, currency, orderNumber, clientId } = req.body;

  console.log('=== P2P REGISTER ===');
  console.log('amount:', amount);
  console.log('currency:', currency);
  console.log('orderNumber:', orderNumber);
  console.log('clientId:', clientId);

  const amountMinor = Math.round(parseFloat(amount) * 100);
  const baseUrl = process.env.BASE_URL || '';
  const returnUrl = baseUrl + '/api/p2p?action=return';

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

// ===== POST: Perform P2P =====
async function handlePerform(req, res) {
  const { orderId, fromBindingId, toBindingId } = req.body;

  console.log('=== P2P PERFORM ===');
  console.log('orderId:', orderId);
  console.log('fromBindingId:', fromBindingId);
  console.log('toBindingId:', toBindingId);

  const requestBody = {
    username: process.env.ALFA_USERNAME || 'ABB_3-api',
    password: process.env.ALFA_PASSWORD || 'ABB_3*?1',
    orderId: orderId,
    fromCard: {
      bindingId: fromBindingId
    },
    toCard: {
      bindingId: toBindingId
    }
  };

  try {
    const response = await fetch('https://abby.rbsuat.com/payment/rest/api/p2p/performP2PByBinding.do', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody)
    });

    const data = await response.json();
    console.log('P2P Perform response:', data);

    if (data.errorCode !== 0 || data.error) {
      throw new Error(data.errorMessage || 'Ошибка выполнения');
    }

    return res.status(200).json({
      redirect: data.redirect,
      is3DSVer2: data.is3DSVer2
    });

  } catch (error) {
    console.error('P2P Perform error:', error);
    return res.status(500).json({ error: error.message });
  }
}

// ===== POST: Get P2P Status =====
async function handleStatus(req, res) {
  const { orderId } = req.body;

  console.log('=== GET P2P STATUS ===');
  console.log('orderId:', orderId);

  const params = new URLSearchParams();
  params.append('userName', process.env.ALFA_USERNAME || 'ABB_3-api');
  params.append('password', process.env.ALFA_PASSWORD || 'ABB_3*?1');
  params.append('orderId', orderId);

  try {
    const response = await fetch('https://abby.rbsuat.com/payment/rest/getP2PStatus.do', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString()
    });

    const data = await response.json();
    console.log('P2P Status response:', data);

    return res.status(200).json({
      status: data.status,
      amount: data.amount,
      currency: data.currency,
      rrn: data.rrn,
      fromCard: data.fromCard,
      toCard: data.toCard
    });

  } catch (error) {
    console.error('P2P Status error:', error);
    return res.status(500).json({ error: error.message });
  }
}
