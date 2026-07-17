// Voice Announcement Service and English Number Translation helper

const numberToWords = (num: number): string => {
  const ones = [
    '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten',
    'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'
  ];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  
  if (num === 0) return 'Zero';
  if (num < 20) return ones[num];
  
  const tenIdx = Math.floor(num / 10);
  const oneIdx = num % 10;
  return tens[tenIdx] + (oneIdx > 0 ? ' ' + ones[oneIdx] : '');
};

export const convertTableToSpeechText = (tableStr: string): string => {
  if (!tableStr) return 'Unknown Table';

  // Check if it is a formatted table number (e.g. "S1", "A12", "T08", "8")
  const match = tableStr.match(/^([A-Za-z]+)?0*(\d+)$/);
  if (match) {
    const prefix = match[1] || '';
    const num = parseInt(match[2], 10);
    const numWord = numberToWords(num);
    
    if (prefix === '' || prefix.toUpperCase() === 'T') {
      return `Table ${numWord}`;
    }
    
    // Split prefix characters to read separately (e.g., "VIP" -> "V I P", "S" -> "S")
    const prefixSpaced = prefix.split('').join(' ');
    return `Table ${prefixSpaced} ${numWord}`;
  }
  
  // Custom tables (e.g. "Family-1" or "VIP-2"), replace dash with space
  return `Table ${tableStr.replace('-', ' ')}`;
};

const playSound = (): Promise<void> => {
  return new Promise((resolve) => {
    try {
      const audio = new Audio('/notification.wav');
      audio.volume = 0.5;
      audio.onended = () => resolve();
      audio.onerror = () => {
        playChimeFallback().then(resolve);
      };
      audio.play().catch((err) => {
        console.warn('WAV playback blocked or failed, using synthesis fallback:', err);
        playChimeFallback().then(resolve);
      });
    } catch (err) {
      console.warn('Audio construction failed, using synthesis fallback:', err);
      playChimeFallback().then(resolve);
    }
  });
};

const playChimeFallback = (): Promise<void> => {
  return new Promise((resolve) => {
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) {
        resolve();
        return;
      }
      const ctx = new AudioContextClass();
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
};

const speakText = (text: string): Promise<void> => {
  return new Promise((resolve) => {
    if (!('speechSynthesis' in window)) {
      resolve();
      return;
    }

    // Cancel any active speaking just in case of hang-ups
    try {
      window.speechSynthesis.cancel();
    } catch (e) {}

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.volume = 1.0;
    utterance.rate = 0.95; // Slightly slower for clear POS environment pronunciation
    utterance.pitch = 1.0;

    utterance.onend = () => resolve();
    utterance.onerror = (e) => {
      console.warn('Speech synthesis utterance error:', e);
      resolve();
    };

    window.speechSynthesis.speak(utterance);
  });
};

interface AnnouncementTask {
  text: string;
}

class VoiceAnnouncementServiceImpl {
  private queue: AnnouncementTask[] = [];
  private isProcessing = false;

  public async announce(text: string) {
    this.queue.push({ text });
    this.processQueue();
  }

  private async processQueue() {
    if (this.isProcessing || this.queue.length === 0) return;
    this.isProcessing = true;

    while (this.queue.length > 0) {
      const task = this.queue.shift()!;
      
      // 1. Play sound chime
      await playSound();

      // 2. Read setting and announce speech if enabled
      const isVoiceEnabled = localStorage.getItem('voice_announcements_enabled') !== 'false';
      if (isVoiceEnabled) {
        await speakText(task.text);
      }
      
      // 3. Short pause between sequential announcements to keep audio clean and distinguishable
      await new Promise(r => setTimeout(r, 450));
    }

    this.isProcessing = false;
  }
}

export const voiceAnnouncementService = new VoiceAnnouncementServiceImpl();
