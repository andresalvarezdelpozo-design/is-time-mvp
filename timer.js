class TimeController {
    constructor() {
        this.currentTimeMs = 72 * 60 * 60 * 1000;
        this.targetTimeMs = this.currentTimeMs;
        this.isFrozen = false;
        this.lastSync = Date.now();
        this.userId = null;
        this.apiUrl = window.location.hostname === 'localhost' 
            ? 'http://localhost:3000/api' 
            : 'https://tu-app-en-render.onrender.com/api';
    }

    async init(userId) {
        this.userId = userId;
        await this.syncWithServer();
        this.startLocalCountdown();
        this.startServerSync();
        this.startAnimationLoop();
    }

    async syncWithServer() {
        try {
            const response = await fetch(`${this.apiUrl}/time/${this.userId}`);
            const data = await response.json();
            
            this.targetTimeMs = data.timeMs;
            this.isFrozen = data.isFrozen;
            
            // Si hay diferencia, animar el cambio
            if (Math.abs(this.currentTimeMs - this.targetTimeMs) > 2000) {
                this.animateTimeTransition(this.targetTimeMs);
            } else {
                this.currentTimeMs = this.targetTimeMs;
            }

            if (this.isFrozen) this.enterFrozenMode();
            this.updateDisplay();
            
        } catch (err) {
            console.error('Sync error:', err);
        }
    }

    startLocalCountdown() {
        setInterval(() => {
            if (!this.isFrozen && this.currentTimeMs > 0) {
                this.currentTimeMs = Math.max(0, this.currentTimeMs - 1000);
                
                if (this.currentTimeMs <= 0) {
                    this.enterFrozenMode();
                }
            }
        }, 1000);
    }

    startServerSync() {
        setInterval(() => this.syncWithServer(), 30000); // Cada 30s
    }

    startAnimationLoop() {
        // Actualizar display más frecuentemente para suavidad
        const animate = () => {
            this.updateDisplay();
            requestAnimationFrame(animate);
        };
        requestAnimationFrame(animate);
    }

    // ANIMACIÓN ESTILO "IN TIME" - Números corriendo rápido
    animateTimeTransition(newTimeMs, duration = 1500) {
        const startTime = Date.now();
        const startValue = this.currentTimeMs;
        const diff = newTimeMs - startValue;
        const isAdding = diff > 0;
        
        // Mostrar overlay de transferencia
        this.showTransferOverlay(isAdding, Math.abs(diff));
        
        const animate = () => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            // Easing: empieza rápido, termina lento (como en la película)
            const eased = 1 - Math.pow(1 - progress, 3);
            
            // Añadir "ruido" aleatorio durante la animación para efecto digital
            if (progress < 0.8) {
                const noise = (Math.random() - 0.5) * (diff * 0.1) * (1 - progress);
                this.currentTimeMs = startValue + (diff * eased) + noise;
            } else {
                this.currentTimeMs = startValue + (diff * eased);
            }
            
            if (progress < 1) {
                requestAnimationFrame(animate);
            } else {
                this.currentTimeMs = newTimeMs;
                this.hideTransferOverlay();
                
                // Flash de color según ganó o perdió
                this.flashScreen(isAdding ? 'green' : 'red');
            }
        };
        
        animate();
    }

    showTransferOverlay(isAdding, amountMs) {
        const overlay = document.getElementById('transferOverlay');
        const numbersEl = document.getElementById('transferNumbers');
        const textEl = document.querySelector('.transfer-text');
        
        // Formatear números para el overlay
        const hours = Math.floor(amountMs / 3600000);
        const mins = Math.floor((amountMs % 3600000) / 60000);
        
        numbersEl.innerHTML = `
            <span class="number-digit">${isAdding ? '+' : '-'}</span>
            <span class="number-digit">${String(hours).padStart(2, '0')}</span>
            <span class="separator">:</span>
            <span class="number-digit">${String(mins).padStart(2, '0')}</span>
            <span class="separator">:</span>
            <span class="number-digit">00</span>
        `;
        
        numbersEl.style.color = isAdding ? 'var(--neon-green)' : 'var(--neon-red)';
        textEl.textContent = isAdding ? 'RECIBIENDO TIEMPO...' : 'TRANSFIRIENDO TIEMPO...';
        
        overlay.classList.add('active');
        
        // Vibración si está disponible
        if (navigator.vibrate) {
            navigator.vibrate(isAdding ? [100, 50, 100] : [200]);
        }
    }

    hideTransferOverlay() {
        document.getElementById('transferOverlay').classList.remove('active');
    }

    flashScreen(color) {
        const flash = document.createElement('div');
        flash.style.position = 'fixed';
        flash.style.top = '0';
        flash.style.left = '0';
        flash.style.width = '100%';
        flash.style.height = '100%';
        flash.style.background = color === 'green' ? 'rgba(0,255,65,0.3)' : 'rgba(255,0,64,0.3)';
        flash.style.pointerEvents = 'none';
        flash.style.zIndex = '9998';
        flash.style.transition = 'opacity 0.5s';
        document.body.appendChild(flash);
        
        setTimeout(() => {
            flash.style.opacity = '0';
            setTimeout(() => flash.remove(), 500);
        }, 100);
    }

    updateDisplay() {
        const timerEl = document.getElementById('timerDisplay');
        if (!timerEl) return;
        
        const totalSeconds = Math.floor(this.currentTimeMs / 1000);
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = totalSeconds % 60;
        
        const timeStr = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
        timerEl.textContent = timeStr;
        
        // Actualizar clases de estado
        timerEl.classList.remove('safe', 'normal', 'danger', 'frozen');
        
        if (this.isFrozen) {
            timerEl.classList.add('frozen');
        } else if (this.currentTimeMs > 48 * 3600000) {
            timerEl.classList.add('safe');
        } else if (this.currentTimeMs > 6 * 3600000) {
            timerEl.classList.add('normal');
        } else {
            timerEl.classList.add('danger');
        }
        
        // Actualizar pulso cardíaco
        this.updatePulse();
    }

    updatePulse() {
        const heartEl = document.getElementById('pulseHeart');
        const hoursLeft = this.currentTimeMs / 3600000;
        
        if (hoursLeft < 12) {
            heartEl.classList.add('fast');
            if (window.audioController) window.audioController.setRate('fast');
        } else {
            heartEl.classList.remove('fast');
            if (window.audioController) window.audioController.setRate('normal');
        }
    }

    enterFrozenMode() {
        this.isFrozen = true;
        document.getElementById('home').classList.remove('active');
        document.getElementById('frozen').classList.add('active');
        
        if (window.audioController) window.audioController.playFrozenSound();
        
        // Iniciar countdown de resurrección
        this.startResurrectionTimer();
    }

    startResurrectionTimer() {
        let timeLeft = 48 * 3600000; // 48h
        
        const update = () => {
            const hours = Math.floor(timeLeft / 3600000);
            const mins = Math.floor((timeLeft % 3600000) / 60000);
            const secs = Math.floor((timeLeft % 60000) / 1000);
            
            const el = document.getElementById('resurrectCountdown');
            if (el) {
                el.textContent = `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
            }
            
            timeLeft -= 1000;
            if (timeLeft > 0) setTimeout(update, 1000);
        };
        
        update();
    }

    getTimeMs() {
        return this.currentTimeMs;
    }

    formatTime(ms) {
        const hours = Math.floor(ms / 3600000);
        const mins = Math.floor((ms % 3600000) / 60000);
        return `${hours}h ${mins}m`;
    }
}

window.timeController = new TimeController();