export default function handler(req, res) {
  const { scenario } = req.body;

  // Имитация задержки сети (как будто реальный запрос в банк)
  // setTimeout(() => { ... }, 1000); // Можно включить для реалистичности

  if (scenario === 'ecom') {
    // Сценарий Ecom
    // Здесь в будущем будет код: await alfaApi.initPayment(...)
    
    // Для теста вернем успех
    return res.status(200).json({ 
      status: 'success', 
      message: 'Ecom запрос принят',
      paymentUrl: 'https://example.com/pay' // Заглушка ссылки
    });

  } else if (scenario === 'p2p') {
    // Сценарий P2P
    // Здесь в будущем будет код: await alfaApi.sendP2P(...)

    // Для теста вернем успех
    return res.status(200).json({ 
      status: 'success', 
      message: 'P2P запрос принят' 
    });

  } else {
    // Неизвестный сценарий
    return res.status(400).json({ 
      error: 'invalid_scenario', 
      message: 'Выбран неизвестный тип операции' 
    });
  }
}
