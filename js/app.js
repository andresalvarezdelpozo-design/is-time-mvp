class App {
    constructor() {
        this.userId = localStorage.getItem('isTimeUserId');
        this.username = localStorage.getItem('isTimeUsername');
        this.apiUrl = window.location.hostname === 'localhost' 
            ? 'http://localhost:3000/api' 
            : 'https://tu-app-en-render.onrender.com/api';
        this.friends = [];
        this.selectedFriend = null;
        this.selectedAmount = 3600000; // 1h por defecto
        this.tokensLeft = 5;
    }

    async init() {
        // Inicializar audio
        window.audioController.init();
        
        // Animación de números en splash
        this.animateSplashNumbers();
        
        if (this.userId) {
            setTimeout(() => {
                this.showScreen('home');
                window.timeController.init(this.userId);
                this.loadFriends();
            }, 2000);
        } else {
            setTimeout(() => this.showScreen('register'), 2000);
        }
        
        this.bindEvents();
    }

    animateSplashNumbers() {
        const el = document.getElementById('splashNumbers');
        setInterval(() => {
            const h = String(Math.floor(Math.random()*100)).padStart(2,'0');
            const m = String(Math.floor(Math.random()*60)).padStart(2,'0');
            const s = String(Math.floor(Math.random()*60)).padStart(2,'0');
            el.textContent = `${h}:${m}:${s}`;
        }, 100);
    }

    bindEvents() {
        document.getElementById('startBtn').addEventListener('click', () => this.register());
        
        // Slider personalizado
        document.getElementById('customSlider').addEventListener('input', (e) => {
            this.updateCustomAmount(e.target.value);
        });
    }

    showScreen(screenId) {
        document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
        document.getElementById(screenId).classList.add('active');
        
        if (screenId === 'makeFriend') {
            window.qrController.generateQR(this.userId);
        } else if (screenId === 'sendTime') {
            this.renderFriendsForTransfer();
        } else if (screenId === 'friends') {
            this.loadFriends();
        }
    }

    async register() {
        const username = document.getElementById('usernameInput').value.trim().toUpperCase();
        if (!username || username.length < 2 || username.length > 12) {
            alert('Nombre inválido (2-12 caracteres)');
            return;
        }
        
        try {
            const response = await fetch(`${this.apiUrl}/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username })
            });
            
            const data = await response.json();
            
            if (data.error) {
                alert(data.error);
                return;
            }
            
            this.userId = data.user.id;
            this.username = data.user.username;
            
            localStorage.setItem('isTimeUserId', this.userId);
            localStorage.setItem('isTimeUsername', this.username);
            
            this.showScreen('home');
            window.timeController.init(this.userId);
            
        } catch (err) {
            alert('Error de conexión');
        }
    }

    async loadFriends() {
        try {
            const response = await fetch(`${this.apiUrl}/friends/${this.userId}`);
            this.friends = await response.json();
            
            document.getElementById('friendCount').textContent = this.friends.length;
            this.renderFriendsList();
            
        } catch (err) {
            console.error('Error cargando amigos:', err);
        }
    }

    renderFriendsList() {
        const container = document.getElementById('friendsListFull');
        container.innerHTML = '';
        
        this.friends.forEach(friend => {
            const div = document.createElement('div');
            div.className = 'friend-row';
            
            const hours = Math.floor(friend.time_balance_ms / 3600000);
            const isDanger = hours < 6;
            
            div.innerHTML = `
                <div class="friend-info">
                    <span class="friend-username">${friend.username}</span>
                    <span class="friend-since">Amigo #${friend.reward_tier}</span>
                </div>
                <span class="friend-timer ${isDanger ? 'danger' : ''}">
                    ${String(hours).padStart(2,'0')}:${String(Math.floor((friend.time_balance_ms%3600000)/60000)).padStart(2,'0')}
                </span>
            `;
            
            container.appendChild(div);
        });
    }

    renderFriendsForTransfer() {
        const container = document.getElementById('friendsListSend');
        container.innerHTML = '';
        
        this.friends.forEach(friend => {
            const card = document.createElement('div');
            card.className = 'friend-card';
            card.onclick = () => this.selectFriendForTransfer(friend, card);
            
            const hours = Math.floor(friend.time_balance_ms / 3600000);
            
            card.innerHTML = `
                <div class="friend-name">${friend.username}</div>
                <div class="friend-time">${hours}h</div>
            `;
            
            container.appendChild(card);
        });
    }

    selectFriendForTransfer(friend, cardElement) {
        this.selectedFriend = friend;
        
        // UI feedback
        document.querySelectorAll('.friend-card').forEach(c => c.classList.remove('selected'));
        cardElement.classList.add('selected');
        
        // Mostrar sección de transferencia
        document.getElementById('transferSection').style.display = 'block';
        document.getElementById('selectedFriendDisplay').textContent = `Para: ${friend.username}`;
        
        this.updateTransferPreview();
    }

    selectAmount(ms) {
        this.selectedAmount = ms;
        
        // UI feedback
        document.querySelectorAll('.amount-buttons button').forEach(btn => {
            btn.classList.remove('selected');
            if (btn.textContent.includes(ms/3600000 + 'h')) {
                btn.classList.add('selected');
            }
        });
        
        this.updateTransferPreview();
    }

    updateCustomAmount(hours) {
        this.selectedAmount = hours * 3600000;
        document.getElementById('customAmountDisplay').textContent = `${hours} hora${hours > 1 ? 's' : ''}`;
        this.updateTransferPreview();
    }

    updateTransferPreview() {
        if (!this.selectedFriend) return;
        
        const myTime = window.timeController.getTimeMs();
        const friendTime = parseInt(this.selectedFriend.time_balance_ms);
        
        // Actualizar previews
        document.getElementById('previewYourTime').textContent = this.formatTime(myTime);
        document.getElementById('previewYourChange').textContent = `-${this.formatTime(this.selectedAmount)}`;
        document.getElementById('previewFriendName').textContent = this.selectedFriend.username;
        document.getElementById('previewFriendTime').textContent = this.formatTime(friendTime);
        document.getElementById('previewFriendChange').textContent = `+${this.formatTime(this.selectedAmount)}`;
        
        // Validar si tiene suficiente
        const btn = document.querySelector('.btn-transfer');
        if (myTime < this.selectedAmount) {
            btn.disabled = true;
            btn.textContent = 'TIEMPO INSUFICIENTE';
            btn.style.opacity = '0.5';
        } else {
            btn.disabled = false;
            btn.textContent = 'CONFIRMAR TRANSFERENCIA';
            btn.style.opacity = '1';
        }
    }

    async confirmTransfer() {
        if (!this.selectedFriend || !this.selectedAmount) return;
        
        try {
            const response = await fetch(`${this.apiUrl}/time/send`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    fromId: this.userId,
                    toId: this.selectedFriend.id,
                    amountMs: this.selectedAmount
                })
            });
            
            const data = await response.json();
            
            if (data.success) {
                // Animar la transferencia (como en la película)
                const myNewTime = window.timeController.getTimeMs() - this.selectedAmount;
                window.timeController.animateTimeTransition(myNewTime);
                
                // Reset UI
                this.selectedFriend = null;
                document.getElementById('transferSection').style.display = 'none';
                document.querySelectorAll('.friend-card').forEach(c => c.classList.remove('selected'));
                
                // Recargar amigos
                setTimeout(() => this.loadFriends(), 2000);
                
            } else {
                alert(data.error);
            }
            
        } catch (err) {
            alert('Error en transferencia');
        }
    }

    startScan() {
        // Simulación de escaneo - en producción usar librería de QR
        const mockToken = prompt('Simulación: pega el código QR del amigo:');
        if (mockToken) {
            window.qrController.scanQR(this.userId, mockToken);
        }
    }

    formatTime(ms) {
        const hours = Math.floor(ms / 3600000);
        const mins = Math.floor((ms % 3600000) / 60000);
        return `${String(hours).padStart(2,'0')}:${String(mins).padStart(2,'0')}`;
    }
}

// Inicializar
window.app = new App();
window.app.init();