import { 
  createOrderNotification, 
  getCounterForKitchen
} from '@/firebase/services';

export class OrderSoundPlayer {
  private timeoutId: number | null = null;
  private currentAudio: HTMLAudioElement | null = null;
  private audioCtx: AudioContext | null = null;
  private isPlaying = false;

  public start() {
    if (this.isPlaying) return;
    this.isPlaying = true;
    this.playLoop();
  }

  private playLoop = () => {
    if (!this.isPlaying) return;

    const onSoundFinished = () => {
      if (!this.isPlaying) return;
      this.timeoutId = window.setTimeout(this.playLoop, 3000);
    };

    try {
      const audio = new Audio('/notification.wav');
      audio.volume = 0.5;
      this.currentAudio = audio;
      
      audio.onended = onSoundFinished;
      audio.onerror = () => {
        this.playChimeFallback().then(onSoundFinished);
      };
      
      audio.play().catch((err) => {
        console.warn('WAV playback blocked or failed, using synthesis fallback:', err);
        this.playChimeFallback().then(onSoundFinished);
      });
    } catch (err) {
      console.warn('Audio construction failed, using synthesis fallback:', err);
      this.playChimeFallback().then(onSoundFinished);
    }
  };

  public stop() {
    this.isPlaying = false;
    if (this.timeoutId) {
      window.clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }
    if (this.currentAudio) {
      try {
        this.currentAudio.pause();
        this.currentAudio.src = '';
      } catch {}
      this.currentAudio = null;
    }
    if (this.audioCtx) {
      try {
        this.audioCtx.close();
      } catch {}
      this.audioCtx = null;
    }
  }

  private playChimeFallback(): Promise<void> {
    return new Promise((resolve) => {
      try {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        if (!AudioContextClass) {
          resolve();
          return;
        }
        const ctx = new AudioContextClass();
        this.audioCtx = ctx;
        const now = ctx.currentTime;
        
        const osc1 = ctx.createOscillator();
        const gain1 = ctx.createGain();
        osc1.type = 'sine';
        osc1.frequency.setValueAtTime(880, now); // A5
        gain1.gain.setValueAtTime(0, now);
        gain1.gain.linearRampToValueAtTime(0.12, now + 0.02);
        gain1.gain.exponentialRampToValueAtTime(0.0001, now + 0.3);
        osc1.connect(gain1);
        gain1.connect(ctx.destination);
        osc1.start(now);
        osc1.stop(now + 0.3);

        const osc2 = ctx.createOscillator();
        const gain2 = ctx.createGain();
        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(1046.50, now + 0.12); // C6
        gain2.gain.setValueAtTime(0, now + 0.12);
        gain2.gain.linearRampToValueAtTime(0.15, now + 0.14);
        gain2.gain.exponentialRampToValueAtTime(0.0001, now + 0.6);
        osc2.connect(gain2);
        gain2.connect(ctx.destination);
        osc2.start(now + 0.12);
        osc2.stop(now + 0.6);

        setTimeout(() => {
          resolve();
        }, 650);
      } catch (err) {
        console.warn('Web Audio fallback synthesis failed:', err);
        resolve();
      }
    });
  }
}

export class OrderNotificationService {
  /**
   * Identifies if items being added belong to other counters,
   * and creates a single notification document per target counter.
   */
  public static async notifyOtherCounters(params: {
    orderId: string;
    tableId: string;
    tableName: string;
    sourceCounter: string;
    items: Array<{ name: string; quantity: number; kitchen: string }>;
  }): Promise<void> {
    const { orderId, tableId, tableName, sourceCounter, items } = params;

    // Group items by target counter (excluding the source counter)
    const groups: Record<string, Array<{ itemName: string; quantity: number }>> = {};

    for (const item of items) {
      const targetCounter = getCounterForKitchen(item.kitchen);
      if (targetCounter !== sourceCounter) {
        if (!groups[targetCounter]) {
          groups[targetCounter] = [];
        }
        groups[targetCounter].push({
          itemName: item.name,
          quantity: item.quantity
        });
      }
    }

    // Write a single notification for each target counter
    for (const [targetCounter, groupItems] of Object.entries(groups)) {
      const notificationData = {
        orderId,
        tableId,
        tableName,
        sourceCounter,
        targetCounter,
        items: groupItems,
        status: 'Pending' as const,
        createdAt: Date.now(),
        acceptedAt: null,
        acceptedBy: null
      };

      await createOrderNotification(notificationData);
    }
  }
}
