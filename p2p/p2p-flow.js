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
        
        var response = await fetch('/api/p2p/get-bindings', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ clientId: '54321' })
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
            errorDiv.innerText = 'Привязанные карты не найдены для clientId 54321';
            errorDiv.classList.add('show');
            loader.style.display = 'none';
            return;
        }
        
        // Display cards...
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
        console.error('❌ Ошибка:', error);
        errorDiv.innerText = error.message;
        errorDiv.classList.add('show');
        loader.style.display = 'none';
    }
}
