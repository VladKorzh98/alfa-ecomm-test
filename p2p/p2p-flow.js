// P2P Flow Logic
var p2pConfig = {
    type: '', // 'with-3ds' or 'without-3ds'
    fromCard: null,
    toCard: null,
    cards: [],
    amount: '',
    currency: '933',
    orderId: '',
    orderNumber: ''
};

function showScreen(screenId) {
    var screens = document.getElementsByClassName('screen');
    for (var i = 0; i < screens.length; i++) {
        screens[i].classList.remove('active');
    }
    var targetScreen = document.getElementById(screenId);
    if (targetScreen) {
        targetScreen.classList.add('active');
    }
}

function selectP2PType(type) {
    p2pConfig.type = type;
    if (type === 'without-3ds') {
        loadCards();
    } else {
        alert('P2P с 3DS будет реализован позже');
    }
}

async function loadCards() {
    showScreen('screen-select-cards');
    var loader = document.getElementById('cards-loader');
    var errorDiv = document.getElementById('cards-error');
    var cardList = document.getElementById('card-list');
    
    loader.style.display = 'block';
    errorDiv.classList.remove('show');
    cardList.innerHTML = '';
    
    try {
        var response = await fetch('/api/p2p/get-bindings', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ clientId: '54321' })
        });
        
        var data = await response.json();
        
        if (!response.ok || data.error) {
            throw new Error(data.message || 'Ошибка загрузки карт');
        }
        
        p2pConfig.cards = data.bindings || [];
        
        if (p2pConfig.cards.length === 0) {
            errorDiv.innerText = 'Привязанные карты не найдены';
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
        console.error('Load cards error:', error);
        errorDiv.innerText = error.message;
        errorDiv.classList.add('show');
        loader.style.display = 'none';
    }
}

function selectCard(index) {
    var cardItems = document.querySelectorAll('.card-item');
    var card = p2pConfig.cards[index];
    
    // If card already selected as 'from', remove it
    if (p2pConfig.fromCard && p2pConfig.fromCard.bindingId === card.bindingId) {
        p2pConfig.fromCard = null;
        cardItems[index].classList.remove('selected');
        // Remove "from" label
        var label = cardItems[index].querySelector('.card-label.from');
        if (label) label.remove();
    }
    // If card already selected as 'to', remove it
    else if (p2pConfig.toCard && p2pConfig.toCard.bindingId === card.bindingId) {
        p2pConfig.toCard = null;
        cardItems[index].classList.remove('selected');
        // Remove "to" label
        var label = cardItems[index].querySelector('.card-label.to');
        if (label) label.remove();
    }
    // If no card selected as 'from', select as 'from'
    else if (!p2pConfig.fromCard) {
        p2pConfig.fromCard = card;
        cardItems[index].classList.add('selected');
        var label = document.createElement('span');
        label.className = 'card-label from';
        label.innerText = '← Списания';
        cardItems[index].appendChild(label);
    }
    // If no card selected as 'to', select as 'to'
    else if (!p2pConfig.toCard) {
        p2pConfig.toCard = card;
        cardItems[index].classList.add('selected');
        var label = document.createElement('span');
        label.className = 'card-label to';
        label.innerText = '→ Получателя';
        cardItems[index].appendChild(label);
    }
    
    updateSelectionInfo();
}

function updateSelectionInfo() {
    var fromEl = document.getElementById('selected-from');
    var toEl = document.getElementById('selected-to');
    var continueBtn = document.getElementById('continue-btn');
    
    if (fromEl) {
        fromEl.innerText = p2pConfig.fromCard ? p2pConfig.fromCard.maskedPan : 'Не выбрана';
    }
    if (toEl) {
        toEl.innerText = p2pConfig.toCard ? p2pConfig.toCard.maskedPan : 'Не выбрана';
    }
    if (continueBtn) {
        continueBtn.disabled = !(p2pConfig.fromCard && p2pConfig.toCard);
    }
}

function showAmountScreen() {
    if (!p2pConfig.fromCard || !p2pConfig.toCard) {
        alert('Выберите обе карты');
        return;
    }
    showScreen('screen-amount');
}

function validateAmount(input) {
    input.value = input.value.replace(/[^0-9.]/g, '');
    var parts = input.value.split('.');
    if (parts.length > 2) input.value = parts[0] + '.' + parts[1];
    if (parts.length === 2 && parts[1].length > 2) {
        input.value = parts[0] + '.' + parts[1].substring(0, 2);
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
        
        var registerResponse = await fetch('/api/p2p/register', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({
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
        
        var performResponse = await fetch('/api/p2p/perform', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({
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
            // Show status page
            showStatusPage();
        }
        
    } catch (error) {
        console.error('P2P error:', error);
        alert('Ошибка: ' + error.message);
        showScreen('screen-amount');
    }
}

function generateOrderNumber() {
    return Math.floor(Math.random() * 100000).toString();
}

async function showStatusPage() {
    showScreen('screen-status');
    var loader = document.getElementById('status-loader');
    var content = document.getElementById('status-content');
    
    loader.style.display = 'block';
    content.style.display = 'none';
    
    try {
        var response = await fetch('/api/p2p/status', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({
                orderId: p2pConfig.orderId
            })
        });
        
        var data = await response.json();
        
        if (!response.ok || data.error) {
            throw new Error(data.message || 'Ошибка получения статуса');
        }
        
        // Display status
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
