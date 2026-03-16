export default function handler(req, res) {
  // Здесь будет логика вызова API Альфа-Банка
  
  const { scenario } = req.body;

  if (scenario === 'init') {
    // Пока просто возвращаем тестовый ответ
    res.status(200).json({ 
      status: 'success', 
      message: 'Запрос отправлен в Альфа-Банк (тест)',
      data: { orderId: '12345', amount: '1.00 BYN' }
    });
  } else {
    res.status(400).json({ error: 'Неизвестный сценарий' });
  }
}
