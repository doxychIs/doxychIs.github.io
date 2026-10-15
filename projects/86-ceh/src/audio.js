export class Sound {
  constructor() { this.context = null; this.enabled = false; this.paused = false; }
  play(kind = 'click') {
    if (!this.enabled || this.paused || document.hidden) return;
    try {
      const Audio = window.AudioContext || window.webkitAudioContext;
      if (!Audio) return;
      this.context ??= new Audio();
      if (this.context.state === 'suspended') this.context.resume().catch(() => {});
      const oscillator = this.context.createOscillator();
      const gain = this.context.createGain();
      oscillator.connect(gain); gain.connect(this.context.destination);
      const time = this.context.currentTime;
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(({buy:480,hit:135,impact:90,win:660,start:330}[kind] ?? 220), time);
      oscillator.frequency.exponentialRampToValueAtTime(({buy:760,hit:60,impact:40,win:990,start:480}[kind] ?? 100), time + 0.075);
      gain.gain.setValueAtTime(0.035, time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + 0.12);
      oscillator.start(time); oscillator.stop(time + 0.13);
    } catch { /* Звук не влияет на игровой цикл. */ }
  }
  pause(value) {
    this.paused = value;
    if (value) this.context?.suspend().catch(() => {});
    else if (this.enabled) this.context?.resume().catch(() => {});
  }
}
