import React, { useEffect, useState, useMemo } from 'react';
import { getReportsData, Order, OrderItem } from '@/firebase/services';
import { motion } from 'framer-motion';
import { 
  BarChart3, 
  DollarSign, 
  Clock, 
  Utensils, 
  RefreshCw,
  Award,
  Users,
  Calendar,
  Download,
  Printer
} from 'lucide-react';

type DateFilterMode = 'today' | 'yesterday' | 'week' | 'custom';

export const ReportsPage: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [items, setItems] = useState<OrderItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Date Filtering State
  const [filterMode, setFilterMode] = useState<DateFilterMode>('today');
  const [customStartDate, setCustomStartDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return d.toISOString().slice(0, 10);
  });
  const [customEndDate, setCustomEndDate] = useState<string>(() => {
    return new Date().toISOString().slice(0, 10);
  });

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

  // Date boundaries calculation (in ms)
  const dateRangeBounds = useMemo(() => {
    const now = new Date();
    
    if (filterMode === 'today') {
      const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
      const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
      return { startMs: start.getTime(), endMs: end.getTime() };
    }

    if (filterMode === 'yesterday') {
      const y = new Date(now);
      y.setDate(y.getDate() - 1);
      const start = new Date(y.getFullYear(), y.getMonth(), y.getDate(), 0, 0, 0, 0);
      const end = new Date(y.getFullYear(), y.getMonth(), y.getDate(), 23, 59, 59, 999);
      return { startMs: start.getTime(), endMs: end.getTime() };
    }

    if (filterMode === 'week') {
      const w = new Date(now);
      w.setDate(w.getDate() - 6); // Last 7 days
      const start = new Date(w.getFullYear(), w.getMonth(), w.getDate(), 0, 0, 0, 0);
      const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
      return { startMs: start.getTime(), endMs: end.getTime() };
    }

    // Custom
    const start = customStartDate ? new Date(`${customStartDate}T00:00:00`).getTime() : 0;
    const end = customEndDate ? new Date(`${customEndDate}T23:59:59`).getTime() : Infinity;
    return { startMs: start, endMs: end };
  }, [filterMode, customStartDate, customEndDate]);

  // Filtered Orders based on date bounds
  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      const timestamp = o.paidAt || o.createdAt;
      if (!timestamp) return true;
      return timestamp >= dateRangeBounds.startMs && timestamp <= dateRangeBounds.endMs;
    });
  }, [orders, dateRangeBounds]);

  // Filtered Order Items based on filtered orders
  const filteredOrderIds = useMemo(() => new Set(filteredOrders.map(o => o.id)), [filteredOrders]);
  
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      if (item.orderId && filteredOrderIds.has(item.orderId)) return true;
      if (item.createdAt) {
        return item.createdAt >= dateRangeBounds.startMs && item.createdAt <= dateRangeBounds.endMs;
      }
      return false;
    });
  }, [items, filteredOrderIds, dateRangeBounds]);

  // Metric Calculations
  const paidOrders = useMemo(() => filteredOrders.filter(o => o.paymentStatus === 'Paid'), [filteredOrders]);
  const pendingOrders = useMemo(() => filteredOrders.filter(o => o.paymentStatus === 'Pending' || (o.status === 'Active' && o.paymentStatus === 'Unpaid')), [filteredOrders]);

  const totalSalesVal = useMemo(() => paidOrders.reduce((acc, o) => acc + o.total, 0), [paidOrders]);
  const pendingSalesVal = useMemo(() => pendingOrders.reduce((acc, o) => acc + o.total, 0), [pendingOrders]);

  const b1Revenue = useMemo(() => paidOrders.filter(o => o.collectedBy === 'B1').reduce((acc, o) => acc + o.total, 0), [paidOrders]);
  const b2Revenue = useMemo(() => paidOrders.filter(o => o.collectedBy === 'B2').reduce((acc, o) => acc + o.total, 0), [paidOrders]);

  const popularItems = useMemo(() => {
    const counts: Record<string, { name: string; qty: number; revenue: number; category: string }> = {};
    
    filteredItems.forEach((item) => {
      const key = item.menuItemId || item.itemName;
      if (!counts[key]) {
        counts[key] = { name: item.itemName, qty: 0, revenue: 0, category: item.category };
      }
      counts[key].qty += item.quantity;
      counts[key].revenue += item.price * item.quantity;
    });

    return Object.values(counts)
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 5);
  }, [filteredItems]);

  const categorySplit = useMemo(() => {
    const split: Record<string, number> = {};

    filteredItems.forEach((item) => {
      split[item.category] = (split[item.category] || 0) + item.price * item.quantity;
    });

    return Object.entries(split).map(([category, value]) => ({
      category,
      value
    }));
  }, [filteredItems]);

  // CSV Export Handler
  const handleExportCSV = () => {
    if (paidOrders.length === 0) {
      alert('No completed orders available in the selected date range to export.');
      return;
    }

    const headers = ['Order ID', 'Table', 'Amount (INR)', 'Collected By', 'Paid Timestamp'];
    const rows = paidOrders.map(o => [
      `"${o.id}"`,
      `"Table ${o.tableId}"`,
      `"${o.total}"`,
      `"${o.collectedBy === 'B1' ? 'Restaurant Counter' : 'Fast Food Counter'}"`,
      `"${o.paidAt ? new Date(o.paidAt).toLocaleString() : 'N/A'}"`
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `fry_daddy_sales_${filterMode}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Print EOD Summary Handler
  const handlePrintEOD = () => {
    window.print();
  };

  if (isLoading) {
    return (
      <div className="flex flex-col gap-6 py-6 animate-pulse">
        <div className="h-10 w-48 bg-slate-200 dark:bg-slate-900 rounded-xl" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[...Array(3)].map((_, i) => (
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
      {/* Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 print:hidden">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">Reports & Analytics</h1>
          <p className="text-slate-400 text-xs font-light mt-1">
            Realtime sales performance, counter breakdowns, and historical logs
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => setRefreshTrigger(prev => prev + 1)}
            className="flex items-center gap-2 px-3.5 py-2 border border-slate-200/40 dark:border-slate-800/40 hover:bg-white/40 dark:hover:bg-slate-950/20 rounded-xl text-xs font-bold shadow-xs cursor-pointer transition-all"
            title="Refresh statistics"
          >
            <RefreshCw className="w-3.5 h-3.5 text-slate-400" />
            Refresh
          </button>

          <button
            onClick={handleExportCSV}
            className="flex items-center gap-2 px-3.5 py-2 border border-blue-500/30 bg-blue-500/10 text-blue-600 dark:text-blue-400 hover:bg-blue-500/20 rounded-xl text-xs font-bold shadow-xs cursor-pointer transition-all"
            title="Export completed orders to CSV"
          >
            <Download className="w-3.5 h-3.5" />
            Export CSV
          </button>

          <button
            onClick={handlePrintEOD}
            className="flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 dark:bg-blue-400 dark:text-slate-950 dark:hover:bg-blue-350 text-white rounded-xl text-xs font-bold shadow-md cursor-pointer transition-all"
            title="Print or save PDF report"
          >
            <Printer className="w-3.5 h-3.5" />
            Print EOD Summary
          </button>
        </div>
      </div>

      {/* Date Range Filter Bar */}
      <div className="glass-card border border-slate-200/40 dark:border-slate-850/40 p-4 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4 print:hidden">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-blue-500" />
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Date Filter:</span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {(['today', 'yesterday', 'week', 'custom'] as DateFilterMode[]).map((mode) => (
            <button
              key={mode}
              onClick={() => setFilterMode(mode)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold capitalize transition-all cursor-pointer ${
                filterMode === mode
                  ? 'bg-blue-500 text-white dark:bg-blue-400 dark:text-slate-950 shadow-sm'
                  : 'bg-white/40 dark:bg-slate-950/20 text-slate-500 dark:text-slate-400 border border-slate-200/40 dark:border-slate-850/40 hover:bg-white/60 dark:hover:bg-slate-900/30'
              }`}
            >
              {mode === 'today' ? 'Today' : mode === 'yesterday' ? 'Yesterday' : mode === 'week' ? 'This Week' : 'Custom Range'}
            </button>
          ))}
        </div>

        {filterMode === 'custom' && (
          <div className="flex items-center gap-2 text-xs">
            <input
              type="date"
              value={customStartDate}
              onChange={(e) => setCustomStartDate(e.target.value)}
              className="px-3 py-1.5 rounded-xl glass-input text-xs"
            />
            <span className="text-slate-400">to</span>
            <input
              type="date"
              value={customEndDate}
              onChange={(e) => setCustomEndDate(e.target.value)}
              className="px-3 py-1.5 rounded-xl glass-input text-xs"
            />
          </div>
        )}
      </div>

      {/* KPI Summaries */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
        {/* Sales Revenue */}
        <div className="p-5 rounded-3xl glass-card border border-slate-200/40 dark:border-slate-850/40 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Total Sales</span>
            <h3 className="text-3xl font-extrabold mt-1 text-blue-500">₹{totalSalesVal}</h3>
            <p className="text-[10px] text-slate-400 font-light mt-1">Paid bills count: {paidOrders.length}</p>
          </div>
          <div className="p-3 bg-blue-500/10 text-blue-500 rounded-2xl">
            <DollarSign className="w-6 h-6" />
          </div>
        </div>

        {/* Pending Sales */}
        <div className="p-5 rounded-3xl glass-card border border-slate-200/40 dark:border-slate-850/40 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Bills Pending</span>
            <h3 className="text-3xl font-extrabold mt-1 text-rose-500">₹{pendingSalesVal}</h3>
            <p className="text-[10px] text-slate-400 font-light mt-1">Uncollected tables: {pendingOrders.length}</p>
          </div>
          <div className="p-3 bg-rose-500/10 text-rose-500 rounded-2xl">
            <Clock className="w-6 h-6" />
          </div>
        </div>

        {/* Counter Splits */}
        <div className="p-5 rounded-3xl glass-card border border-slate-200/40 dark:border-slate-850/40 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Counter Splits</span>
            <div className="mt-2 text-xs font-bold space-y-0.5">
              <div className="flex justify-between gap-6 text-blue-600 dark:text-blue-400">
                <span>Restaurant Counter:</span>
                <span>₹{b1Revenue}</span>
              </div>
              <div className="flex justify-between gap-6 text-slate-600 dark:text-slate-400">
                <span>Fast Food Counter:</span>
                <span>₹{b2Revenue}</span>
              </div>
            </div>
          </div>
          <div className="p-3 bg-white/30 dark:bg-slate-950/20 text-slate-500 rounded-2xl">
            <Users className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Grid splits */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Popular Items list (Left) */}
        <div className="glass-card border border-slate-200/40 dark:border-slate-850/40 shadow-xl rounded-3xl p-6 relative overflow-hidden">
          <h2 className="text-lg font-bold pb-4 border-b border-slate-200/40 dark:border-slate-800/40 flex items-center gap-2">
            <Award className="w-5 h-5 text-amber-500" /> Popular Ordered Items
          </h2>

          {popularItems.length === 0 ? (
            <p className="text-sm text-slate-400 py-10 font-light text-center">No ordered items logged in this date range.</p>
          ) : (
            <div className="mt-4 space-y-5">
              {popularItems.map((item, idx) => {
                const percentage = Math.round((item.qty / itemMax) * 100);
                return (
                  <div key={item.name} className="flex flex-col gap-1.5">
                    <div className="flex items-center justify-between text-xs font-bold">
                      <div className="flex items-center gap-2.5">
                        <span className="w-5 h-5 bg-white/30 dark:bg-slate-800/40 text-slate-500 dark:text-slate-400 rounded-md flex items-center justify-center text-[10px] font-black">
                          {idx + 1}
                        </span>
                        <span className="text-sm font-semibold">{item.name}</span>
                        <span className="text-[10px] text-slate-400 font-light font-mono">({item.category})</span>
                      </div>
                      <span className="text-slate-700 dark:text-slate-300 font-extrabold">{item.qty} units &bull; ₹{item.revenue}</span>
                    </div>
                    {/* Visual Progress bar */}
                    <div className="w-full h-2.5 bg-white/20 dark:bg-slate-950/30 rounded-full overflow-hidden">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${percentage}%` }}
                        transition={{ duration: 0.8, ease: 'easeOut' }}
                        className="h-full bg-gradient-to-r from-blue-400 to-blue-500 rounded-full"
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Category Split progress (Right) */}
        <div className="glass-card border border-slate-200/40 dark:border-slate-850/40 shadow-xl rounded-3xl p-6 relative overflow-hidden">
          <h2 className="text-lg font-bold pb-4 border-b border-slate-200/40 dark:border-slate-800/40 flex items-center gap-2">
            <Utensils className="w-5 h-5 text-indigo-500" /> Sales by Category
          </h2>

          <div className="mt-4 space-y-5">
            {categorySplit.length === 0 ? (
              <p className="text-sm text-slate-400 py-10 font-light text-center">No category sales logged in this date range.</p>
            ) : (
              categorySplit.map((cat) => {
                const percentage = Math.round((cat.value / categoryMax) * 100);
                return (
                  <div key={cat.category} className="flex flex-col gap-1.5">
                    <div className="flex items-center justify-between text-xs font-bold">
                      <span className="text-sm font-semibold">{cat.category} Menu</span>
                      <span className="text-slate-700 dark:text-slate-300 font-extrabold">₹{cat.value}</span>
                    </div>
                    {/* Visual Progress bar */}
                    <div className="w-full h-2.5 bg-white/20 dark:bg-slate-950/30 rounded-full overflow-hidden">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${percentage}%` }}
                        transition={{ duration: 0.8, ease: 'easeOut' }}
                        className="h-full bg-gradient-to-r from-indigo-500 to-indigo-600 rounded-full"
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Completed Orders List */}
      <div className="glass-card border border-slate-200/40 dark:border-slate-850/40 shadow-xl rounded-3xl p-6 relative overflow-hidden">
        <h2 className="text-lg font-bold pb-4 border-b border-slate-200/40 dark:border-slate-800/40 flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-slate-400" /> Completed Orders Log
        </h2>

        {paidOrders.length === 0 ? (
          <p className="text-sm text-slate-400 py-10 font-light text-center">No completed billing events registered in this date range.</p>
        ) : (
          <div className="overflow-x-auto mt-2">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="border-b border-slate-200/40 dark:border-slate-800/40 text-xs text-slate-400 font-bold uppercase tracking-wider">
                  <th className="py-3 px-4">Order ID</th>
                  <th className="py-3 px-4">Table</th>
                  <th className="py-3 px-4">Amount</th>
                  <th className="py-3 px-4">Collected By</th>
                  <th className="py-3 px-4">Paid Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200/40 dark:divide-slate-800/45 font-medium">
                {paidOrders.map((order) => (
                  <tr key={order.id} className="hover:bg-white/40 dark:hover:bg-slate-950/20">
                    <td className="py-3 px-4 font-mono text-xs text-slate-400">{order.id}</td>
                    <td className="py-3 px-4 font-bold">Table {order.tableId}</td>
                    <td className="py-3 px-4 font-extrabold text-slate-800 dark:text-slate-100">₹{order.total}</td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        order.collectedBy === 'B1' 
                          ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400' 
                          : 'bg-slate-500/10 text-slate-600 dark:text-slate-400'
                      }`}>
                        {order.collectedBy === 'B1' ? 'Restaurant Counter' : 'Fast Food Counter'}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-light text-slate-400 text-xs">
                      {order.paidAt ? new Date(order.paidAt).toLocaleString() : 'N/A'}
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
