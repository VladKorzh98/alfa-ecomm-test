export default function handler(req, res) {
  const { scenario } = req.body;

  console.log('API called with scenario:', scenario);

  if (scenario === 'ecom') {
    return res.status(200).json({ 
      status: 'success', 
      message: 'Ecom запрос принят',
      paymentUrl: 'https://example.com/pay'
    });
  } else if (scenario === 'p2p') {
    return res.status(200).json({ 
      status: 'success', 
      message: 'P2P запрос принят' 
    });
  } else {
    return res.status(400).json({ 
      error: 'invalid_scenario', 
      message: 'Неизвестный тип операции: ' + scenario 
    });
  }
}
