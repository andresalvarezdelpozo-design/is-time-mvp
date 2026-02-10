const API_URL = 'https://is-time-mvp.onrender.com/api';

// Esperar a que cargue todo
document.addEventListener('DOMContentLoaded', function() {
    
    // Variables
    let username = generateId();
    let userId = null;
    let countdownInterval;
    
    // Generar ID aleatorio
    function generateId() {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let id = '';
        for (let i = 0; i < 6; i++) {
            id += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return id;
    }
    
    // Pantalla 1: cuenta regresiva
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
        
