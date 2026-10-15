import { CONFIG } from './config.js';

// Единственное место, которое знает о Яндекс SDK. Локально сетевых запросов нет.
export class YandexPlatform {
  constructor({ onPause = () => {}, onResume = () => {} } = {}) {
    this.sdk = null;
    this.player = null;
    this.onPause = onPause;
    this.onResume = onResume;
    this.adPending = false;
    this.cloudQueue = Promise.resolve();
  }

  async init() {
    const enabled = document.querySelector('meta[name="yandex-games"]')?.content === 'enabled';
    if (!enabled && !window.YaGames) return false;
    try {
      if (!window.YaGames) await this.withTimeout(new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = '/sdk.js'; script.async = true;
        script.onload = resolve; script.onerror = reject;
        document.head.append(script);
      }));
      this.sdk = await this.withTimeout(window.YaGames.init());
      this.sdk.on?.('game_api_pause', this.onPause);
      this.sdk.on?.('game_api_resume', this.onResume);
      if (CONFIG.platform.cloudSaves) {
        try { this.player = await this.withTimeout(this.sdk.getPlayer()); } catch { this.player = null; }
      }
      return true;
    } catch { this.sdk = null; return false; }
  }

  withTimeout(promise) {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('Истекло время ожидания платформы')), CONFIG.platform.timeoutMs);
      Promise.resolve(promise).then(value => { clearTimeout(timer); resolve(value); }, error => { clearTimeout(timer); reject(error); });
    });
  }

  ready() { this.sdk?.features?.LoadingAPI?.ready(); }
  start() { this.sdk?.features?.GameplayAPI?.start(); }
  stop() { this.sdk?.features?.GameplayAPI?.stop(); }

  async loadCloud() {
    if (!this.player) return null;
    try { return (await this.withTimeout(this.player.getData(['cehSave']))).cehSave ?? null; }
    catch { return null; }
  }

  saveCloud(state) {
    if (!this.player) return Promise.resolve(false);
    const snapshot = structuredClone(state);
    // Последовательная запись не даёт старому запросу затереть новое сохранение.
    this.cloudQueue = this.cloudQueue.catch(() => false).then(async () => {
      try { await this.withTimeout(this.player.setData({ cehSave: snapshot }, true)); return true; }
      catch { return false; }
    });
    return this.cloudQueue;
  }

  showRewarded() { return this.showAd(true); }
  showFullscreen() { return this.showAd(false); }

  showAd(rewarded) {
    if (!this.sdk?.adv || this.adPending) return Promise.resolve({ shown: false, rewarded: false });
    this.adPending = true;
    return new Promise(resolve => {
      let received = false;
      let opened = false;
      let finished = false;
      const finish = shown => {
        if (finished) return;
        finished = true; this.adPending = false; this.onResume();
        resolve({ shown: Boolean(shown), rewarded: received });
      };
      const callbacks = {
        onOpen: () => { opened = true; this.onPause(); },
        onRewarded: () => { received = true; },
        onClose: shown => finish(rewarded ? opened : shown),
        onError: () => finish(false)
      };
      try {
        if (rewarded) this.sdk.adv.showRewardedVideo({ callbacks });
        else this.sdk.adv.showFullscreenAdv({ callbacks });
      } catch { finish(false); }
    });
  }
}
