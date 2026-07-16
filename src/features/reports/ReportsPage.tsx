import React, { useEffect, useState, useMemo } from 'react';
import { getReportsData, Order, OrderItem } from '@/firebase/services';
import { motion } from 'framer-motion';
import { 
  BarChart3, 
  TrendingUp, 
  DollarSign, 
  Clock, 
  ShoppingBag, 
  Utensils, 
  RefreshCw,
  Award,
  Users
} from 'lucide-react';

export const ReportsPage: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [items, setItems] = useState<OrderItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  useEffect(() => {
    setIsLoading(true);
    getReportsData()
      .then((data) => {
        setOrders(data.orders);
        setItems(data.items);
      })
      .catch((err) => console.error(err))
      .finally(() => setIsLoading(false));
  }, [refreshTrigger]);

  // Calculations
  const todayPaidOrders = orders.filter(o => o.paymentStatus === 'Paid');
  const todayPendingOrders = orders.filter(o => o.paymentStatus === 'Pending' || (o.status === 'Active' && o.paymentStatus === 'Unpaid'));

  const totalSalesVal = todayPaidOrders.reduce((acc, o) => acc + o.total, 0);
  const pendingSalesVal = todayPendingOrders.reduce((acc, o) => acc + o.total, 0);

  // Counter Splits
  const b1Revenue = todayPaidOrders.filter(o => o.collectedBy === 'B1').reduce((acc, o) => acc + o.total, 0);
  const b2Revenue = todayPaidOrders.filter(o => o.collectedBy === 'B2').reduce((acc, o) => acc + o.total, 0);

  // Average Order Size
  const avgOrderVal = todayPaidOrders.length > 0 ? (totalSalesVal / todayPaidOrders.length) : 0;

  // Item Popularity list (cached with useMemo)
  const popularItems = useMemo(() => {
    const counts: Record<string, { name: string; qty: number; revenue: number; category: string }> = {};
    
    items.forEach((item) => {
      if (!counts[item.menuItemId]) {
        counts[item.menuItemId] = { name: item.itemName, qty: 0, revenue: 0, category: item.category };
      }
      counts[item.menuItemId].qty += item.quantity;
      counts[item.menuItemId].revenue += item.price * item.quantity;
    });

    return Object.values(counts)
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 5); // top 5
  }, [items]);
  
  // Category splits (cached with useMemo)
  const categorySplit = useMemo(() => {
    const split: Record<string, number> = {};

    items.forEach((item) => {
      split[item.category] = (split[item.category] || 0) + item.price * item.quantity;
    });

    return Object.entries(split).map(([category, value]) => ({
      category,
      value
    }));
  }, [items]);

  if (isLoading) {
    return (
      <div className="flex flex-col gap-6 py-6 animate-pulse">
        <div className="h-10 w-48 bg-slate-200 dark:bg-slate-900 rounded-xl" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-28 bg-slate-200 dark:bg-slate-900 rounded-3xl" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="h-96 bg-slate-200 dark:bg-slate-900 rounded-3xl" />
          <div className="h-96 bg-slate-200 dark:bg-slate-900 rounded-3xl" />
        </div>
      </div>
    );
  }

  const categoryMax = Math.max(...categorySplit.map(c => c.value), 1);
  const itemMax = Math.max(...popularItems.map(i => i.qty), 1);

  return (
    <div className="flex flex-col gap-8 pb-12">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">Reports & Analytics</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm font-light">
            Realtime performance metrics, item sales, and counter splits.
          </p>
        </div>

        <button
          onClick={() => setRefreshTrigger(prev => prev + 1)}
          className="flex items-center gap-2 px-4 py-2 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-900 rounded-xl text-sm font-bold shadow-xs cursor-pointer transition-all"
        >
          <RefreshCw className="w-4 h-4 text-slate-400" />
          Refresh Stats
        </button>
      </div>

      {/* KPI summaries */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        
        {/* Sales Revenue */}
        <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/70 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Total Sales</span>
            <h3 className="text-3xl font-extrabold mt-1 text-emerald-500">₹{totalSalesVal}</h3>
            <p className="text-[10px] text-slate-400 font-light mt-1">Paid bills count: {todayPaidOrders.length}</p>
          </div>
          <div className="p-3 bg-emerald-500/10 text-emerald-500 rounded-2xl">
            <DollarSign className="w-6 h-6" />
          </div>
        </div>

        {/* Pending Sales */}
        <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/70 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Bills Pending</span>
            <h3 className="text-3xl font-extrabold mt-1 text-rose-500">₹{pendingSalesVal}</h3>
            <p className="text-[10px] text-slate-400 font-light mt-1">Uncollected tables: {todayPendingOrders.length}</p>
          </div>
          <div className="p-3 bg-rose-500/10 text-rose-500 rounded-2xl">
            <Clock className="w-6 h-6" />
          </div>
        </div>

        {/* Avg Ticket Size */}
        <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/70 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Avg Ticket Size</span>
            <h3 className="text-3xl font-extrabold mt-1">₹{Math.round(avgOrderVal)}</h3>
            <p className="text-[10px] text-slate-400 font-light mt-1">Value per customer checkout</p>
          </div>
          <div className="p-3 bg-indigo-500/10 text-indigo-500 rounded-2xl">
            <TrendingUp className="w-6 h-6" />
          </div>
        </div>

        {/* Combined metrics */}
        <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/70 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Counter Splits</span>
            <div className="mt-2 text-xs font-bold space-y-0.5">
              <div className="flex justify-between gap-6 text-emerald-600 dark:text-emerald-400">
                <span>Restaurant Counter:</span>
                <span>₹{b1Revenue}</span>
              </div>
              <div className="flex justify-between gap-6 text-indigo-650 dark:text-indigo-400">
                <span>Fast Food Counter:</span>
                <span>₹{b2Revenue}</span>
              </div>
            </div>
          </div>
          <div className="p-3 bg-slate-100 dark:bg-slate-800 text-slate-500 rounded-2xl">
            <Users className="w-6 h-6" />
          </div>
        </div>

      </div>

      {/* Grid splits */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Popular Items list (Left) */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/70 shadow-xl rounded-3xl p-6 relative overflow-hidden">
          <h2 className="text-lg font-bold pb-4 border-b border-slate-100 dark:border-slate-800 flex items-center gap-2">
            <Award className="w-5 h-5 text-amber-500" /> Popular Ordered Items
          </h2>

          {popularItems.length === 0 ? (
            <p className="text-sm text-slate-400 py-10 font-light text-center">No ordered items logged yet today.</p>
          ) : (
            <div className="mt-4 space-y-5">
              {popularItems.map((item, idx) => {
                const percentage = Math.round((item.qty / itemMax) * 100);
                return (
                  <div key={item.name} className="flex flex-col gap-1.5">
                    <div className="flex items-center justify-between text-xs font-bold">
                      <div className="flex items-center gap-2.5">
                        <span className="w-5 h-5 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 rounded-md flex items-center justify-center text-[10px] font-black">
                          {idx + 1}
                        </span>
                        <span className="text-sm font-semibold">{item.name}</span>
                        <span className="text-[10px] text-slate-400 font-light font-mono">({item.category})</span>
                      </div>
                      <span className="text-slate-700 dark:text-slate-300 font-extrabold">{item.qty} units &bull; ₹{item.revenue}</span>
                    </div>
                    {/* Visual Progress bar */}
                    <div className="w-full h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${percentage}%` }}
                        transition={{ duration: 0.8, ease: 'easeOut' }}
                        className="h-full bg-gradient-to-r from-amber-400 to-amber-500 rounded-full"
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Category Split progress (Right) */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/70 shadow-xl rounded-3xl p-6 relative overflow-hidden">
          <h2 className="text-lg font-bold pb-4 border-b border-slate-100 dark:border-slate-800 flex items-center gap-2">
            <Utensils className="w-5 h-5 text-indigo-500" /> Sales by Category
          </h2>

          <div className="mt-4 space-y-5">
            {categorySplit.map((cat) => {
              const percentage = Math.round((cat.value / categoryMax) * 100);
              return (
                <div key={cat.category} className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between text-xs font-bold">
                    <span className="text-sm font-semibold">{cat.category} Menu</span>
                    <span className="text-slate-700 dark:text-slate-300 font-extrabold">₹{cat.value}</span>
                  </div>
                  {/* Visual Progress bar */}
                  <div className="w-full h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${percentage}%` }}
                      transition={{ duration: 0.8, ease: 'easeOut' }}
                      className="h-full bg-gradient-to-r from-indigo-500 to-indigo-655 rounded-full"
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </div>

      {/* Completed Orders List */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/70 shadow-xl rounded-3xl p-6 relative overflow-hidden">
        <h2 className="text-lg font-bold pb-4 border-b border-slate-100 dark:border-slate-800 flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-slate-400" /> Completed Orders Log
        </h2>

        {todayPaidOrders.length === 0 ? (
          <p className="text-sm text-slate-400 py-10 font-light text-center">No completed billing events registered yet.</p>
        ) : (
          <div className="overflow-x-auto mt-2">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800 text-xs text-slate-400 font-bold uppercase tracking-wider">
                  <th className="py-3 px-4">Order ID</th>
                  <th className="py-3 px-4">Table</th>
                  <th className="py-3 px-4">Amount</th>
                  <th className="py-3 px-4">Collected By</th>
                  <th className="py-3 px-4">Paid Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                {todayPaidOrders.map((order) => (
                  <tr key={order.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-850/30">
                    <td className="py-3 px-4 font-mono text-xs text-slate-400">{order.id}</td>
                    <td className="py-3 px-4 font-bold">Table {order.tableId}</td>
                    <td className="py-3 px-4 font-extrabold text-slate-850 dark:text-slate-100">₹{order.total}</td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        order.collectedBy === 'B1' 
                          ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' 
                          : 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400'
                      }`}>
                        {order.collectedBy === 'B1' ? 'Restaurant Counter' : 'Fast Food Counter'}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-light text-slate-400 text-xs">
                      {order.paidAt ? new Date(order.paidAt).toLocaleTimeString() : 'N/A'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
};
