export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { orderId, fromBindingId, toBindingId } = req.body;

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

    if (data.errorCode !== 0 || data.error) {
      throw new Error(data.errorMessage || 'Ошибка выполнения');
    }

    return res.status(200).json({
      redirect: data.redirect,
      is3DSVer2: data.is3DSVer2
    });

  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
