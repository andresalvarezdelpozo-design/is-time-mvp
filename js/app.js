const API_URL = 'https://is-time-mvp.onrender.com/api';

class App {
    constructor() {
        this.userId = null;
        this.username = this.generateRandomId();
        this.countdownInterval = null;
    }

    init() {
        this.startCountdown();
        
        // Click/Touch en splash1
        const splash1 = document.getElementById('splash1');
        splash1.addEventListener('click', () => this.showRules());
        splash1.addEventListener('touchstart', (e) => { e.preventDefault(); this.showRules(); });
        
        // Click/Touch en splash2
        const splash2 = document.getElementById('splash2');
        splash2.addEventListener('click', () => this.startGame());
        splash2.addEventListener('touchstart', (e) => { e.preventDefault(); this.startGame(); });
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
            
            document.getElementById('countdownTimer').textContent = 
                `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
            
            totalSeconds--;
            if (totalSeconds < 0) totalSeconds = 24 * 3600;
        };
        
        update();
        this.countdownInterval = setInterval(update, 1000);
    }

    showRules() {
        clearInterval(this.countdownInterval);
        
        document.getElementById('splash1').classList.remove('active');
        document.getElementById('splash2').classList.add('active');
        
        setTimeout(() => document.getElementById('rule1').classList.add('show'), 100);
        setTimeout(() => document.getElementById('rule2').classList.add('show'), 1200);
        setTimeout(() => document.getElementById('rule3').classList.add('show'), 2400);
    }

    async startGame() {
        // Crear usuario
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
                this.username = this.generateRandomId();
                return this.startGame();
            }
        } catch (err) {
            this.userId = 'OFF-' + this.username;
        }
        
        document.getElementById('splash2').classList.remove('active');
        document.getElementById('home').classList.add('active');
        
        document.getElementById('userIdDisplay').textContent = `ID: ${this.username}`;
        
        this.startGameTimer();
    }

    startGameTimer() {
        let ms = 72 * 3600000;
        
        setInterval(() => {
            ms -= 1000;
            if (ms < 0) ms = 0;
            
            const h = Math.floor(ms / 3600000);
            const m = Math.floor((ms % 3600000) / 60000);
            const s = Math.floor((ms % 60000) / 1000);
            
            document.getElementById('timerDisplay').textContent = 
                `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
        }, 1000);
    }
}

window.onload = () => {
    window.app = new App();
    window.app.init();
};
