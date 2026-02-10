const API_URL = 'https://is-time-mvp.onrender.com/api';

class App {
    constructor() {
        this.userId = localStorage.getItem('isTimeUserId');
        this.splashInterval = null;
        this.canSkip = false;
    }

    init() {
        this.startRealTimer();
        
        // Permitir skip después de 1 segundo
        setTimeout(() => this.canSkip = true, 1000);
        
        // Auto-skip después de 10 segundos si no ha hecho click
        setTimeout(() => {
            if (document.getElementById('splash').classList.contains('active')) {
                this.skipSplash();
            }
        }, 10000);

        document.getElementById('startBtn').addEventListener('click', (e) => {
            e.stopPropagation();
            this.register();
        });
    }

    startRealTimer() {
        // Reloj con segundos REALES (no acelerado)
        const el = document.getElementById('splashTimer');
        let totalSeconds = 0;
        
        this.splashInterval = setInterval(() => {
            totalSeconds++;
            const h = Math.floor(totalSeconds / 3600);
            const m = Math.floor((totalSeconds % 3600) / 60);
            const s = totalSeconds % 60;
            el.textContent = `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
        }, 1000);
    }

    skipSplash() {
        if (!this.canSkip) return;
        
        clearInterval(this.splashInterval);
        
        if (this.userId) {
            this.showScreen('home');
            this.loadTime();
        } else {
            this.showScreen('register');
        }
    }

    showScreen(id) {
        document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
        document.getElementById(id).classList.add('active');
    }

    async register() {
        const username = document.getElementById('usernameInput').value.trim().toUpperCase();
        const errorEl = document.getElementById('errorMsg');
        
        if (!username || username.length < 2 || username.length > 12) {
            errorEl.textContent = 'NOMBRE INVALIDO';
            return;
        }

        errorEl.textContent = 'CONECTANDO...';
        errorEl.style.color = '#00ff41';

        try {
            const res = await fetch(`${API_URL}/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username })
            });
            
            const data = await res.json();
            
            if (data.error) {
                errorEl.style.color = '#ff0040';
                errorEl.textContent = data.error.toUpperCase();
                return;
            }
            
            this.userId = data.user.id;
            localStorage.setItem('isTimeUserId', this.userId);
            
            this.showScreen('home');
            this.startGameTimer(72 * 3600000);
            
        } catch (err) {
            errorEl.style.color = '#ff0040';
            errorEl.textContent = 'ERROR DE RED';
            console.error(err);
        }
    }

    startGameTimer(ms) {
        const el = document.getElementById('timerDisplay');
        
        setInterval(() => {
            ms -= 1000;
            if (ms <= 0) ms = 0;
            
            const h = Math.floor(ms / 3600000);
            const m = Math.floor((ms % 3600000) / 60000);
            const s = Math.floor((ms % 60000) / 1000);
            el.textContent = `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
            
            // Cambiar color si poco tiempo
            if (ms < 6 * 3600000) el.style.color = '#ff0040';
            else if (ms < 24 * 3600000) el.style.color = '#00d4ff';
        }, 1000);
    }

    loadTime() {
        this.startGameTimer(72 * 3600000);
    }
}

const app = new App();
app.init();
