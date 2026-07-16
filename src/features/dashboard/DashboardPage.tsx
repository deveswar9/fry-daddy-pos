import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { subscribeToTables, subscribeToPaymentNotifications, Table, PaymentNotification, seedFirestoreIfEmpty } from '@/firebase/services';
import { useAuth } from '@/context/AuthContext';
import { motion } from 'framer-motion';
import { 
  Users, 
  Trees, 
  Store, 
  CreditCard, 
  Clock, 
  Sparkles,
  Info,
  BellRing
} from 'lucide-react';

export const DashboardPage: React.FC = () => {
  const [tables, setTables] = useState<Table[]>([]);
  const [paymentNotifications, setPaymentNotifications] = useState<PaymentNotification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { counter } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    // Attempt to seed Firestore if empty
    seedFirestoreIfEmpty();

    const unsubscribe = subscribeToTables((data) => {
      setTables(data);
      setIsLoading(false);
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (!counter) return;

    const unsubscribe = subscribeToPaymentNotifications(counter, (notifications) => {
      setPaymentNotifications(notifications);
    });

    return unsubscribe;
  }, [counter]);

  const insideTables = tables.filter((t) => t.location === 'Inside');
  const outsideTables = tables.filter((t) => t.location === 'Outside');

  // Stats calculation
  const totalTables = tables.length;
  const occupiedCount = tables.filter((t) => t.status === 'Occupied' || t.status === 'Payment Pending').length;
  const pendingCount = tables.filter((t) => t.status === 'Payment Pending').length;
  const paidCount = tables.filter((t) => t.status === 'Paid').length;
  const cleaningCount = tables.filter((t) => t.status === 'Cleaning').length;

  const getStatusColor = (status: Table['status']) => {
    switch (status) {
      case 'Available':
        return 'border-emerald-500/20 bg-emerald-500/5 text-emerald-600 dark:text-emerald-400 dark:border-emerald-400/25 dark:bg-emerald-400/5';
      case 'Occupied':
        return 'border-amber-500/25 bg-amber-500/5 text-amber-600 dark:text-amber-400 dark:border-amber-400/25 dark:bg-amber-400/5';
      case 'Payment Pending':
        return 'border-rose-500/30 bg-rose-500/10 text-rose-600 dark:text-rose-400 dark:border-rose-400/30 dark:bg-rose-400/10 animate-pulse';
      case 'Paid':
        return 'border-indigo-500/25 bg-indigo-500/5 text-indigo-600 dark:text-indigo-400 dark:border-indigo-400/25 dark:bg-indigo-400/5';
      case 'Cleaning':
        return 'border-slate-500/20 bg-slate-500/5 text-slate-500 dark:text-slate-400 dark:border-slate-800 dark:bg-slate-900/30';
      default:
        return '';
    }
  };

  const getStatusLabel = (table: Table) => {
    if (table.status === 'Paid' && table.lastPaymentCollectedBy) {
      return `PAID (by ${table.lastPaymentCollectedBy})`;
    }
    return table.status;
  };

  const handleTableClick = (tableId: string) => {
    navigate(`/table/${tableId}`);
  };


  const formatNotificationTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };
  if (isLoading) {
    return (
      <div className="flex flex-col gap-6 py-6 animate-pulse">
        {/* Metric Skeletons */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-24 bg-slate-200 dark:bg-slate-900 rounded-3xl" />
          ))}
        </div>
        {/* Seating Area Skeletons */}
        <div className="h-96 bg-slate-200 dark:bg-slate-900 rounded-3xl" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8 pb-10">
      {/* Welcome Title */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">Seating Dashboard</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm font-light">
            Realtime dining layout. Select tables to manage bills and add items.
          </p>
        </div>
        
        {/* Quick status guide */}
        <div className="flex flex-wrap items-center gap-3 p-2 bg-slate-100 dark:bg-slate-900/60 rounded-2xl border border-slate-200/50 dark:border-slate-800/80 backdrop-blur-xs text-xs font-medium">
          <span className="flex items-center gap-1.5 px-2 py-1"><span className="w-2 h-2 rounded-full bg-emerald-500" /> Available</span>
          <span className="flex items-center gap-1.5 px-2 py-1"><span className="w-2 h-2 rounded-full bg-amber-500" /> Occupied</span>
          <span className="flex items-center gap-1.5 px-2 py-1"><span className="w-2 h-2 rounded-full bg-rose-500" /> Pending Bill</span>
          <span className="flex items-center gap-1.5 px-2 py-1"><span className="w-2 h-2 rounded-full bg-indigo-500" /> Paid</span>
          <span className="flex items-center gap-1.5 px-2 py-1"><span className="w-2 h-2 rounded-full bg-slate-400" /> Cleaning</span>
        </div>
      </div>

      {paymentNotifications.length > 0 && (
        <div className="rounded-3xl border border-indigo-500/25 bg-indigo-500/5 dark:bg-indigo-400/10 p-5 shadow-xs">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-indigo-500/10 text-indigo-500 rounded-xl">
              <BellRing className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold">Cross-Counter Payment Alerts</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-light">
                Items paid at the other counter that belong to Counter {counter} are listed here.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {paymentNotifications.slice(0, 4).map((notification) => (
              <button
                key={notification.id}
                onClick={() => navigate(`/table/${notification.tableId}`)}
                className="text-left rounded-2xl border border-indigo-500/20 bg-white/80 dark:bg-slate-950/60 p-4 hover:border-indigo-500/50 transition-colors cursor-pointer"
              >
                <div className="flex justify-between gap-3 text-xs text-slate-400 mb-2">
                  <span className="font-semibold text-indigo-600 dark:text-indigo-400">
                    Table {(() => {
                      const raw = notification.tableName || notification.tableId || '';
                      if (raw.startsWith('T')) return raw;
                      if (/^\d+$/.test(raw)) return 'T' + raw.padStart(2, '0');
                      return raw;
                    })()}
                  </span>
                  <span>{formatNotificationTime(notification.createdAt)}</span>
                </div>
                <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                  {notification.message || `Bill paid at Counter ${notification.paidByCounter} for: ${(notification.items || []).join(', ')}`}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                  Amount: ₹{notification.paidAmount ?? notification.total}
                </p>
              </button>
            ))}
          </div>
        </div>
      )}
      {/* Analytics Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <motion.div 
          whileHover={{ y: -2 }}
          className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/70 shadow-xs flex items-center justify-between"
        >
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Occupied Tables</span>
            <h3 className="text-3xl font-extrabold mt-1">{occupiedCount} <span className="text-sm font-medium text-slate-400">/ {totalTables}</span></h3>
          </div>
          <div className="p-3 bg-amber-500/10 text-amber-500 rounded-2xl">
            <Users className="w-6 h-6" />
          </div>
        </motion.div>

        <motion.div 
          whileHover={{ y: -2 }}
          className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/70 shadow-xs flex items-center justify-between"
        >
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Bills Pending</span>
            <h3 className="text-3xl font-extrabold mt-1 text-rose-500">{pendingCount}</h3>
          </div>
          <div className="p-3 bg-rose-500/10 text-rose-500 rounded-2xl">
            <CreditCard className="w-6 h-6" />
          </div>
        </motion.div>

        <motion.div 
          whileHover={{ y: -2 }}
          className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/70 shadow-xs flex items-center justify-between"
        >
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Tables Paid</span>
            <h3 className="text-3xl font-extrabold mt-1 text-indigo-500">{paidCount}</h3>
          </div>
          <div className="p-3 bg-indigo-500/10 text-indigo-500 rounded-2xl">
            <Sparkles className="w-6 h-6" />
          </div>
        </motion.div>

        <motion.div 
          whileHover={{ y: -2 }}
          className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/70 shadow-xs flex items-center justify-between"
        >
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">In Cleaning</span>
            <h3 className="text-3xl font-extrabold mt-1 text-slate-500">{cleaningCount}</h3>
          </div>
          <div className="p-3 bg-slate-500/10 text-slate-500 rounded-2xl">
            <Clock className="w-6 h-6" />
          </div>
        </motion.div>
      </div>

      {/* Seating Layout Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Inside Seating Section (B1 Primary Area) */}
        <div className="flex flex-col gap-4 p-6 sm:p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/70 shadow-xl relative overflow-hidden">
          {/* Subtle glow if active area */}
          {counter === 'B1' && (
            <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full blur-2xl pointer-events-none" />
          )}
          
          <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-emerald-500/10 text-emerald-500 rounded-xl">
                <Store className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-xl font-bold">🍽️ Restaurant Dining</h2>
                <p className="text-xs text-slate-400 font-light">Main Hall &bull; Managed by Restaurant Counter</p>
              </div>
            </div>
            {counter === 'B1' && (
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400">
                Primary
              </span>
            )}
          </div>

          <div className="grid grid-cols-3 gap-4 py-4">
            {insideTables.map((table) => (
              <motion.button
                key={table.id}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => handleTableClick(table.id)}
                className={`relative flex flex-col items-center justify-center p-6 rounded-2xl border text-center cursor-pointer transition-all duration-300 card-hover ${getStatusColor(
                  table.status
                )}`}
              >
                <span className="text-2xl font-extrabold tracking-tight">{table.number}</span>
                <span className="text-[10px] font-semibold tracking-wide uppercase mt-2.5 truncate max-w-full px-1">
                  {getStatusLabel(table)}
                </span>
                
                {/* Visual indicator for counter assignment */}
                {table.status === 'Payment Pending' && (
                  <div className="absolute -top-1.5 -right-1.5 flex h-4 w-4">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-4 w-4 bg-rose-500 text-[8px] text-white font-bold items-center justify-center">!</span>
                  </div>
                )}
              </motion.button>
            ))}
          </div>
        </div>

        {/* Outside Seating Section (B2 Primary Area) */}
        <div className="flex flex-col gap-4 p-6 sm:p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/70 shadow-xl relative overflow-hidden">
          {/* Subtle glow if active area */}
          {counter === 'B2' && (
            <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/5 rounded-full blur-2xl pointer-events-none" />
          )}

          <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-indigo-500/10 text-indigo-500 rounded-xl">
                <Trees className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-xl font-bold">🍔 Fast Food Dining</h2>
                <p className="text-xs text-slate-400 font-light">Open Air &bull; Managed by Fast Food Counter</p>
              </div>
            </div>
            {counter === 'B2' && (
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-500/10 border border-indigo-500/20 text-indigo-600 dark:text-indigo-400">
                Primary
              </span>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4 py-4">
            {outsideTables.map((table) => (
              <motion.button
                key={table.id}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => handleTableClick(table.id)}
                className={`relative flex flex-col items-center justify-center p-6 rounded-2xl border text-center cursor-pointer transition-all duration-300 card-hover ${getStatusColor(
                  table.status
                )}`}
              >
                <span className="text-2xl font-extrabold tracking-tight">{table.number}</span>
                <span className="text-[10px] font-semibold tracking-wide uppercase mt-2.5 truncate max-w-full px-1">
                  {getStatusLabel(table)}
                </span>

                {/* Visual indicator for counter assignment */}
                {table.status === 'Payment Pending' && (
                  <div className="absolute -top-1.5 -right-1.5 flex h-4 w-4">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-4 w-4 bg-rose-500 text-[8px] text-white font-bold items-center justify-center">!</span>
                  </div>
                )}
              </motion.button>
            ))}
          </div>
        </div>

      </div>

      {/* Info notice about walkie talkies */}
      <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-100/50 dark:bg-slate-900/30 flex items-start gap-3">
        <Info className="w-5 h-5 text-slate-400 shrink-0 mt-0.5" />
        <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-light">
          <strong>Realtime Sync active.</strong> When payment is collected at Restaurant Counter for any Inside table, it instantly registers as <em>PAID</em> on Fast Food Counter's dashboard.
        </p>
      </div>
    </div>
  );
};




