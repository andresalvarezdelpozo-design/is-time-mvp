const API_URL = 'https://is-time-mvp.onrender.com/api';

document.addEventListener('DOMContentLoaded', function() {
    
    let username = generateId();
    let userId = null;
    let countdownInterval;
    
    function generateId() {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let id = '';
        for (let i = 0; i < 6; i++) {
            id += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return id;
    }
    
    // PANTALLA 1: Countdown
    function startCountdown() {
        let seconds = 24 * 3600;
        
        function update() {
            const h = Math.floor(seconds / 3600);
            const m = Math.floor((seconds % 3600) / 60);
            const s = seconds % 60;
            document.getElementById('countdownTimer').textContent = 
                `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
            seconds--;
            if (seconds < 0) seconds = 24 * 3600;
        }
        
        update();
        countdownInterval = setInterval(update, 1000);
    }
    
    // PASAR A PANTALLA 2
    function goToRules() {
        console.log('Pantalla 1 click');
        clearInterval(countdownInterval);
        
        document.getElementById('splash1').classList.remove('active');
        document.getElementById('splash2').classList.add('active');
        
        // Mostrar frases
        setTimeout(() => document.getElementById('rule1').classList.add('show'), 200);
        setTimeout(() => document.getElementById('rule2').classList.add('show'), 1400);
        setTimeout(() => document.getElementById('rule3').classList.add('show'), 2600);
        
        // IMPORTANTE: Añadir listener a splash2 AHORA que está activa
        setTimeout(() => {
            document.getElementById('splash2').addEventListener('click', startGame);
            console.log('Listener añadido a splash2');
        }, 100);
    }
    
    // PASAR A PANTALLA 3 (HOME)
    async function startGame() {
        console.log('Pantalla 2 click');
        
        // Crear usuario
        try {
            const res = await fetch(API_URL + '/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username: username })
            });
            const data = await res.json();
            
            if (data.user) {
                userId = data.user.id;
            } else {
                username = generateId();
                return startGame();
            }
        } catch (e) {
            userId = 'OFF-' + username;
        }
        
        // Cambiar pantalla
        document.getElementById('splash2').classList.remove('active');
        document.getElementById('home').classList.add('active');
        
        document.getElementById('userIdDisplay').textContent = 'ID: ' + username;
        
        // Timer de juego
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
        
        // Añadir listeners a botones
        document.getElementById('btn-friend').addEventListener('click', () => alert('MAKE FRIEND'));
        document.getElementById('btn-send').addEventListener('click', () => alert('SEND TIME'));
        document.getElementById('btn-play').addEventListener('click', () => alert('PLAY'));
        document.getElementById('btn-friends').addEventListener('click', () => alert('FRIENDS'));
    }
    
    // INICIAR: Listener en splash1
    document.getElementById('splash1').addEventListener('click', goToRules);
    startCountdown();
});
