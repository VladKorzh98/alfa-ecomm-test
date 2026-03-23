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
    } else if (type === 'with-3ds') {
        loadCards();
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

function selectCard(index) {
    var cardItems = document.querySelectorAll('.card-item');
    var card = p2pConfig.cards[index];
    
    // If card already selected as 'from', remove it
    if (p2pConfig.fromCard && p2pConfig.fromCard.bindingId === card.bindingId) {
        p2pConfig.fromCard = null;
        cardItems[index].classList.remove('selected');
        var label = cardItems[index].querySelector('.card-label.from');
        if (label) label.remove();
    }
    // If card already selected as 'to', remove it
    else if (p2pConfig.toCard && p2pConfig.toCard.bindingId === card.bindingId) {
        p2pConfig.toCard = null;
        cardItems[index].classList.remove('selected');
        var label = cardItems[index].querySelector('.card-label.to');
        if (label) label.remove();
    }
    // If no card selected as 'from', select as 'from'
    else if (!p2pConfig.fromCard) {
        p2pConfig.fromCard = card;
        cardItems[index].classList.add('selected');
        var label = document.createElement('span');
        label.className = 'card-label from';
        label.innerText = 'Списание';
        cardItems[index].appendChild(label);
    }
    // If no card selected as 'to', select as 'to'
    else if (!p2pConfig.toCard) {
        p2pConfig.toCard = card;
        cardItems[index].classList.add('selected');
        var label = document.createElement('span');
        label.className = 'card-label to';
        label.innerText = 'Получение';
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
        
        var registerResponse = await fetch('/api/p2p?action=register', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({
                action: 'register',
                amount: amount,
                currency: p2pConfig.currency,
                orderNumber: p2pConfig.orderNumber,
                clientId: '54321',
                use3DS: (p2pConfig.type === 'with-3ds')
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
        
        // Проверяем есть ли 3DS редирект
        if (performData.acsRedirect) {
            // Открываем 3DS страницу
            show3DSPage(performData.acsRedirect);
        } else if (performData.redirect) {
            // Обычный редирект (без 3DS)
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

function show3DSPage(acsRedirect) {
    showScreen('screen-3ds');
    
    // Устанавливаем src iframe
    var iframe = document.getElementById('3ds-frame');
    if (iframe) {
        iframe.src = acsRedirect;
    }
    
    // Сохраняем orderId для проверки после 3DS
    sessionStorage.setItem('p2p_orderId', p2pConfig.orderId);
    
    // Проверяем завершение через 10 секунд
    setTimeout(check3DSComplete, 10000);
}

function check3DSComplete() {
    var orderId = sessionStorage.getItem('p2p_orderId');
    if (orderId) {
        showStatusPage();
    }
}

function showStatusPage() {
    showScreen('screen-status');
    var loader = document.getElementById('status-loader');
    var content = document.getElementById('status-content');
    
    loader.style.display = 'block';
    content.style.display = 'none';
    
    var orderId = sessionStorage.getItem('p2p_orderId') || p2pConfig.orderId;
    
    loadStatus(orderId);
}

async function loadStatus(orderId) {
    try {
        var response = await fetch('/api/p2p?action=status', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({
                action: 'status',
                orderId: orderId
            })
        });

        var data = await response.json();

        document.getElementById('status-loader').style.display = 'none';

        if (!response.ok || data.error) {
            throw new Error(data.message || 'Ошибка получения статуса');
        }

        // Отображаем orderId с кнопкой копирования
        document.getElementById('st-order-id').innerText = data.orderId || '-';
        
        // Статус
        var statusEl = document.getElementById('st-status');
        var statusText = getStatusText(data.status);
        statusEl.innerText = statusText;
        
        if (data.status === '0' || data.status === 0) {
            statusEl.className = 'result-value status-error';
        } else if (data.status === '2' || data.status === 2) {
            statusEl.className = 'result-value status-success';
        } else if (data.status === '6' || data.status === 6) {
            statusEl.className = 'result-value status-error';
        } else {
            statusEl.className = 'result-value';
        }

        // Сумма (делим на 100 если нужно)
        var amount = data.amount || 0;
        if (amount > 100) {
            amount = amount / 100;
        }
        document.getElementById('st-amount').innerText = amount.toFixed(2);
        
        // Валюта
        var currency = data.currency || '933';
        document.getElementById('st-currency').innerText = currency === '933' ? 'BYN' : currency;
        
        // RRN (из operationList)
        var rrn = '-';
        if (data.operationList && data.operationList.length > 0) {
            var firstOp = data.operationList[0];
            if (firstOp.refNum) {
                rrn = firstOp.refNum;
            }
        }
        document.getElementById('st-rrn').innerText = rrn;
        
        // Карты
        document.getElementById('st-from-card').innerText = data.panMaskedFrom || '-';
        document.getElementById('st-to-card').innerText = data.panMaskedTo || '-';

        // Показываем описание ошибки если есть
        var errorDescBlock = document.getElementById('error-description-block');
        var errorDescEl = document.getElementById('st-error-description');
        
        if ((data.status === '6' || data.status === 6) && data.errorMessage && data.errorMessage !== 'Успешно') {
            if (errorDescBlock) errorDescBlock.style.display = 'block';
            if (errorDescEl) errorDescEl.innerText = data.errorMessage;
        } else {
            if (errorDescBlock) errorDescBlock.style.display = 'none';
        }

        document.getElementById('status-content').style.display = 'block';

    } catch (error) {
        console.error('Status error:', error);
        document.getElementById('status-loader').style.display = 'none';
        document.getElementById('error').innerText = 'Ошибка: ' + error.message;
        document.getElementById('error').style.display = 'block';
    }
}

function getStatusText(statusCode) {
    var statusMap = {
        '0': 'Заказ зарегистрирован, не оплачен',
        '1': 'Заказ подтвержден',
        '2': 'Заказ завершен',
        '3': 'Отменен',
        '4': 'Возврат',
        '5': '3DS проверка',
        '6': 'Отклонен',
        '7': 'Ожидает оплаты',
        '8': 'Частичное завершение'
    };
    return statusMap[statusCode] || 'Неизвестный статус (' + statusCode + ')';
}

function generateOrderNumber() {
    return Math.floor(Math.random() * 100000).toString();
}

function copyOrderId() {
    var orderId = document.getElementById('st-order-id').innerText;
    if (!orderId || orderId === '-') {
        alert('Нет orderId для копирования');
        return;
    }
    
    navigator.clipboard.writeText(orderId).then(function() {
        var btn = event.target;
        var originalText = btn.innerText;
        btn.innerText = 'Скопировано!';
        btn.classList.add('copied');
        setTimeout(function() {
            btn.innerText = originalText;
            btn.classList.remove('copied');
        }, 2000);
    }).catch(function(err) {
        var textArea = document.createElement('textarea');
        textArea.value = orderId;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        
        var btn = event.target;
        btn.innerText = 'Скопировано!';
        btn.classList.add('copied');
        setTimeout(function() {
            btn.innerText = 'Копировать';
            btn.classList.remove('copied');
        }, 2000);
    });
}
