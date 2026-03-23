// P2P операции - отдельная логика

async function registerP2P() {
    var cardFrom = document.getElementById('cardFrom').value.trim();
    var cardTo = document.getElementById('cardTo').value.trim();
    var amount = document.getElementById('amount').value.trim();
    var currency = document.getElementById('currency').value;

    if (!cardFrom || !cardTo || !amount) {
        alert('Заполните все поля');
        return;
    }

    try {
        var response = await fetch('/api/p2p/register', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({
                cardFrom: cardFrom,
                cardTo: cardTo,
                amount: amount,
                currency: currency
            })
        });

        var data = await response.json();

        if (!response.ok || data.error) {
            throw new Error(data.message || 'Ошибка регистрации P2P');
        }

        alert('P2P перевод зарегистрирован!\nOrder ID: ' + data.orderId);
        
    } catch (error) {
        alert('Ошибка: ' + error.message);
    }
}
