class AudioController {
    constructor() {
        this.ctx = null;
        this.heartbeatInterval = null;
        this.currentRate = 'normal'; // 'normal' o 'fast'
        this.isPlaying = false;
    }

    init() {
        // Esperar interacción del usuario para iniciar audio
        const startAudio = () => {
            if (!this.ctx) {
                this.ctx = new (window.AudioContext || window.webkitAudioContext)();
                this.startHeartbeat();
            }
        };
        
        document.addEventListener('click', startAudio, { once: true });
        document.addEventListener('touchstart', startAudio, { once: true });
    }

    startHeartbeat() {
        if (this.isPlaying) return;
        this.isPlaying = true;
        this.playBeat();
    }

    playBeat() {
        if (!this.isPlaying) return;
        
        const t = this.ctx.currentTime;
        
        // Oscilador principal (lub)
        const osc1 = this.ctx.createOscillator();
        const gain1 = this.ctx.createGain();
        osc1.connect(gain1);
        gain1.connect(this.ctx.destination);
        
        osc1.frequency.setValueAtTime(80, t);
        osc1.frequency.exponentialRampToValueAtTime(40, t + 0.1);
        gain1.gain.setValueAtTime(0, t);
        gain1.gain.linearRampToValueAtTime(0.4, t + 0.02);
        gain1.gain.exponentialRampToValueAtTime(0.01, t + 0.15);
        
        osc1.start(t);
        osc1.stop(t + 0.15);
        
        // Oscilador secundario (dub) - 150ms después
        setTimeout(() => {
            const t2 = this.ctx.currentTime;
            const osc2 = this.ctx.createOscillator();
            const gain2 = this.ctx.createGain();
            osc2.connect(gain2);
            gain2.connect(this.ctx.destination);
            
            osc2.frequency.setValueAtTime(60, t2);
            gain2.gain.setValueAtTime(0, t2);
            gain2.gain.linearRampToValueAtTime(0.2, t2 + 0.02);
            gain2.gain.exponentialRampToValueAtTime(0.01, t2 + 0.12);
            
            osc2.start(t2);
            osc2.stop(t2 + 0.12);
        }, 150);
        
        // Programar siguiente latido
        const interval = this.currentRate === 'fast' ? 400 : 1000;
        this.heartbeatInterval = setTimeout(() => this.playBeat(), interval);
    }

    setRate(rate) {
        if (this.currentRate !== rate) {
            this.currentRate = rate;
            // El cambio se aplica en el siguiente ciclo automáticamente
        }
    }

    playFrozenSound() {
        if (!this.ctx) return;
        
        // Detener heartbeat
        this.isPlaying = false;
        clearTimeout(this.heartbeatInterval);
        
        // Sonido de alarma grave
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(50, this.ctx.currentTime);
        gain.gain.setValueAtTime(0.1, this.ctx.currentTime);
        
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start();
        
        // LFO para efecto de alarma
        const lfo = this.ctx.createOscillator();
        lfo.frequency.value = 2;
        const lfoGain = this.ctx.createGain();
        lfoGain.gain.value = 20;
        lfo.connect(lfoGain);
        lfoGain.connect(osc.frequency);
        lfo.start();
    }
}

window.audioController = new AudioController();