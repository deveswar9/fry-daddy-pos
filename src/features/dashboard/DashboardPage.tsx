import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  subscribeToTables, 
  subscribeToPaymentNotifications, 
  subscribeToAllKitchenNotifications,
  acceptKitchenNotification,
  completeKitchenNotification,
  Table, 
  PaymentNotification, 
  KitchenNotification,
  seedFirestoreIfEmpty 
} from '@/firebase/services';
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
  BellRing,
  ChefHat,
  CheckCircle2
} from 'lucide-react';

export const DashboardPage: React.FC = () => {
  const [tables, setTables] = useState<Table[]>([]);
  const [paymentNotifications, setPaymentNotifications] = useState<PaymentNotification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { counter } = useAuth();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<'seating' | 'kitchen'>('seating');
  const [kitchenNotifications, setKitchenNotifications] = useState<KitchenNotification[]>([]);
  const [isAcceptingId, setIsAcceptingId] = useState<string | null>(null);
  const [isCompletingId, setIsCompletingId] = useState<string | null>(null);

  useEffect(() => {
    if (!counter) return;

    const unsubscribe = subscribeToAllKitchenNotifications(counter, (notifications) => {
      setKitchenNotifications(notifications);
    });

    return unsubscribe;
  }, [counter]);

  const handleAcceptKitchenRequest = async (id: string) => {
    if (!counter) return;
    setIsAcceptingId(id);
    try {
      await acceptKitchenNotification(id, counter);
    } catch (e) {
      console.error(e);
    } finally {
      setIsAcceptingId(null);
    }
  };

  const handleCompleteKitchenRequest = async (id: string) => {
    if (!counter) return;
    setIsCompletingId(id);
    try {
      await completeKitchenNotification(id, counter);
    } catch (e) {
      console.error(e);
    } finally {
      setIsCompletingId(null);
    }
  };

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
  const diningTables = outsideTables.filter(t => t.id.startsWith('A'));
  const onlineTables = outsideTables.filter(t => t.id !== 'ONLINE_ORDERS' && (t.id.startsWith('ONLINE') || t.number.toLowerCase().includes('online')));
  const parcelTables = outsideTables.filter(t => t.id !== 'PARCEL_ORDERS' && (t.id.startsWith('PARCEL') || t.number.toLowerCase().includes('parcel')));

  const renderPreparingOrders = () => {
    const acceptedNotifs = kitchenNotifications.filter(n => n.status === 'Accepted');
    const counterLabel = counter === 'B1' ? 'Restaurant Counter' : 'Fast Food Counter';
    return (
      <div className="flex flex-col gap-4 p-6 sm:p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/70 shadow-xl relative overflow-hidden h-full flex-1">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-emerald-500/10 text-emerald-500 rounded-xl">
              <ChefHat className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold">👨‍🍳 Preparing Orders</h2>
              <p className="text-xs text-slate-400 font-light">Tickets accepted and in preparation at {counterLabel}</p>
            </div>
          </div>
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400">
            {acceptedNotifs.length} Preparing
          </span>
        </div>

        {acceptedNotifs.length === 0 ? (
          <div className="text-center py-16 text-slate-400 flex flex-col items-center justify-center gap-2 flex-1">
            <ChefHat className="w-12 h-12 text-slate-300 dark:text-slate-800 animate-pulse" />
            <p className="text-sm font-medium">No active kitchen orders</p>
            <p className="text-xs font-light">Go to the "Kitchen Requests" tab to accept pending tickets.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-4 py-2 flex-1 min-h-0 overflow-y-auto pr-1">
            {acceptedNotifs.map((notif) => (
              <div key={notif.id} className="p-3.5 rounded-2xl border border-slate-150 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30 flex flex-col gap-2 shadow-xs">
                {/* Header: Table Name, Complete Order Button & Accepted Time */}
                <div className="flex justify-between items-center pb-1.5 border-b border-dashed border-slate-200 dark:border-slate-800 gap-2 flex-wrap">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-black text-slate-800 dark:text-white">
                      {notif.tableNumber.toLowerCase().includes('online') || notif.tableNumber.toLowerCase().includes('parcel') ? notif.tableNumber : `Table ${notif.tableNumber}`}
                    </span>
                    <button
                      onClick={() => handleCompleteKitchenRequest(notif.id)}
                      disabled={isCompletingId === notif.id}
                      className="px-2.5 py-1 bg-emerald-500 hover:bg-emerald-600 dark:bg-emerald-450 dark:hover:bg-emerald-350 text-slate-950 text-[11px] font-extrabold rounded-lg shadow-xs transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      {isCompletingId === notif.id ? 'Completing...' : 'Complete Order'}
                    </button>
                  </div>
                  <span className="text-[10px] text-slate-400 font-bold ml-auto">
                    Accepted: {notif.acceptedAt ? new Date(notif.acceptedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-'}
                  </span>
                </div>

                {/* Items List */}
                <div className="py-0.5">
                  <ul className="space-y-0.5 text-xs font-semibold">
                    {notif.items.map((item, idx) => (
                      <li key={idx} className="flex justify-between text-slate-700 dark:text-slate-350">
                        <span>{item.itemName}</span>
                        <span className="text-slate-900 dark:text-white">x{item.quantity}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Status Indicator Bar */}
                <div className="flex items-center justify-between text-[10px] text-slate-400 font-bold border-t border-dashed border-slate-200 dark:border-slate-800 pt-1.5">
                  <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    Preparing
                  </span>
                  <span>Accepted by {notif.acceptedBy === 'B1' ? 'Restaurant' : 'Fast Food'}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

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


  const isToday = (timestamp?: number | null) => {
    if (!timestamp) return false;
    const date = new Date(timestamp);
    const today = new Date();
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  };

  const formatNotificationTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };
  if (isLoading) {
    return (
      <div className="flex flex-col gap-6 py-6 animate-pulse">
        {/* Metric Skeletons */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[...Array(2)].map((_, i) => (
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
          <h1 className="text-3xl font-extrabold tracking-tight">Dashboard</h1>
        </div>
        
        {/* Quick status guide */}
        <div className="flex flex-wrap items-center gap-3 p-2 bg-slate-100 dark:bg-slate-900/60 rounded-2xl border border-slate-200/50 dark:border-slate-800/80 backdrop-blur-xs text-xs font-medium">
          <span className="flex items-center gap-1.5 px-2 py-1"><span className="w-2 h-2 rounded-full bg-emerald-500" /> Available</span>
          <span className="flex items-center gap-1.5 px-2 py-1"><span className="w-2 h-2 rounded-full bg-amber-500" /> Occupied</span>
          <span className="flex items-center gap-1.5 px-2 py-1"><span className="w-2 h-2 rounded-full bg-rose-500" /> Pending Bill</span>
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
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
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
      </div>

      {/* Tabs Switcher */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 gap-6">
        <button
          onClick={() => setActiveTab('seating')}
          className={`px-4 py-3 text-sm font-bold border-b-2 transition-colors cursor-pointer ${
            activeTab === 'seating'
              ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          Seating Layout
        </button>
        <button
          onClick={() => setActiveTab('kitchen')}
          className={`px-4 py-3 text-sm font-bold border-b-2 transition-colors cursor-pointer flex items-center gap-2 ${
            activeTab === 'kitchen'
              ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          Kitchen Requests
          {kitchenNotifications.filter(n => n.status === 'Pending').length > 0 && (
            <span className="px-2 py-0.5 text-[10px] font-extrabold rounded-full bg-rose-500 text-white animate-pulse">
              {kitchenNotifications.filter(n => n.status === 'Pending').length}
            </span>
          )}
        </button>
      </div>

      {activeTab === 'seating' ? (
        <>
          {/* Seating Layout Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            
            {/* Column 1: Dining (Restaurant Dining if B1, Fast Food Dining if B2) */}
            {counter === 'B1' ? (
              /* Inside Seating Section (B1 Primary Area) */
              <div className="flex flex-col gap-4 p-6 sm:p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/70 shadow-xl relative overflow-hidden">
                {/* Subtle glow if active area */}
                <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full blur-2xl pointer-events-none" />
                
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
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400">
                    Primary
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-4 py-4">
                  {insideTables.map((table) => (
                    <motion.button
                      key={table.id}
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => handleTableClick(table.id)}
                      className={`relative flex flex-col items-center justify-center p-6 rounded-2xl border text-center transition-all duration-300 cursor-pointer card-hover ${getStatusColor(table.status)}`}
                    >
                      <span className={table.number.length > 5 ? "text-base sm:text-lg font-black tracking-tight leading-tight" : "text-2xl font-extrabold tracking-tight"}>
                        {table.number}
                      </span>
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
            ) : (
              /* Outside Seating Section (B2 Primary Area) */
              <div className="flex flex-col gap-6 p-6 sm:p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/70 shadow-xl relative overflow-hidden">
                {/* Subtle glow if active area */}
                <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/5 rounded-full blur-2xl pointer-events-none" />

                <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 bg-indigo-500/10 text-indigo-500 rounded-xl">
                      <Trees className="w-5 h-5" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold">🍔 Fast Food Counter</h2>
                      <p className="text-xs text-slate-400 font-light">Open Air &bull; Online Orders &bull; Parcels</p>
                    </div>
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-500/10 border border-indigo-500/20 text-indigo-600 dark:text-indigo-400">
                    Primary
                  </span>
                </div>

                {/* 1. Open Air Tables (A1 - A6) */}
                <div className="flex flex-col gap-2">
                  <span className="text-xs font-extrabold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                    <span>🪑</span> Open Air Tables
                  </span>
                  <div className="grid grid-cols-3 gap-3">
                    {diningTables.map((table) => (
                      <motion.button
                        key={table.id}
                        whileHover={{ scale: 1.03 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => handleTableClick(table.id)}
                        className={`relative flex flex-col items-center justify-center p-4 rounded-2xl border text-center transition-all duration-300 cursor-pointer card-hover ${getStatusColor(table.status)}`}
                      >
                        <span className="text-2xl font-extrabold tracking-tight">{table.number}</span>
                        <span className="text-[10px] font-semibold tracking-wide uppercase mt-1.5 truncate max-w-full px-1">
                          {getStatusLabel(table)}
                        </span>

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

                {/* 2. Online Orders (Online order 1 - 4) */}
                <div className="flex flex-col gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                  <span className="text-xs font-extrabold uppercase tracking-wider text-indigo-500 dark:text-indigo-400 flex items-center gap-1.5">
                    <span>📲</span> Online Orders
                  </span>
                  <div className="grid grid-cols-2 gap-3">
                    {onlineTables.map((table) => (
                      <motion.button
                        key={table.id}
                        whileHover={{ scale: 1.03 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => handleTableClick(table.id)}
                        className={`relative flex flex-col items-center justify-center p-4 rounded-2xl border text-center transition-all duration-300 cursor-pointer card-hover ${getStatusColor(table.status)}`}
                      >
                        <span className="text-sm font-black tracking-tight leading-tight">{table.number}</span>
                        <span className="text-[10px] font-semibold tracking-wide uppercase mt-1 truncate max-w-full px-1">
                          {getStatusLabel(table)}
                        </span>

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

                {/* 3. Parcel / Takeaway Orders (Parcel order 1 - 4) */}
                <div className="flex flex-col gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                  <span className="text-xs font-extrabold uppercase tracking-wider text-amber-500 dark:text-amber-400 flex items-center gap-1.5">
                    <span>📦</span> Takeaway / Parcel Orders
                  </span>
                  <div className="grid grid-cols-2 gap-3">
                    {parcelTables.map((table) => (
                      <motion.button
                        key={table.id}
                        whileHover={{ scale: 1.03 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => handleTableClick(table.id)}
                        className={`relative flex flex-col items-center justify-center p-4 rounded-2xl border text-center transition-all duration-300 cursor-pointer card-hover ${getStatusColor(table.status)}`}
                      >
                        <span className="text-sm font-black tracking-tight leading-tight">{table.number}</span>
                        <span className="text-[10px] font-semibold tracking-wide uppercase mt-1 truncate max-w-full px-1">
                          {getStatusLabel(table)}
                        </span>

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
            )}

            {/* Column 2: Preparing Orders */}
            {renderPreparingOrders()}

          </div>

          {/* Info notice about walkie talkies */}
          <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-100/50 dark:bg-slate-900/30 flex items-start gap-3">
            <Info className="w-5 h-5 text-slate-400 shrink-0 mt-0.5" />
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-light">
              <strong>Realtime Sync active.</strong> When payment is collected at Restaurant Counter for any Inside table, it instantly registers as <em>PAID</em> on Fast Food Counter's dashboard.
            </p>
          </div>
        </>
      ) : (
        /* Kitchen Requests Tab View */
        <div className="flex flex-col gap-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Pending Requests Column */}
            <div className="flex flex-col gap-4 p-6 sm:p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/70 shadow-xl relative overflow-hidden">
              <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-amber-500/10 text-amber-500 rounded-xl">
                    <Clock className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold">⚠️ Pending Orders</h2>
                    <p className="text-xs text-slate-400 font-light">New tickets awaiting kitchen acceptance</p>
                  </div>
                </div>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400">
                  {kitchenNotifications.filter(n => n.status === 'Pending').length} Tickets
                </span>
              </div>

              {kitchenNotifications.filter(n => n.status === 'Pending').length === 0 ? (
                <div className="text-center py-16 text-slate-400 flex flex-col items-center justify-center gap-2">
                  <CheckCircle2 className="w-12 h-12 text-slate-300 dark:text-slate-800" />
                  <p className="text-sm font-medium">All caught up!</p>
                  <p className="text-xs font-light">No pending kitchen tickets.</p>
                </div>
              ) : (
                <div className="flex flex-col gap-4 py-2 max-h-[500px] overflow-y-auto pr-1">
                  {kitchenNotifications.filter(n => n.status === 'Pending').map((notif) => (
                    <div key={notif.id} className="p-5 rounded-2xl border border-slate-150 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30 flex flex-col gap-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <span className="text-xs text-slate-400 block">Table</span>
                          <span className="text-lg font-black text-slate-800 dark:text-white">Table {notif.tableNumber}</span>
                        </div>
                        <span className="text-xs text-slate-400">{new Date(notif.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>

                      <div className="border-t border-dashed border-slate-200 dark:border-slate-800 pt-2">
                        <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Items</span>
                        <ul className="space-y-1 text-sm font-semibold">
                          {notif.items.map((item, idx) => (
                            <li key={idx} className="flex justify-between text-slate-700 dark:text-slate-350">
                              <span>{item.itemName}</span>
                              <span className="text-slate-900 dark:text-white">x{item.quantity}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      <button
                        onClick={() => handleAcceptKitchenRequest(notif.id)}
                        disabled={isAcceptingId === notif.id}
                        className="mt-2 w-full py-2.5 bg-emerald-500 hover:bg-emerald-650 dark:bg-emerald-450 dark:hover:bg-emerald-350 text-slate-950 dark:text-slate-950 text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <ChefHat className="w-4 h-4" />
                        {isAcceptingId === notif.id ? 'Accepting...' : 'Accept Order'}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Accepted / Completed Requests Column */}
            {(() => {
              const completedTodayNotifs = kitchenNotifications.filter(
                n => n.status === 'Completed' && isToday(n.completedAt || n.createdAt)
              );
              return (
                <div className="flex flex-col gap-4 p-6 sm:p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/70 shadow-xl relative overflow-hidden">
                  <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 bg-emerald-500/10 text-emerald-500 rounded-xl">
                        <ChefHat className="w-5 h-5" />
                      </div>
                      <div>
                        <h2 className="text-xl font-bold">👨‍🍳 Completed Orders</h2>
                        <p className="text-xs text-slate-400 font-light">Today's tickets accepted &bull; Auto-resets daily</p>
                      </div>
                    </div>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400">
                      {completedTodayNotifs.length} Completed Today
                    </span>
                  </div>

                  {completedTodayNotifs.length === 0 ? (
                    <div className="text-center py-16 text-slate-400 flex flex-col items-center justify-center gap-2">
                      <ChefHat className="w-12 h-12 text-slate-300 dark:text-slate-800" />
                      <p className="text-sm font-medium">No completed orders today yet</p>
                      <p className="text-xs font-light">Tomorrow this list will start completely fresh automatically.</p>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-4 py-4 max-h-[500px] overflow-y-auto pr-1">
                      {completedTodayNotifs.map((notif) => (
                        <div key={notif.id} className="p-5 rounded-2xl border border-slate-150 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30 flex flex-col gap-3">
                          <div className="flex justify-between items-start">
                            <div>
                              <span className="text-xs text-slate-400 block font-light">Table</span>
                              <span className="text-lg font-black text-slate-800 dark:text-white">
                                {notif.tableNumber.toLowerCase().includes('online') || notif.tableNumber.toLowerCase().includes('parcel') ? notif.tableNumber : `Table ${notif.tableNumber}`}
                              </span>
                            </div>
                            <div className="text-right">
                              <span className="text-xs text-slate-400 block font-light">Completed at</span>
                              <span className="text-xs font-bold text-slate-600 dark:text-slate-300">
                                {notif.completedAt ? new Date(notif.completedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-'}
                              </span>
                            </div>
                          </div>

                          <div className="border-t border-dashed border-slate-200 dark:border-slate-800 pt-2">
                            <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Items</span>
                            <ul className="space-y-1 text-sm font-semibold">
                              {notif.items.map((item, idx) => (
                                <li key={idx} className="flex justify-between text-slate-700 dark:text-slate-350">
                                  <span>{item.itemName}</span>
                                  <span className="text-slate-900 dark:text-white">x{item.quantity}</span>
                                </li>
                              ))}
                            </ul>
                          </div>

                          <div className="mt-2 flex items-center justify-between text-[10px] text-slate-400 bg-emerald-500/5 px-3 py-1.5 rounded-xl border border-emerald-500/10 font-bold">
                            <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Completed Today</span>
                            <span>Completed by Counter {notif.completedBy === 'B1' ? 'Restaurant' : 'Fast Food'}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
};




