async function loadCards() {
    showScreen('screen-select-cards');
    var loader = document.getElementById('cards-loader');
    var errorDiv = document.getElementById('cards-error');
    var cardList = document.getElementById('card-list');
    
    loader.style.display = 'block';
    errorDiv.classList.remove('show');
    cardList.innerHTML = '';
    
    try {
        console.log('🔄 Запрос карт для clientId: 54321');
        
        var response = await fetch('/api/p2p?action=get-bindings', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ 
                action: 'get-bindings',
                clientId: '54321' 
            })
        });
        
        console.log('📡 Ответ API:', response.status);
        var data = await response.json();
        console.log('📦 Данные:', data);
        
        if (!response.ok || data.error) {
            throw new Error(data.message || 'Ошибка загрузки карт');
        }
        
        p2pConfig.cards = data.bindings || [];
        console.log('✅ Найдено карт:', p2pConfig.cards.length);
        
        if (p2pConfig.cards.length === 0) {
            errorDiv.innerText = 'Привязанные карты не найдены для clientId 54321. Сначала создайте платёж с привязкой карты через ECOM операции.';
            errorDiv.classList.add('show');
            loader.style.display = 'none';
            return;
        }
        
        // Display cards
        p2pConfig.cards.forEach(function(card, index) {
            var cardDiv = document.createElement('div');
            cardDiv.className = 'card-item';
            cardDiv.onclick = function() { selectCard(index); };
            cardDiv.innerHTML = '<div class="card-number">' + card.maskedPan + '</div>' +
                '<div class="card-info">' + (card.paymentSystem || '') + ' • ' + (card.expiryDate || '') + '</div>';
            cardList.appendChild(cardDiv);
        });
        
        loader.style.display = 'none';
        
    } catch (error) {
        console.error('❌ Ошибка загрузки карт:', error);
        errorDiv.innerText = error.message;
        errorDiv.classList.add('show');
        loader.style.display = 'none';
    }
}

async function registerP2P() {
    var amountInput = document.getElementById('p2p-amount');
    var amount = amountInput ? amountInput.value.trim() : '';
    
    if (!amount || parseFloat(amount) <= 0) {
        alert('Введите корректную сумму');
        return;
    }
    
    p2pConfig.amount = amount;
    p2pConfig.orderNumber = generateOrderNumber();
    
    showScreen('screen-processing');
    var statusEl = document.getElementById('processing-status');
    
    try {
        // Step 1: Register P2P
        statusEl.innerText = 'Регистрация перевода...';
        
        var registerResponse = await fetch('/api/p2p?action=register', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({
                action: 'register',
                amount: amount,
                currency: p2pConfig.currency,
                orderNumber: p2pConfig.orderNumber,
                clientId: '54321'
            })
        });
        
        var registerData = await registerResponse.json();
        
        if (!registerResponse.ok || registerData.error) {
            throw new Error(registerData.message || 'Ошибка регистрации');
        }
        
        p2pConfig.orderId = registerData.orderId;
        
        // Step 2: Perform P2P
        statusEl.innerText = 'Выполнение перевода...';
        
        var performResponse = await fetch('/api/p2p?action=perform', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({
                action: 'perform',
                orderId: p2pConfig.orderId,
                fromBindingId: p2pConfig.fromCard.bindingId,
                toBindingId: p2pConfig.toCard.bindingId
            })
        });
        
        var performData = await performResponse.json();
        
        if (!performResponse.ok || performData.error) {
            throw new Error(performData.message || 'Ошибка выполнения');
        }
        
        // Redirect to finish page
        if (performData.redirect) {
            window.location.href = performData.redirect;
        } else {
            showStatusPage();
        }
        
    } catch (error) {
        console.error('P2P error:', error);
        alert('Ошибка: ' + error.message);
        showScreen('screen-amount');
    }
}

async function showStatusPage() {
    showScreen('screen-status');
    var loader = document.getElementById('status-loader');
    var content = document.getElementById('status-content');
    
    loader.style.display = 'block';
    content.style.display = 'none';
    
    try {
        var response = await fetch('/api/p2p?action=status', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({
                action: 'status',
                orderId: p2pConfig.orderId
            })
        });
        
        var data = await response.json();
        
        if (!response.ok || data.error) {
            throw new Error(data.message || 'Ошибка получения статуса');
        }
        
        document.getElementById('st-status').innerText = data.status || 'Неизвестно';
        document.getElementById('st-amount').innerText = (parseFloat(data.amount) / 100).toFixed(2) + ' BYN';
        document.getElementById('st-rrn').innerText = data.rrn || '-';
        document.getElementById('st-from-card').innerText = p2pConfig.fromCard ? p2pConfig.fromCard.maskedPan : '-';
        document.getElementById('st-to-card').innerText = p2pConfig.toCard ? p2pConfig.toCard.maskedPan : '-';
        
        loader.style.display = 'none';
        content.style.display = 'block';
        
    } catch (error) {
        console.error('Status error:', error);
        loader.style.display = 'none';
        alert('Ошибка получения статуса: ' + error.message);
    }
}
