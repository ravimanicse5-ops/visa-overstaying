// Web Audio API & Native Mobile Notifications Utility for e-Pravas Suraksha

class NotificationSoundService {
  private audioCtx: AudioContext | null = null;

  private getAudioContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.audioCtx) {
      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtxClass) {
        this.audioCtx = new AudioCtxClass();
      }
    }
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume().catch(() => {});
    }
    return this.audioCtx;
  }

  // Play a crisp modern smartphone SMS chime (harmonized two-tone bell)
  playChimeTone(type: 'sms' | 'urgent' | 'gate' = 'sms') {
    try {
      const ctx = this.getAudioContext();
      if (!ctx) return;

      const now = ctx.currentTime;

      if (type === 'urgent') {
        // High alert rapid 3-pip tone
        [0, 0.12, 0.24].forEach((delay, i) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(880 + i * 220, now + delay);
          gain.gain.setValueAtTime(0.25, now + delay);
          gain.gain.exponentialRampToValueAtTime(0.001, now + delay + 0.1);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now + delay);
          osc.stop(now + delay + 0.12);
        });
      } else if (type === 'gate') {
        // Access granted harp / bell chime
        const freqs = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
        freqs.forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, now + idx * 0.08);
          gain.gain.setValueAtTime(0.2, now + idx * 0.08);
          gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.08 + 0.35);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now + idx * 0.08);
          osc.stop(now + idx * 0.08 + 0.38);
        });
      } else {
        // Standard pleasant mobile SMS chime (F#5 to B5 chime)
        const notes = [739.99, 987.77];
        notes.forEach((freq, i) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, now + i * 0.12);
          gain.gain.setValueAtTime(0.25, now + i * 0.12);
          gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.12 + 0.3);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now + i * 0.12);
          osc.stop(now + i * 0.12 + 0.32);
        });
      }
    } catch (e) {
      console.warn('Audio playback not permitted yet or unsupported:', e);
    }
  }

  // Mobile Hardware Vibration
  vibrate(pattern: number[] = [200, 100, 200]) {
    try {
      if (typeof window !== 'undefined' && 'navigator' in window && navigator.vibrate) {
        navigator.vibrate(pattern);
      }
    } catch (e) {
      // Ignore vibration error
    }
  }

  // Web Speech synthesis to speak aloud in English / Indian accent
  speakAlert(text: string) {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.0;
      utterance.pitch = 1.0;

      const voices = window.speechSynthesis.getVoices();
      // Look for Indian English voice or standard English
      const indianVoice = voices.find(v => v.lang === 'en-IN' || v.name.includes('India'));
      const englishVoice = voices.find(v => v.lang.startsWith('en'));
      utterance.voice = indianVoice || englishVoice || null;

      window.speechSynthesis.speak(utterance);
    } catch (err) {
      console.warn('Speech synthesis error:', err);
    }
  }

  // Request browser native push notification permission
  async requestNotificationPermission(): Promise<NotificationPermission> {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      return 'denied';
    }
    try {
      const permission = await Notification.requestPermission();
      return permission;
    } catch {
      return Notification.permission || 'denied';
    }
  }

  // Trigger real native browser system notification on device
  showSystemNotification(title: string, body: string, icon = '🇮🇳'): boolean {
    if (typeof window === 'undefined' || !('Notification' in window)) return false;
    if (Notification.permission !== 'granted') return false;

    try {
      const notif = new Notification(title, {
        body,
        icon: 'https://cdn-icons-png.flaticon.com/512/924/924915.png', // Verified shield badge
        badge: 'https://cdn-icons-png.flaticon.com/512/924/924915.png',
        tag: 'epravas-' + Date.now(),
        requireInteraction: false,
      } as any);

      notif.onclick = () => {
        window.focus();
        notif.close();
      };
      return true;
    } catch (e) {
      console.warn('System notification launch failed:', e);
      return false;
    }
  }
}

export const notificationService = new NotificationSoundService();
