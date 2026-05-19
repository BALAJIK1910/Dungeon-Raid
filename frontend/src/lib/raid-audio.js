class RaidAudio {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.heartbeat = null;
    this.enabled = false;
  }

  init() {
    if (this.ctx) return;
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    this.ctx = new Ctx();
    this.master = this.ctx.createGain();
    this.master.gain.value = 0.55;
    this.master.connect(this.ctx.destination);
    this.enabled = true;
  }

  setEnabled(v) {
    if (v && !this.ctx) this.init();
    this.enabled = v;
    if (!v) this.stopHeartbeat();
    if (this.master && this.ctx) this.master.gain.value = v ? 0.55 : 0;
  }

  now() {
    return this.ctx?.currentTime ?? 0;
  }

  envGain(attack, decay, peak = 1) {
    const g = this.ctx.createGain();
    const t = this.now();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(peak, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + attack + decay);
    g.connect(this.master);
    return g;
  }

  swing() {
    if (!this.enabled || !this.ctx) return;
    const t = this.now();
    const noise = this.makeNoise(0.18);
    const bp = this.ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.setValueAtTime(900, t);
    bp.frequency.exponentialRampToValueAtTime(2400, t + 0.15);
    bp.Q.value = 6;
    const g = this.envGain(0.005, 0.18, 0.35);
    noise.connect(bp).connect(g);
    noise.start(t);
    noise.stop(t + 0.2);
  }

  impact(strength = 1) {
    if (!this.enabled || !this.ctx) return;
    const t = this.now();
    const osc = this.ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(180, t);
    osc.frequency.exponentialRampToValueAtTime(40, t + 0.22);
    const og = this.envGain(0.002, 0.28, 0.9 * strength);
    osc.connect(og);
    osc.start(t);
    osc.stop(t + 0.35);
    const noise = this.makeNoise(0.12);
    const hp = this.ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = 1200;
    const ng = this.envGain(0.001, 0.09, 0.45 * strength);
    noise.connect(hp).connect(ng);
    noise.start(t);
    noise.stop(t + 0.12);
  }

  crit() {
    if (!this.enabled || !this.ctx) return;
    this.impact(1.4);
    const t = this.now();
    [880, 1320, 1760].forEach((f, i) => {
      const o = this.ctx.createOscillator();
      o.type = 'triangle';
      o.frequency.value = f;
      const g = this.envGain(0.002, 0.45 - i * 0.05, 0.25);
      o.connect(g);
      o.start(t + i * 0.012);
      o.stop(t + 0.6);
    });
  }

  startHeartbeat() {
    if (!this.enabled || !this.ctx || this.heartbeat != null) return;
    const beat = () => {
      if (!this.enabled || !this.ctx) return;
      const t = this.now();
      [0, 0.18].forEach((off, i) => {
        const o = this.ctx.createOscillator();
        o.type = 'sine';
        o.frequency.setValueAtTime(90, t + off);
        o.frequency.exponentialRampToValueAtTime(40, t + off + 0.22);
        const g = this.envGain(0.002, 0.22, i ? 0.55 : 0.7);
        o.connect(g);
        o.start(t + off);
        o.stop(t + off + 0.3);
      });
    };
    beat();
    this.heartbeat = window.setInterval(beat, 1100);
  }

  stopHeartbeat() {
    if (this.heartbeat != null) {
      clearInterval(this.heartbeat);
      this.heartbeat = null;
    }
  }

  victory() {
    if (!this.enabled || !this.ctx) return;
    const t = this.now();
    const gong = this.ctx.createOscillator();
    gong.type = 'sine';
    gong.frequency.setValueAtTime(60, t);
    const gg = this.envGain(0.01, 1.6, 0.9);
    gong.connect(gg);
    gong.start(t);
    gong.stop(t + 1.8);
    [261.6, 329.6, 392.0, 523.2].forEach((f, i) => {
      const o = this.ctx.createOscillator();
      o.type = i % 2 ? 'triangle' : 'sine';
      o.frequency.value = f;
      const g = this.envGain(0.05 + i * 0.05, 2.4, 0.22);
      o.connect(g);
      o.start(t + 0.15 + i * 0.06);
      o.stop(t + 3);
    });
  }

  makeNoise(duration) {
    const buf = this.ctx.createBuffer(1, this.ctx.sampleRate * duration, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    return src;
  }
}

export const raidAudio = new RaidAudio();
