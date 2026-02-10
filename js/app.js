const API_URL = 'https://is-time-mvp.onrender.com/api';

class App {
    constructor() {
        this.userId = null;
        this.username = this.generateRandomId();
        this.countdownInterval = null;
        this.canClick = false;
    }

    init() {
        // Esperar un poco para que todo cargue
        setTimeout(() => {
            this.canClick = true;
            this.startCountdown();
        }, 500);
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
        // Empezar en 24:00:00 y bajar
        let totalSeconds = 24 * 3600; // 24 horas en segundos
        
        const updateTimer = () => {
            const h = Math.floor(totalSeconds / 3600);
            const m = Math.floor((totalSeconds % 3600) / 60);
            const s = totalSeconds % 60;
            
            const el = document.getElementById('countdownTimer');
            if (el) {
                el.textContent = `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
            }
            
            totalSeconds--;
            
            // Si llega a 0, reinicia
            if (totalSeconds < 0) {
                totalSeconds = 24 * 3600;
            }
        };
        
        updateTimer(); // Primera vez inmediato
        this.countdownInterval = setInterval(updateTimer, 1000); // Luego cada segundo real
    }

    showRules() {
        if (!this.canClick) return;
        
        clearInterval(this.countdownInterval);
        
        document.getElementById('splash1').classList.remove('active');
        document.getElementById('splash2').classList.add('active');
        
        // Mostrar frases una por una
        setTimeout(() => {
            document.getElementById('rule1').classList.add('show');
        }, 200);
        
        setTimeout(() => {
            document.getElementById('rule2').classList.add('show');
        }, 1400);
        
        setTimeout(() => {
            document.getElementById('rule3').classList.add('show');
        }, 2600);
    }

    async startGame() {
        if (!this.canClick) return;
        
        // Crear usuario en backend
        try {
            const res = await fetch(`${API_URL}/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username: this.username })
            });
            
            const data = await res.json();
            
            if (data.user) {
                this.userId = data.user.id;
            } else if (data.error && data.error.includes('existe')) {
                // Si existe, probar con otro ID
                this.username = this.generateRandomId();
                return this.startGame();
            }
            
        } catch (err) {
            console.log('Error conexión, modo offline');
            this.userId = 'offline-' + this.username;
        }
        
        // Cambiar pantalla
        document.getElementById('splash2').classList.remove('active');
        document.getElementById('home').classList.add('active');
        
        // Mostrar ID
        document.getElementById('userIdDisplay').textContent = `ID: ${this.username}`;
        
        // Iniciar timer de juego (72h)
        this.startGameTimer();
    }

    startGameTimer() {
        let ms = 72 * 3600000; // 72 horas
        
        const updateTimer = () => {
            ms -= 1000;
            if (ms < 0) ms = 0;
            
            const h = Math.floor(ms / 3600000);
            const m = Math.floor((ms % 3600000) / 60000);
            const s = Math.floor((ms % 60000) / 1000);
            
            const el = document.getElementById('timerDisplay');
            if (el) {
                el.textContent = `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
            }
        };
        
        updateTimer();
        setInterval(updateTimer, 1000);
    }

    makeFriend() { alert('MAKE FRIEND - Escanea QR'); }
    sendTime() { alert('SEND TIME - Transferir tiempo'); }
    playTokens() { alert('PLAY - 5 tokens'); }
    showFriends() { alert('FRIENDS - Lista'); }
}

// Iniciar cuando cargue la página
window.onload = () => {
    window.app = new App();
    window.app.init();
};
