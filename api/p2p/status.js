export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { orderId } = req.body;

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

    return res.status(200).json({
      status: data.status,
      amount: data.amount,
      currency: data.currency,
      rrn: data.rrn,
      fromCard: data.fromCard,
      toCard: data.toCard
    });

  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
