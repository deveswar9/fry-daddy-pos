import React, { useEffect, useState, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import { 
  subscribeToOrderNotifications, 
  acceptOrderNotification,
  getCounterForKitchen,
  type OrderNotification 
} from '@/firebase/services';
import { OrderSoundPlayer } from '@/services/OrderNotificationService';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, Check, Clock } from 'lucide-react';

export const OrderNotificationPopup: React.FC = () => {
  const { counter, user } = useAuth();
  const [queue, setQueue] = useState<OrderNotification[]>([]);
  const soundPlayerRef = useRef<OrderSoundPlayer | null>(null);
  const acknowledgedIds = useRef<Set<string>>(new Set());

  // Initialize sound player once
  if (!soundPlayerRef.current) {
    soundPlayerRef.current = new OrderSoundPlayer();
  }

  // Subscribe to realtime order notifications
  useEffect(() => {
    if (!counter) {
      setQueue([]);
      soundPlayerRef.current?.stop();
      return;
    }

    const unsubscribe = subscribeToOrderNotifications(counter, (notifications) => {
      // Filter out notifications already acknowledged locally in this React lifecycle
      const pending = notifications.filter(
        (n) => n.status === 'Pending' && !acknowledgedIds.current.has(n.id)
      );

      // Sort chronologically (oldest first) so cashier accepts them in order
      const sortedPending = [...pending].sort((a, b) => a.createdAt - b.createdAt);
      setQueue(sortedPending);
    });

    return () => {
      unsubscribe();
      soundPlayerRef.current?.stop();
    };
  }, [counter]);

  // Handle playing/stopping the alarm loop
  useEffect(() => {
    if (queue.length > 0) {
      soundPlayerRef.current?.start();
    } else {
      soundPlayerRef.current?.stop();
    }
  }, [queue.length]);

  const activeNotification = queue[0] || null;

  const handleAccept = async () => {
    if (!activeNotification || !counter) return;

    const notifId = activeNotification.id;

    // Immediately record locally so we skip rendering it during Firestore latency
    acknowledgedIds.current.add(notifId);

    // Stop sound immediately if there is only 1 item left in the queue, to avoid any click latency
    if (queue.length <= 1) {
      soundPlayerRef.current?.stop();
    }

    // Optimistically update UI queue state
    setQueue((prev) => prev.filter((n) => n.id !== notifId));

    try {
      const acceptedByUser = user?.email || counter || 'Unknown';
      await acceptOrderNotification(notifId, acceptedByUser);
    } catch (e) {
      console.error('Failed to accept order notification:', e);
    }
  };

  const getCounterDisplayName = (counterKey: string) => {
    if (counterKey === 'B1') return 'Restaurant Billing (B1)';
    if (counterKey === 'B2') return 'Fast Food Billing (B2)';
    return `Counter ${counterKey}`;
  };

  const formatTableNumber = (raw: string) => {
    if (!raw) return '';
    if (raw.startsWith('T') || raw.startsWith('S') || raw.startsWith('A')) return raw;
    if (/^\d+$/.test(raw)) return 'T' + raw.padStart(2, '0');
    return raw;
  };

  if (!activeNotification) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Dark Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/70 backdrop-blur-xs"
        />

        {/* Modal Window */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 30 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 30 }}
          transition={{ type: 'spring', duration: 0.4 }}
          className="relative w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-2xl overflow-hidden text-slate-950 dark:text-white z-10"
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-4 border-b border-slate-100 dark:border-slate-800 pb-3">
            <div className="flex items-center gap-3 text-amber-500 dark:text-amber-400">
              <div className="p-2 bg-amber-500/10 rounded-xl animate-bounce">
                <Bell className="w-6 h-6 animate-pulse" />
              </div>
              <h3 className="text-xl font-bold tracking-tight">NEW ORDER RECEIVED</h3>
            </div>
            
            {/* Pending indicator */}
            <span className="flex items-center gap-1.5 text-[10px] uppercase font-bold text-amber-500 bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 rounded-full animate-pulse">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
              Pending
            </span>
          </div>

          {/* Details */}
          <div className="space-y-4 text-sm leading-relaxed mb-6 font-sans">
            {/* Table & Order Row */}
            <div className="grid grid-cols-2 gap-4 border-b border-slate-100 dark:border-slate-800/80 pb-3">
              <div>
                <span className="text-slate-400 font-light block text-xs">Table:</span>
                <span className="font-extrabold text-lg text-slate-800 dark:text-slate-100">
                  {formatTableNumber(activeNotification.tableName || activeNotification.tableId)}
                </span>
              </div>
              <div>
                <span className="text-slate-400 font-light block text-xs">Order No:</span>
                <span className="font-extrabold text-sm text-slate-800 dark:text-slate-100 font-mono">
                  {activeNotification.orderId}
                </span>
              </div>
            </div>

            {/* Source Counter Info */}
            <div className="border-b border-slate-100 dark:border-slate-800/80 pb-3">
              <span className="text-slate-400 font-light block text-xs">Received From:</span>
              <span className="font-extrabold text-sm text-slate-800 dark:text-slate-100">
                {getCounterDisplayName(activeNotification.sourceCounter)}
              </span>
            </div>

            {/* Items belonging to this counter */}
            <div>
              <span className="text-slate-400 font-light block text-xs mb-1.5">Items:</span>
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-955 border border-slate-100 dark:border-slate-850 font-mono text-xs space-y-1.5 text-slate-800 dark:text-slate-200 max-h-[160px] overflow-y-auto">
                {(activeNotification.items || []).map((item, idx) => {
                  const itemKitchen = item.kitchen;
                  const belongsToCurrent = !itemKitchen || getCounterForKitchen(itemKitchen) === counter;
                  return (
                    <div key={idx} className="flex items-center justify-between gap-1.5 py-1 border-b border-slate-100/50 dark:border-slate-800/50 last:border-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-amber-500 font-semibold">✓</span>
                        <span className="font-bold">{item.itemName}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="px-1.5 py-0.5 rounded-sm bg-slate-200 dark:bg-slate-800 font-bold text-[9px]">
                          Qty: {item.quantity}
                        </span>
                        {belongsToCurrent ? (
                          <button
                            onClick={handleAccept}
                            className="px-2 py-0.5 rounded-md bg-amber-500 hover:bg-amber-600 dark:bg-amber-400 dark:hover:bg-amber-300 dark:text-slate-950 text-white text-[9px] font-extrabold transition-colors cursor-pointer"
                          >
                            Accept
                          </button>
                        ) : (
                          <button
                            disabled
                            className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 text-[9px] font-extrabold cursor-not-allowed opacity-50"
                          >
                            Accepted
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Time Received */}
            <div className="flex justify-between items-center text-xs font-mono text-slate-500 dark:text-slate-400">
              <span className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-slate-400" /> Order Time:
              </span>
              <span className="font-bold">
                {new Date(activeNotification.createdAt).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit'
                })}
              </span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end">
            <button
              onClick={handleAccept}
              className="w-full py-3 rounded-2xl bg-amber-500 hover:bg-amber-600 dark:bg-amber-400 dark:text-slate-950 dark:hover:bg-amber-350 text-white text-sm font-bold shadow-md hover:shadow-lg transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer cursor-pointer"
            >
              <Check className="w-4 h-4" /> Accept Order
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
