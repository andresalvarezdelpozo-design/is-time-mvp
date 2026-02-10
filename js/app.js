const API_URL = 'https://is-time-mvp.onrender.com/api';

class App {
    constructor() {
        this.userId = localStorage.getItem('isTimeUserId');
        this.splashTimer = null;
    }

    init() {
        this.startSplashTimer();
        
        // Mostrar registro después de 8 segundos (después de las 3 frases)
        setTimeout(() => {
            if (!this.userId) {
                this.showScreen('register');
            } else {
                this.showScreen('home');
                this.loadTime();
            }
        }, 8000);

        document.getElementById('startBtn').addEventListener('click', () => this.register());
    }

    startSplashTimer() {
        // Cuenta regresiva aleatoria estilo película
        let time = 25 * 3600000 + Math.random() * 3600000;
        const el = document.getElementById('splashTimer');
        
        this.splashTimer = setInterval(() => {
            time -= 1000;
            const h = Math.floor(time / 3600000);
            const m = Math.floor((time % 3600000) / 60000);
            const s = Math.floor((time % 60000) / 1000);
            el.textContent = `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
        }, 100);
    }

    showScreen(id) {
        document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
        document.getElementById(id).classList.add('active');
    }

    async register() {
        const username = document.getElementById('usernameInput').value.trim().toUpperCase();
        const errorEl = document.getElementById('errorMsg');
        
        if (!username || username.length < 2 || username.length > 12) {
            errorEl.textContent = 'NOMBRE INVALIDO (2-12 CARACTERES)';
            return;
        }

        try {
            errorEl.textContent = 'CONECTANDO...';
            
            const res = await fetch(`${API_URL}/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username })
            });
            
            const data = await res.json();
            
            if (data.error) {
                errorEl.textContent = data.error.toUpperCase();
                return;
            }
            
            this.userId = data.user.id;
            localStorage.setItem('isTimeUserId', this.userId);
            
            clearInterval(this.splashTimer);
            this.showScreen('home');
            this.loadTime();
            
        } catch (err) {
            errorEl.textContent = 'ERROR DE CONEXION. INTENTA DE NUEVO';
            console.error(err);
        }
    }

    async loadTime() {
        // Aquí cargarías el tiempo real del servidor
        // Por ahora simulado
        this.startLocalTimer(72 * 3600000);
    }

    startLocalTimer(ms) {
        const el = document.getElementById('timerDisplay');
        
        setInterval(() => {
            ms -= 1000;
            const h = Math.floor(ms / 3600000);
            const m = Math.floor((ms % 3600000) / 60000);
            const s = Math.floor((ms % 60000) / 1000);
            el.textContent = `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
        }, 1000);
    }
}

const app = new App();
app.init();
