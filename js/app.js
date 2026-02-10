const API_URL = 'https://is-time-mvp.onrender.com/api';

class App {
    constructor() {
        this.userId = null;
        this.username = this.generateRandomId();
        this.countdownInterval = null;
    }

    init() {
        this.startCountdown();
    }

    generateRandomId() {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let id = '';
        for (let i = 0; i < 6; i++) {
            id += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return id;
    }

    startCountdown() {
        // 24 horas en segundos
        let totalSeconds = 24 * 3600;
        const el = document.getElementById('countdownTimer');
        
        this.countdownInterval = setInterval(() => {
            totalSeconds--;
            
            const h = Math.floor(totalSeconds / 3600);
            const m = Math.floor((totalSeconds % 3600) / 60);
            const s = totalSeconds % 60;
            
            el.textContent = `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
            
            // Si llega a 0, reinicia (loop para demo)
            if (totalSeconds <= 0) {
                totalSeconds = 24 * 3600;
            }
        }, 1000);
    }

    showRules() {
        clearInterval(this.countdownInterval);
        
        document.getElementById('splash1').classList.remove('active');
        document.getElementById('splash2').classList.add('active');
        
        // Animar frases secuencialmente
        setTimeout(() => document.getElementById('rule1').classList.add('show'), 300);
        setTimeout(() => document.getElementById('rule2').classList.add('show'), 1800);
        setTimeout(() => document.getElementById('rule3').classList.add('show'), 3300);
    }

    async startGame() {
        // Crear usuario automáticamente
        try {
            const res = await fetch(`${API_URL}/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username: this.username })
            });
            
            const data = await res.json();
            
            if (data.user) {
                this.userId = data.user.id;
            } else {
                // Si existe, generar otro
                this.username = this.generateRandomId();
                return this.startGame();
            }
            
        } catch (err) {
            console.error('Error registro:', err);
        }
        
        document.getElementById('splash2').classList.remove('active');
        document.getElementById('home').classList.add('active');
        
        document.getElementById('userIdDisplay').textContent = `ID: ${this.username}`;
        
        this.startGameTimer();
    }

    startGameTimer() {
        let ms = 72 * 3600000; // 72 horas
        const el = document.getElementById('timerDisplay');
        
        setInterval(() => {
            ms -= 1000;
            if (ms < 0) ms = 0;
            
            const h = Math.floor(ms / 3600000);
            const m = Math.floor((ms % 3600000) / 60000);
            const s = Math.floor((ms % 60000) / 1000);
            
            el.textContent = `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
            
            // Cambiar color según tiempo
            if (ms < 6 * 3600000) {
                el.style.color = '#ff0040';
                el.style.textShadow = '0 0 40px #ff0040';
            } else if (ms < 24 * 3600000) {
                el.style.color = '#00d4ff';
                el.style.textShadow = '0 0 40px #00d4ff';
            }
        }, 1000);
    }

    makeFriend() { alert('MAKE FRIEND - QR/NFC'); }
    sendTime() { alert('SEND TIME'); }
    playTokens() { alert('PLAY TOKENS'); }
    showFriends() { alert('FRIENDS LIST'); }
}

const app = new App();
app.init();
