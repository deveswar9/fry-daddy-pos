import React, { useEffect, useState, useRef } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import {
  subscribeToPaymentNotifications,
  acknowledgePaymentNotification,
  PaymentNotification
} from '@/firebase/services';
import {
  LayoutDashboard,
  BookOpen,
  BarChart3,
  Sun,
  Moon,
  LogOut,
  Clock,
  ChefHat,
  Check,
  CreditCard,
  Volume2,
  VolumeX
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { voiceAnnouncementService, convertTableToSpeechText } from '@/services/voiceAnnouncement';


const getPlayedIds = (): Set<string> => {
  try {
    const stored = localStorage.getItem('played_payment_notifications');
    return stored ? new Set(JSON.parse(stored)) : new Set();
  } catch (e) {
    return new Set();
  }
};

const markIdAsPlayed = (id: string) => {
  try {
    const played = getPlayedIds();
    played.add(id);
    localStorage.setItem('played_payment_notifications', JSON.stringify(Array.from(played)));
  } catch (e) {
    console.error(e);
  }
};

export const Layout: React.FC = () => {
  const { counter, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();

  const [queue, setQueue] = useState<PaymentNotification[]>([]);
  const pageLoadTime = useRef<number>(Date.now());
  const acknowledgedIds = useRef<Set<string>>(new Set());
  const [voiceEnabled, setVoiceEnabled] = useState<boolean>(() => {
    return localStorage.getItem('voice_announcements_enabled') !== 'false';
  });

  const activePopup = queue[0] || null;

  useEffect(() => {
    localStorage.setItem('voice_announcements_enabled', String(voiceEnabled));
  }, [voiceEnabled]);

  useEffect(() => {
    if (!counter) {
      setQueue([]);
      return;
    }

    const unsubscribe = subscribeToPaymentNotifications(counter, (notifications) => {
      // Filter out notifications acknowledged locally during this session
      const pending = notifications.filter(n => n.status === 'pending' && !acknowledgedIds.current.has(n.id));
      
      const played = getPlayedIds();
      
      pending.forEach((n) => {
        const isNew = n.createdAt > pageLoadTime.current;
        const hasPlayed = played.has(n.id);
        if (isNew && !hasPlayed) {
          markIdAsPlayed(n.id);
          const tableText = convertTableToSpeechText(n.tableName || n.tableId || '');
          voiceAnnouncementService.announce(`Payment received for ${tableText}.`);
        }
      });
      
      setQueue((prevQueue) => {
        // Optimistically keep queue synced, ignoring any that became non-pending or locally closed
        const filteredPrev = prevQueue.filter(q => pending.some(p => p.id === q.id) && !acknowledgedIds.current.has(q.id));
        const merged = [...filteredPrev];
        
        // Add new pending items (sorted oldest first/chronologically for cashier flow)
        const sortedPending = [...pending].sort((a, b) => a.createdAt - b.createdAt);
        sortedPending.forEach((incoming) => {
          if (!merged.some(q => q.id === incoming.id)) {
            merged.push(incoming);
          }
        });
        
        return merged;
      });
    });

    return unsubscribe;
  }, [counter]);

  const handleAcknowledge = async () => {
    if (queue.length === 0) return;
    const current = queue[0];
    
    // Add to local ref of acknowledged IDs
    acknowledgedIds.current.add(current.id);
    
    // Optimistically update local queue
    setQueue(prev => prev.filter(n => n.id !== current.id));
    
    try {
      await acknowledgePaymentNotification(current.id);
    } catch (e) {
      console.error('Failed to acknowledge notification:', e);
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.altKey && !e.ctrlKey && !e.shiftKey) {
        if (e.key.toLowerCase() === 'd') {
          e.preventDefault();
          navigate('/');
        } else if (e.key.toLowerCase() === 'm') {
          e.preventDefault();
          navigate('/menu');
        } else if (e.key.toLowerCase() === 'r') {
          e.preventDefault();
          navigate('/reports');
        } else if (e.key.toLowerCase() === 't') {
          e.preventDefault();
          toggleTheme();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [navigate, toggleTheme]);

  const navItems = [
    { path: '/', label: 'Dashboard', icon: LayoutDashboard, shortcut: 'Alt + D' },
    { path: '/menu', label: 'Menu Management', icon: BookOpen, shortcut: 'Alt + M' },
    { path: '/reports', label: 'Reports', icon: BarChart3, shortcut: 'Alt + R' },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors duration-300">
      <header className="sticky top-0 z-50 w-full border-b border-slate-200 dark:border-slate-800 glass dark:bg-slate-950/70 shadow-sm backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5 cursor-pointer" onClick={() => navigate('/')}>
            <div className="p-1.5 bg-emerald-500/10 dark:bg-emerald-400/15 rounded-xl border border-emerald-500/20 dark:border-emerald-400/20">
              <ChefHat className="w-6 h-6 text-emerald-500 dark:text-emerald-400" />
            </div>
            <div>
              <span className="font-extrabold text-lg tracking-tight bg-gradient-to-r from-slate-900 to-slate-700 dark:from-white dark:to-slate-300 bg-clip-text text-transparent">
                Fry Daddy
              </span>
              <span className="text-[10px] font-medium text-slate-400 block -mt-1 tracking-wider uppercase">
                Live Billing
              </span>
            </div>
          </div>

          <nav className="hidden md:flex items-center space-x-1">
            {navItems.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <button
                  key={item.path}
                  onClick={() => navigate(item.path)}
                  className={`relative flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 cursor-pointer ${
                    isActive
                      ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-50/50 dark:bg-emerald-950/30'
                      : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100/50 dark:hover:bg-slate-900/40'
                  }`}
                  title={`Shortcut: ${item.shortcut}`}
                >
                  <item.icon className="w-4.5 h-4.5" />
                  {item.label}
                  {isActive && (
                    <motion.div
                      layoutId="active-indicator"
                      className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-500 dark:bg-emerald-400 rounded-full"
                      transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                    />
                  )}
                </button>
              );
            })}
          </nav>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <span className="hidden sm:inline text-xs text-slate-400 font-light">Active:</span>
              <div
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold shadow-xs ${
                  counter === 'B1'
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400 dark:bg-emerald-400/10'
                    : 'bg-indigo-500/10 border-indigo-500/30 text-indigo-600 dark:text-indigo-400 dark:bg-indigo-400/10'
                }`}
                title="Active counter"
              >
                <span className={`w-2 h-2 rounded-full ${counter === 'B1' ? 'bg-emerald-500' : 'bg-indigo-500'} animate-pulse`} />
                {counter === 'B1' ? 'Restaurant Counter' : 'Fast Food Counter'}
              </div>
            </div>

            <label className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-semibold text-slate-600 dark:text-slate-450 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-850 select-none shadow-xs">
              <input
                type="checkbox"
                checked={voiceEnabled}
                onChange={(e) => setVoiceEnabled(e.target.checked)}
                className="w-3.5 h-3.5 rounded border-slate-300 dark:border-slate-700 text-emerald-500 focus:ring-emerald-400 cursor-pointer accent-emerald-500"
              />
              <span className="hidden sm:inline">Voice Announcements</span>
              {voiceEnabled ? (
                <Volume2 className="w-3.5 h-3.5 text-emerald-500" />
              ) : (
                <VolumeX className="w-3.5 h-3.5 text-slate-400" />
              )}
            </label>

            <button
              onClick={toggleTheme}
              className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-850 transition-colors shadow-xs cursor-pointer"
              title="Toggle Theme (Alt + T)"
            >
              {theme === 'light' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
            </button>

            <button
              onClick={logout}
              className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/20 transition-colors shadow-xs cursor-pointer"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            <Outlet />
          </motion.div>
        </AnimatePresence>
      </main>

      <footer className="md:hidden fixed bottom-0 left-0 right-0 z-40 border-t border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-950/95 backdrop-blur-md shadow-lg">
        <div className="flex justify-around items-center h-16">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={`flex flex-col items-center justify-center w-20 h-full gap-1 cursor-pointer transition-all ${
                  isActive
                    ? 'text-emerald-500 dark:text-emerald-400'
                    : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
                }`}
              >
                <item.icon className="w-5.5 h-5.5" />
                <span className="text-[10px] font-medium">{item.label.split(' ')[0]}</span>
              </button>
            );
          })}
        </div>
      </footer>
      <div className="md:hidden h-16" />

      {/* Realtime Cross-Counter Payment Popup Modal */}
      <AnimatePresence>
        {activePopup && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-xs"
            />
            
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-2xl overflow-hidden text-slate-950 dark:text-white z-10"
            >
              <div className="flex items-center gap-3 text-emerald-500 dark:text-emerald-400 mb-4">
                <div className="p-2 bg-emerald-500/10 rounded-xl">
                  <CreditCard className="w-6 h-6 animate-pulse" />
                </div>
                <h3 className="text-xl font-bold">Payment Received</h3>
              </div>

              <div className="space-y-4 text-sm leading-relaxed mb-6 font-sans">
                <div className="grid grid-cols-2 gap-4 border-b border-slate-100 dark:border-slate-800/80 pb-3">
                  <div>
                    <span className="text-slate-400 font-light block text-xs">Table:</span>
                    <span className="font-extrabold text-base">
                      {(() => {
                        const raw = activePopup.tableName || activePopup.tableId || '';
                        if (raw.startsWith('T')) return raw;
                        if (/^\d+$/.test(raw)) return 'T' + raw.padStart(2, '0');
                        return raw;
                      })()}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 font-light block text-xs">Paid At:</span>
                    <span className="font-extrabold text-sm text-slate-850 dark:text-slate-100">
                      {activePopup.paidByCounter === 'B1' 
                        ? 'Restaurant Billing (B1)' 
                        : (activePopup.paidByCounter === 'B2' ? 'Fast Food Billing (B2)' : `Counter ${activePopup.paidByCounter}`)}
                    </span>
                  </div>
                </div>

                <div>
                  <span className="text-slate-400 font-light block text-xs mb-1.5">Items Paid:</span>
                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-850 font-mono text-xs space-y-1.5 text-slate-800 dark:text-slate-200 max-h-[160px] overflow-y-auto">
                    {(activePopup.items || activePopup.itemNames || []).map((name, i) => (
                      <div key={i} className="flex items-center gap-1.5">
                        <span className="text-emerald-500 font-semibold">✓</span>
                        <span>{name}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-1 font-mono text-xs text-slate-650 dark:text-slate-350">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Subtotal:</span>
                    <span className="font-bold text-slate-900 dark:text-white">₹{activePopup.paidAmount ?? activePopup.total ?? 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Payment Method:</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">{activePopup.paymentMethod || 'UPI'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Payment Time:</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">
                      {new Date(activePopup.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Order Number:</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">{activePopup.orderId}</span>
                  </div>
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  onClick={handleAcknowledge}
                  className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 dark:bg-emerald-400 dark:text-slate-950 dark:hover:bg-emerald-350 text-white text-sm font-bold shadow-md cursor-pointer transition-colors"
                >
                  OK
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
