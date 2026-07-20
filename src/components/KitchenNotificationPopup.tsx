import React, { useEffect, useState, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import { 
  subscribeToKitchenNotifications, 
  acceptKitchenNotification,
  KitchenNotification 
} from '@/firebase/services';
import { Bell, ChefHat, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export const KitchenNotificationPopup: React.FC = () => {
  const { counter } = useAuth();
  const [queue, setQueue] = useState<KitchenNotification[]>([]);
  const [activeNotification, setActiveNotification] = useState<KitchenNotification | null>(null);
  const [isAccepting, setIsAccepting] = useState(false);

  // Keep track of locally accepted notification IDs to prevent flashing/duplicates
  const acceptedIdsRef = useRef<Set<string>>(new Set());

  // Subscribe to pending kitchen notifications for this counter
  useEffect(() => {
    if (!counter) return;

    const unsubscribe = subscribeToKitchenNotifications(counter, (notifications) => {
      // Filter out notifications we already accepted in this session
      const pending = notifications.filter(n => !acceptedIdsRef.current.has(n.id));
      setQueue(pending);
    });

    return unsubscribe;
  }, [counter]);

  // Handle active notification queue rotation
  useEffect(() => {
    if (queue.length > 0) {
      if (!activeNotification || !queue.some(n => n.id === activeNotification.id)) {
        setActiveNotification(queue[0]);
      }
    } else {
      setActiveNotification(null);
    }
  }, [queue, activeNotification]);

  // Continuous audio notification ringtone loop for NEW KITCHEN ORDER
  useEffect(() => {
    if (activeNotification) {
      const audio = new Audio('/notification_ring.mp3');
      audio.loop = true;

      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise.catch((err) => {
          console.log('Autoplay audio notification_ring.mp3 prevented by browser policy:', err);
        });
      }

      return () => {
        audio.pause();
        audio.currentTime = 0;
      };
    }
  }, [activeNotification]);

  const handleAccept = async () => {
    if (!activeNotification || !counter) return;

    setIsAccepting(true);
    const notificationId = activeNotification.id;

    try {
      // Add to locally accepted set to filter out instantly
      acceptedIdsRef.current.add(notificationId);
      
      // Perform database updates
      await acceptKitchenNotification(notificationId, counter);

      // Remove from queue locally
      setQueue((prev) => prev.filter(n => n.id !== notificationId));
      setActiveNotification(null);
    } catch (error) {
      console.error('Failed to accept kitchen notification:', error);
      acceptedIdsRef.current.delete(notificationId); // revert on error
    } finally {
      setIsAccepting(false);
    }
  };

  if (!activeNotification) return null;

  const formattedTime = new Date(activeNotification.createdAt).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit'
  });

  const sourceName = activeNotification.sourceCounter === 'B1' ? 'Restaurant Billing' : 'Fast Food Billing';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
      <AnimatePresence>
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 15 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 15 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
          className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 shadow-2xl rounded-3xl max-w-md w-full overflow-hidden flex flex-col"
        >
          {/* Header Banner */}
          <div className="px-6 py-5 bg-gradient-to-r from-indigo-500 to-purple-600 text-white flex items-center gap-3">
            <div className="p-2.5 bg-white/10 rounded-2xl animate-bounce">
              <Bell className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold tracking-tight">🔔 NEW KITCHEN ORDER</h2>
              <p className="text-xs text-white/80 font-light">Realtime kitchen ticket arrival</p>
            </div>
          </div>

          {/* Details Card */}
          <div className="p-6 flex-1 space-y-5">
            <div className="grid grid-cols-2 gap-4 bg-slate-50 dark:bg-slate-850 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 text-sm">
              <div>
                <span className="text-xs text-slate-400 font-light block mb-0.5">Table</span>
                <span className="font-extrabold text-slate-800 dark:text-white text-base">
                  {activeNotification.tableNumber}
                </span>
              </div>
              <div>
                <span className="text-xs text-slate-400 font-light block mb-0.5">Order Number</span>
                <span className="font-bold text-slate-700 dark:text-slate-300 font-mono">
                  {activeNotification.orderId.substring(0, 12)}
                </span>
              </div>
              <div className="col-span-2 border-t border-slate-150 dark:border-slate-800 pt-3">
                <span className="text-xs text-slate-400 font-light block mb-0.5">Received From</span>
                <span className="font-semibold text-slate-800 dark:text-white">
                  {sourceName}
                </span>
              </div>
            </div>

            {/* Items Section */}
            <div>
              <span className="text-xs text-slate-400 font-light block mb-2.5 uppercase tracking-wider font-semibold">Items Requested</span>
              <ul className="divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 rounded-2xl overflow-hidden">
                {activeNotification.items.map((item, idx) => (
                  <li key={idx} className="px-4 py-3 flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <div className="p-1 text-emerald-500 bg-emerald-500/10 rounded-md">
                        <Check className="w-3.5 h-3.5" />
                      </div>
                      <span className="font-semibold text-slate-800 dark:text-white">{item.itemName}</span>
                    </div>
                    <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-md font-extrabold text-xs">
                      x{item.quantity}
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Timestamp */}
            <div className="flex justify-between items-center text-xs font-light text-slate-400">
              <span>Requested Time</span>
              <span className="font-bold text-slate-500 dark:text-slate-300">{formattedTime}</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="px-6 py-4 bg-slate-50 dark:bg-slate-900/50 border-t border-slate-150 dark:border-slate-800 flex justify-end">
            <button
              onClick={handleAccept}
              disabled={isAccepting}
              className="w-full py-3.5 bg-emerald-500 hover:bg-emerald-600 dark:bg-emerald-450 dark:hover:bg-emerald-400 dark:text-slate-950 text-white rounded-2xl font-bold shadow-md cursor-pointer transition-all flex items-center justify-center gap-2 hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChefHat className="w-5 h-5" />
              {isAccepting ? 'Accepting...' : 'Accept Order'}
            </button>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
};
