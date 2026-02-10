const API_URL = 'https://is-time-mvp.onrender.com/api';

class App {
    constructor() {
        this.userId = null;
        this.username = this.generateRandomId();
        this.countdownInterval = null;
        this.ready = false;
    }

    init() {
        // Esperar a que todo cargue
        setTimeout(() => {
            this.ready = true;
            this.startCountdown();
            console.log('App lista, click habilitado');
        }, 800);
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
        let totalSeconds = 24 * 3600;
        
        const update = () => {
            const h = Math.floor(totalSeconds / 3600);
            const m = Math.floor((totalSeconds % 3600) / 60);
            const s = totalSeconds % 60;
            
            const el = document.getElementById('countdownTimer');
            if (el) el.textContent = `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
            
            totalSeconds--;
            if (totalSeconds < 0) totalSeconds = 24 * 3600;
        };
        
        update();
        this.countdownInterval = setInterval(update, 1000);
    }

    showRules(event) {
        event.preventDefault();
        event.stopPropagation();
        
        if (!this.ready) {
            console.log('No ready aún');
            return;
        }
        
        console.log('Click detectado, pasando a frases');
        
        clearInterval(this.countdownInterval);
        
        document.getElementById('splash1').classList.remove('active');
        document.getElementById('splash2').classList.add('active');
        
        // Animar frases
        setTimeout(() => document.getElementById('rule1').classList.add('show'), 100);
        setTimeout(() => document.getElementById('rule2').classList.add('show'), 1200);
        setTimeout(() => document.getElementById('rule3').classList.add('show'), 2400);
    }

    async startGame(event) {
        event.preventDefault();
        event.stopPropagation();
        
        if (!this.ready) return;
        
        console.log('Iniciando juego con ID:', this.username);
        
        // Intentar crear usuario
        try {
            const res = await fetch(`${API_URL}/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username: this.username })
            });
            
            const data = await res.json();
            
            if (data.user) {
                this.userId = data.user.id;
                console.log('Usuario creado:', this.userId);
            } else if (data.error) {
                // Si existe, generar nuevo
                console.log('Usuario existe, generando nuevo...');
                this.username = this.generateRandomId();
                return this.startGame(event);
            }
        } catch (err) {
            console.log('Error conexión, modo offline');
            this.userId = 'OFF-' + this.username;
        }
        
        // Cambiar a HOME
        document.getElementById('splash2').classList.remove('active');
        document.getElementById('home').classList.add('active');
        
        document.getElementById('userIdDisplay').textContent = `ID: ${this.username}`;
        
        this.startGameTimer();
    }

    startGameTimer() {
        let ms = 72 * 3600000;
        
        const update = () => {
            ms -= 1000;
            if (ms < 0) ms = 0;
            
            const h = Math.floor(ms / 3600000);
            const m = Math.floor((ms % 3600000) / 60000);
            const s = Math.floor((ms % 60000) / 1000);
            
            const el = document.getElementById('timerDisplay');
            if (el) el.textContent = `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
        };
        
        update();
        setInterval(update, 1000);
    }

    makeFriend() { alert('MAKE FRIEND'); }
    sendTime() { alert('SEND TIME'); }
    playTokens() { alert('PLAY'); }
    showFriends() { alert('FRIENDS'); }
}

window.onload = () => {
    window.app = new App();
    window.app.init();
};
