class QRController {
    constructor() {
        this.currentQR = null;
        this.qrTimer = null;
        this.apiUrl = window.location.hostname === 'localhost' 
            ? 'http://localhost:3000/api' 
            : 'https://tu-app-en-render.onrender.com/api';
    }

    generateQR(userId) {
        // Generar token único
        const token = `ist-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        this.currentQR = token;
        
        // Dibujar QR simple (en producción usar qrcode.js)
        this.drawQR(token);
        
        // Iniciar countdown de 10s
        this.startQRTimer(10);
        
        // Registrar en servidor
        this.registerQR(userId, token);
        
        return token;
    }

    drawQR(token) {
        const canvas = document.getElementById('qrCanvas');
        const ctx = canvas.getContext('2d');
        const size = 200;
        
        // Fondo blanco
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, size, size);
        
        // Generar patrón visual determinístico desde el token
        const seed = token.split('').reduce((a,b) => a + b.charCodeAt(0), 0);
        const cells = 25;
        const cellSize = size / cells;
        
        // Esquinas de posición (marcadores de QR)
        const drawPosition = (x, y) => {
            ctx.fillStyle = 'black';
            ctx.fillRect(x*cellSize, y*cellSize, 7*cellSize, 7*cellSize);
            ctx.fillStyle = 'white';
            ctx.fillRect((x+1)*cellSize, (y+1)*cellSize, 5*cellSize, 5*cellSize);
            ctx.fillStyle = 'black';
            ctx.fillRect((x+2)*cellSize, (y+2)*cellSize, 3*cellSize, 3*cellSize);
        };
        
        drawPosition(0, 0);
        drawPosition(cells-7, 0);
        drawPosition(0, cells-7);
        
        // Datos aleatorios pero determinísticos
        for(let i=8; i<cells-8; i++) {
            for(let j=8; j<cells-8; j++) {
                if ((seed * i * j) % 7 === 0) {
                    ctx.fillStyle = 'black';
                    ctx.fillRect(i*cellSize, j*cellSize, cellSize, cellSize);
                }
            }
        }
    }

    startQRTimer(seconds) {
        const timerEl = document.getElementById('qrTimer');
        let remaining = seconds;
        
        clearInterval(this.qrTimer);
        
        this.qrTimer = setInterval(() => {
            timerEl.textContent = remaining;
            
            if (remaining <= 3) {
                timerEl.style.color = 'var(--neon-red)';
                timerEl.style.textShadow = '0 0 20px var(--neon-red)';
            }
            
            if (remaining <= 0) {
                clearInterval(this.qrTimer);
                // Regenerar automáticamente
                if (document.getElementById('makeFriend').classList.contains('active')) {
                    this.generateQR(window.app.userId);
                }
            }
            
            remaining--;
        }, 1000);
    }

    async registerQR(userId, token) {
        try {
            await fetch(`${this.apiUrl}/qr/generate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId, qrToken: token })
            });
        } catch (err) {
            console.error('Error registrando QR:', err);
        }
    }

    async scanQR(scannerId, qrToken) {
        try {
            const response = await fetch(`${this.apiUrl}/friend/scan`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ scannerId, qrToken })
            });
            
            const data = await response.json();
            
            if (data.success) {
                // Animar recepción de tiempo
                const currentTime = window.timeController.getTimeMs();
                window.timeController.animateTimeTransition(currentTime + data.rewardMs);
                
                // Recargar amigos
                window.app.loadFriends();
                
                return data;
            } else {
                throw new Error(data.error);
            }
        } catch (err) {
            alert('Error: ' + err.message);
            return null;
        }
    }
}

window.qrController = new QRController();