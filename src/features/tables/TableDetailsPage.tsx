import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  subscribeToTables, 
  subscribeToOrder, 
  subscribeToOrderItems, 
  subscribeToTimeline,
  createOrder,
  addOrderItem,
  updateOrderItemQuantity,
  updateOrderItemServedStatus,
  getCounterForKitchen,
  markOrderPaymentPending,
  collectPayment,
  closeTable,
  createKitchenNotification,
  resetOrderItemKitchenStatus,
  Table,
  Order,
  OrderItem,
  TimelineEntry,
  MenuItem
} from '@/firebase/services';
import { useAuth } from '@/context/AuthContext';
import { AddItemsDialog } from '@/features/menu/AddItemsDialog';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowLeft, 
  Clock, 
  CreditCard, 
  Plus, 
  Trash2, 
  CheckCircle,
  AlertTriangle,
  Receipt
} from 'lucide-react';

export const TableDetailsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { counter } = useAuth();

  const [table, setTable] = useState<Table | null>(null);
  const [order, setOrder] = useState<Order | null>(null);
  const [items, setItems] = useState<OrderItem[]>([]);
  const [timeline, setTimeline] = useState<TimelineEntry[]>([]);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [sendingItemIds, setSendingItemIds] = useState<Set<string>>(() => new Set());
  const [selectedItemIds, setSelectedItemIds] = useState<Set<string>>(() => new Set());

  // Modal / Confirm state
  const [confirmPaymentOpen, setConfirmPaymentOpen] = useState(false);

  // Subscribe to table details
  useEffect(() => {
    if (!id) return;

    const unsubscribeTables = subscribeToTables((allTables) => {
      const match = allTables.find((t) => t.id === id);
      if (match) {
        setTable(match);
      } else {
        // Table not found
        navigate('/');
      }
      setIsLoading(false);
    });

    return unsubscribeTables;
  }, [id, navigate]);

  // Subscribe to active order details
  useEffect(() => {
    if (!table || !table.currentOrderId) {
      setOrder(null);
      setItems([]);
      setTimeline([]);
      return;
    }

    const orderId = table.currentOrderId;
    const unsubOrder = subscribeToOrder(orderId, (o) => setOrder(o));
    const unsubItems = subscribeToOrderItems(orderId, (i) => setItems(i));
    const unsubTimeline = subscribeToTimeline(orderId, (t) => setTimeline(t));

    return () => {
      unsubOrder();
      unsubItems();
      unsubTimeline();
    };
  }, [table]);

  const handleAddItems = async (itemsToAdd: Array<{ menuItem: MenuItem; quantity: number; notes: string | null }>) => {
    if (!id || !counter || itemsToAdd.length === 0) return;
    setIsLoading(true);
    try {
      const orderId = order?.id || table?.currentOrderId || await createOrder(id, counter);
      for (const entry of itemsToAdd) {
        await addOrderItem(orderId, entry.menuItem, entry.quantity, entry.notes, counter);
      }

    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateQty = async (itemId: string, newQty: number) => {
    if (!order || !counter) return;
    try {
      await updateOrderItemQuantity(order.id, itemId, newQty, counter);
    } catch (e) {
      console.error(e);
    }
  };

  const handleToggleServed = async (itemId: string, served: boolean) => {
    if (!order || !counter) return;
    try {
      await updateOrderItemServedStatus(order.id, itemId, served, counter);
    } catch (e) {
      console.error(e);
    }
  };

  const handleSendSelectedToKitchen = async (itemsToSend: OrderItem[]) => {
    if (!order || !table || !counter || itemsToSend.length === 0) return;

    const itemIds = itemsToSend.map(i => i.id);
    setSendingItemIds((prev) => {
      const next = new Set(prev);
      itemIds.forEach(id => next.add(id));
      return next;
    });

    try {
      // Group items by their target kitchen counter resolved dynamically
      const groups: Record<string, OrderItem[]> = {};
      itemsToSend.forEach((item) => {
        const target = getCounterForKitchen(item.kitchen);
        if (!groups[target]) {
          groups[target] = [];
        }
        groups[target].push(item);
      });

      for (const [targetCounter, groupItems] of Object.entries(groups)) {
        // Generate a new kitchen request notification document for both local and cross-counter items
        await createKitchenNotification({
          orderId: order.id,
          tableId: table.id,
          tableNumber: table.number,
          sourceCounter: counter,
          targetCounter: targetCounter,
          status: 'Pending',
          createdAt: Date.now(),
          acceptedAt: null,
          acceptedBy: null,
          createdBy: counter,
          items: groupItems.map(i => ({
            itemId: i.id,
            itemName: i.itemName,
            quantity: i.quantity,
            category: i.category,
            availableAt: targetCounter
          }))
        });
      }

      // Remove from selected list
      setSelectedItemIds((prev) => {
        const next = new Set(prev);
        itemIds.forEach(id => next.delete(id));
        return next;
      });
    } catch (e) {
      console.error('Failed to send items to kitchen:', e);
    } finally {
      setSendingItemIds((prev) => {
        const next = new Set(prev);
        itemIds.forEach(id => next.delete(id));
        return next;
      });
    }
  };

  const handleResetKitchenStatus = async (itemId: string) => {
    if (!order) return;
    try {
      await resetOrderItemKitchenStatus(order.id, itemId);
    } catch (e) {
      console.error('Failed to reset kitchen status:', e);
    }
  };
  const handleRequestBill = async () => {
    if (!order || !counter) return;
    try {
      await markOrderPaymentPending(order.id, counter);
    } catch (e) {
      console.error(e);
    }
  };

  const handleCollectPayment = async () => {
    if (!order || !counter) return;
    try {
      await collectPayment(order.id, counter);
      setConfirmPaymentOpen(false);
    } catch (e) {
      console.error(e);
    }
  };

  const handleCloseAndArchive = async () => {
    if (!order || !counter) return;
    try {
      await closeTable(order.id, counter);
      navigate('/');
    } catch (e) {
      console.error(e);
    }
  };

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getStatusBadge = (status: Table['status']) => {
    const base = "px-3 py-1 rounded-full text-xs font-bold shadow-xs ";
    switch (status) {
      case 'Available':
        return base + "bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400";
      case 'Occupied':
        return base + "bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400";
      case 'Payment Pending':
        return base + "bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 animate-pulse";
      case 'Paid':
        return base + "bg-indigo-500/10 border border-indigo-500/20 text-indigo-600 dark:text-indigo-400";
      case 'Cleaning':
        return base + "bg-slate-500/10 border border-slate-500/20 text-slate-500 dark:text-slate-400";
    }
  };

  if (isLoading || !table) {
    return (
      <div className="flex flex-col gap-6 py-6 animate-pulse">
        <div className="h-10 w-48 bg-slate-200 dark:bg-slate-900 rounded-xl" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 h-96 bg-slate-200 dark:bg-slate-900 rounded-3xl" />
          <div className="h-96 bg-slate-200 dark:bg-slate-900 rounded-3xl" />
        </div>
      </div>
    );
  }

  const isB1InsideRule = table.location === 'Inside';
  const isB2OutsideRule = table.location === 'Outside';
  const hasPaymentPermission = (counter === 'B1' && isB1InsideRule) || (counter === 'B2' && isB2OutsideRule);

  const restaurantItems = items.filter(item => item.kitchen === 'Restaurant');
  const fastFoodItems = items.filter(item => item.kitchen === 'Fast Food');
  const restaurantSubtotal = restaurantItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const fastFoodSubtotal = fastFoodItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const renderOrderItem = (item: OrderItem) => {
    const isPending = item.status === 'Pending';
    const isSending = sendingItemIds.has(item.id);
    const canSelectForKitchen = !item.kitchenStatus || item.kitchenStatus === 'Not Sent';

    return (
    <motion.div
      key={item.id}
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.2 }}
      className="py-4 flex items-center justify-between gap-4"
    >
      <div className="flex items-center gap-3">
        {canSelectForKitchen && (
          <input
            type="checkbox"
            checked={selectedItemIds.has(item.id)}
            onChange={(e) => {
              setSelectedItemIds((prev) => {
                const next = new Set(prev);
                if (e.target.checked) {
                  next.add(item.id);
                } else {
                  next.delete(item.id);
                }
                return next;
              });
            }}
            className="w-4 h-4 rounded border-slate-300 dark:border-slate-700 text-indigo-500 focus:ring-indigo-400 cursor-pointer accent-indigo-500 mr-1"
            title="Select to send to kitchen"
          />
        )}
        <input
          type="checkbox"
          checked={!!item.served}
          onChange={(e) => handleToggleServed(item.id, e.target.checked)}
          className="w-4 h-4 rounded border-slate-300 dark:border-slate-700 text-emerald-500 focus:ring-emerald-400 cursor-pointer accent-emerald-500"
          title="Mark as served"
        />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`font-semibold text-sm transition-all ${item.served ? 'line-through text-slate-400 dark:text-slate-500 font-normal' : ''}`}>
            {item.itemName || 'Unnamed Item'}
          </span>

          {isPending ? (
            <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
              Pending Order
            </span>
          ) : (
            <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              Order Accepted
            </span>
          )}
        </div>
        <span className={`text-xs block font-light mt-0.5 ${item.served ? 'text-slate-300 dark:text-slate-700' : 'text-slate-400'}`}>₹{item.price} each</span>
        {item.notes && (
          <span className="text-[10px] text-amber-600 dark:text-amber-400 italic block mt-1 font-light bg-amber-500/5 px-2 py-0.5 rounded-lg w-max border border-amber-500/10">
            Note: {item.notes}
          </span>
        )}
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={() => handleUpdateQty(item.id, item.quantity - 1)}
          className="p-1 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-850 cursor-pointer transition-colors"
        >
          {item.quantity === 1 ? <Trash2 className="w-3.5 h-3.5 text-rose-500" /> : <span className="w-3.5 h-3.5 flex items-center justify-center text-xs font-bold">-</span>}
        </button>

        <span className="w-6 text-center font-extrabold text-sm text-slate-800 dark:text-slate-200">
          {item.quantity}
        </span>

        <button
          onClick={() => handleUpdateQty(item.id, item.quantity + 1)}
          className="p-1 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-850 cursor-pointer transition-colors"
        >
          <span className="w-3.5 h-3.5 flex items-center justify-center text-xs font-bold">+</span>
        </button>
      </div>

      <div className="w-20 text-right font-extrabold text-sm text-slate-900 dark:text-white">
        ₹{item.price * item.quantity}
      </div>

      {(!item.kitchenStatus || item.kitchenStatus === 'Not Sent' ? (
        <button
          type="button"
          onClick={() => handleSendSelectedToKitchen([item])}
          disabled={isSending}
          className={`px-3 py-1.5 text-xs font-bold rounded-xl border transition-all shadow-xs whitespace-nowrap ${
            isSending
              ? 'border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-850 text-slate-400 cursor-not-allowed'
              : 'border-indigo-200 dark:border-indigo-900/30 bg-indigo-50/50 dark:bg-indigo-950/20 text-indigo-500 hover:bg-indigo-100 dark:hover:bg-indigo-950/30 cursor-pointer'
          }`}>
          {isSending ? 'Sending...' : 'Send to Kitchen'}
        </button>
      ) : item.kitchenStatus === 'Pending' ? (
        <div className="flex items-center gap-1.5">
          <span className="px-3 py-1.5 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-850 text-slate-400 shadow-xs whitespace-nowrap">
            Pending Acceptance
          </span>
          <button
            type="button"
            onClick={() => handleResetKitchenStatus(item.id)}
            className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-850 text-slate-400 hover:text-rose-500 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer transition-colors"
            title="Resend / Reset Status"
          >
            Reset
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-1.5">
          <span className="px-3 py-1.5 text-xs font-bold rounded-xl border border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 shadow-xs whitespace-nowrap">
            Accepted
          </span>
          <button
            type="button"
            onClick={() => handleResetKitchenStatus(item.id)}
            className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-850 text-slate-400 hover:text-rose-500 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer transition-colors"
            title="Resend / Reset Status"
          >
            Reset
          </button>
        </div>
      ))}
    </motion.div>
    );
  };

  const renderKitchenSection = (
    title: string,
    counterLabel: string,
    sectionItems: OrderItem[],
    subtotal: number,
    accentClasses: string
  ) => {
    if (sectionItems.length === 0) return null;

    const eligibleItems = sectionItems.filter(
      item => !item.kitchenStatus || item.kitchenStatus === 'Not Sent'
    );

    const selectedInSection = sectionItems.filter(item => selectedItemIds.has(item.id));

    return (
      <section key={title} className="rounded-2xl border border-slate-150 dark:border-slate-850 overflow-hidden">
        <div className={`px-4 py-3 flex items-center justify-between gap-3 ${accentClasses}`}>
          <div>
            <h3 className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
              {title}
              {eligibleItems.length > 0 && (() => {
                const isAnySectionItemSending = eligibleItems.some(i => sendingItemIds.has(i.id));
                return (
                  <button
                    type="button"
                    onClick={() => handleSendSelectedToKitchen(eligibleItems)}
                    disabled={isAnySectionItemSending}
                    className={`px-2 py-0.5 text-[10px] font-bold rounded transition-all shadow-xs ${
                      isAnySectionItemSending
                        ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 cursor-not-allowed border border-slate-200/50 dark:border-slate-700'
                        : 'bg-indigo-500 hover:bg-indigo-650 text-white cursor-pointer'
                    }`}
                  >
                    {isAnySectionItemSending ? 'Sending...' : 'Send All to Kitchen'}
                  </button>
                );
              })()}
            </h3>
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">{counterLabel}</p>
          </div>
          <div className="text-right">
            <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">Subtotal</span>
            <span className="text-sm font-black text-slate-900 dark:text-white">₹{subtotal}</span>
          </div>
        </div>
        <div className="divide-y divide-slate-100 dark:divide-slate-800 px-4">
          {sectionItems.map(renderOrderItem)}
        </div>
        {selectedInSection.length > 0 && (() => {
          const isAnySelectedSending = selectedInSection.some(i => sendingItemIds.has(i.id));
          return (
            <div className="px-4 py-3 bg-slate-50 dark:bg-slate-900/50 border-t border-slate-150 dark:border-slate-800 flex justify-between items-center text-xs font-bold">
              <span className="text-slate-500 font-medium">{selectedInSection.length} item(s) selected</span>
              <button
                type="button"
                onClick={() => handleSendSelectedToKitchen(selectedInSection)}
                disabled={isAnySelectedSending}
                className={`px-3.5 py-1.5 rounded-xl text-white shadow-md transition-all flex items-center gap-1 ${
                  isAnySelectedSending
                    ? 'bg-slate-200 dark:bg-slate-850 text-slate-450 cursor-not-allowed border border-slate-300 dark:border-slate-750'
                    : 'bg-indigo-600 hover:bg-indigo-750 cursor-pointer'
                }`}
              >
                {isAnySelectedSending ? 'Sending...' : 'Send Selected to Kitchen'}
              </button>
            </div>
          );
        })()}
      </section>
    );
  };

  return (
    <div className="flex flex-col gap-6 pb-12">
      {/* Header Back Link */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/')}
          className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 cursor-pointer transition-colors shadow-xs"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <span className="text-xs text-slate-400 font-light uppercase tracking-wider">Table Details</span>
          <h1 className="text-3xl font-extrabold flex items-center gap-3">
            Table {table.number}
            <span className={getStatusBadge(table.status)}>{table.status}</span>
          </h1>
        </div>
      </div>

      {/* Main Grid split */}
      {table.status === 'Available' ? (
        <div className="max-w-xl mx-auto w-full text-center py-16 px-6 bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-850 shadow-xl rounded-3xl flex flex-col items-center gap-6 mt-6">
          <div className="p-4 bg-emerald-500/10 text-emerald-500 rounded-2xl">
            <Receipt className="w-12 h-12" />
          </div>
          <div>
            <h2 className="text-2xl font-bold">Add Items</h2>
            <p className="text-slate-400 text-sm font-light mt-2 max-w-sm">
              Table {table.number} is free. Select the first items to start the order.
            </p>
          </div>
          <button
            onClick={() => setIsAddOpen(true)}
            className="px-6 py-3 bg-emerald-500 hover:bg-emerald-600 dark:bg-emerald-400 dark:text-slate-950 dark:hover:bg-emerald-350 text-white rounded-2xl font-bold shadow-md cursor-pointer transition-colors w-full sm:w-auto flex items-center justify-center gap-2"
          >
            <Plus className="w-4 h-4" /> Add Items
          </button>
        </div>
      ) : (
        // Active State: Order Details
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          
          {/* Active Items Table + Summary (Left columns) */}
          <div className="lg:col-span-2 flex flex-col gap-6">
            
            {/* Order Items card */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/70 shadow-xl rounded-3xl p-6 relative overflow-hidden">
              <h2 className="text-lg font-bold border-b border-slate-100 dark:border-slate-800 pb-3 flex items-center justify-between">
                Active Order Items
                {order && (
                  <span className="text-xs text-slate-400 font-light font-mono">ID: {order.id}</span>
                )}
              </h2>

              {items.length === 0 ? (
                <div className="text-center py-12 text-slate-400 flex flex-col items-center justify-center gap-2">
                  <Receipt className="w-10 h-10 text-slate-355 dark:text-slate-800" />
                  <p className="text-sm font-medium">No items ordered yet</p>
                  <p className="text-xs font-light">Click "Add Items" below to record the first order.</p>
                </div>
              ) : (
                <div className="mt-4 space-y-4">
                  <AnimatePresence initial={false}>
                    {renderKitchenSection(
                      'Restaurant Items',
                      'B1 Counter',
                      restaurantItems,
                      restaurantSubtotal,
                      'bg-emerald-500/5 dark:bg-emerald-400/5 border-b border-emerald-500/10'
                    )}
                    {renderKitchenSection(
                      'Fast Food Items',
                      'B2 Counter',
                      fastFoodItems,
                      fastFoodSubtotal,
                      'bg-amber-500/5 dark:bg-amber-400/5 border-b border-amber-500/10'
                    )}
                  </AnimatePresence>
                </div>
              )}

              {/* Add Items Trigger */}
              <div className="mt-6 flex justify-end">
                <button
                  onClick={() => setIsAddOpen(true)}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 text-sm font-semibold hover:border-emerald-500 dark:hover:border-emerald-400 hover:text-emerald-500 dark:hover:text-emerald-400 cursor-pointer transition-colors w-full sm:w-auto justify-center"
                >
                  <Plus className="w-4 h-4" /> Add Items to Order
                </button>
              </div>
            </div>

            {/* Bottom Summary card */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/70 shadow-xl rounded-3xl p-6 relative overflow-hidden">
              <h2 className="text-lg font-bold pb-3 border-b border-slate-100 dark:border-slate-800">
                Order Billing Summary
              </h2>

              <div className="py-4 flex flex-col gap-2 border-b border-slate-100 dark:border-slate-800 text-sm font-medium">
                <div className="flex justify-between text-slate-500">
                  <span>Subtotal</span>
                  <span>₹{order?.subtotal || 0}</span>
                </div>
                <div className="flex justify-between text-slate-500">
                  <span>Tax (0% GST - Excluded as per requirements)</span>
                  <span>₹0</span>
                </div>
              </div>

              <div className="py-4 flex justify-between items-center">
                <span className="text-base font-bold text-slate-900 dark:text-white">Grand Total</span>
                <span className="text-2xl font-black text-slate-900 dark:text-white">
                  ₹{order?.total || 0}
                </span>
              </div>
            </div>

            {/* Realtime Order Timeline Log */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/70 shadow-xl rounded-3xl p-6 relative overflow-hidden">
              <h2 className="text-lg font-bold pb-3 border-b border-slate-100 dark:border-slate-800 flex items-center gap-2">
                <Clock className="w-5 h-5 text-slate-400" /> Order History Timeline
              </h2>

              {timeline.length === 0 ? (
                <p className="text-sm text-slate-400 py-4 font-light">No logged timeline operations.</p>
              ) : (
                <div className="relative border-l-2 border-slate-100 dark:border-slate-800 pl-4 ml-2 mt-4 space-y-4 py-2 text-xs font-medium">
                  {timeline.map((entry) => (
                    <div key={entry.id} className="relative">
                      {/* Timeline dot */}
                      <span className="absolute -left-[21px] top-1.5 flex h-2 w-2 rounded-full bg-slate-300 dark:bg-slate-700" />
                      
                      <div className="flex justify-between items-center text-slate-400 font-light mb-1">
                        <span>{formatTime(entry.timestamp)}</span>
                        <span className="px-1.5 py-0.2 rounded-sm bg-slate-100 dark:bg-slate-800 text-[9px] uppercase tracking-wider">
                          actor: {entry.actor}
                        </span>
                      </div>
                      <p className="text-slate-800 dark:text-slate-200 font-medium text-sm">
                        {entry.message}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>

          {/* Quick Actions Panel (Right column) */}
          <div className="flex flex-col gap-6">
            
            {/* Table Details Sidebar Card */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/70 shadow-xl rounded-3xl p-6 relative overflow-hidden">
              <h2 className="text-base font-bold pb-3 border-b border-slate-100 dark:border-slate-800">
                Seating Info
              </h2>

              <div className="py-4 space-y-3.5 text-sm font-medium">
                <div className="flex justify-between">
                  <span className="text-slate-400 font-light">Location</span>
                  <span className="font-bold">{table.location} Seating</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400 font-light">Counter Assignment</span>
                  <span className="font-bold">
                    {isB1InsideRule ? 'Restaurant Counter' : 'Fast Food Counter'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400 font-light">Current Bill Status</span>
                  <span className="font-bold uppercase text-slate-700 dark:text-slate-300">
                    {order?.paymentStatus || 'Unpaid'}
                  </span>
                </div>
                
                {order?.paymentStatus === 'Paid' && (
                  <div className="p-3.5 rounded-2xl bg-indigo-500/5 border border-indigo-500/20 text-xs">
                    <span className="text-slate-400 font-light block mb-1">Payment Received:</span>
                    <p className="text-indigo-600 dark:text-indigo-400 font-semibold mb-0.5">
                      Collected at {order.collectedBy === 'B1' ? 'Restaurant Counter' : 'Fast Food Counter'}
                    </p>
                    {order.paidAt && (
                      <span className="text-[10px] text-slate-400 font-light block">
                        Timestamp: {new Date(order.paidAt).toLocaleTimeString()}
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Counter Authorization rules notice */}
            {!hasPaymentPermission && order?.paymentStatus !== 'Paid' && (
              <div className="p-4 rounded-2xl border border-amber-500/25 bg-amber-500/5 text-amber-600 dark:text-amber-400 flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
                <div className="text-xs leading-relaxed font-light">
                  <strong>Notice:</strong> This is an <em>{table.location} Table</em>. Payment must be collected at <strong>{isB1InsideRule ? 'Restaurant Counter' : 'Fast Food Counter'}</strong>. 
                  You can still add items or request the bill, but payment button is locked for {counter === 'B1' ? 'Restaurant Counter' : 'Fast Food Counter'}.
                </div>
              </div>
            )}

            {/* Workflow Action Buttons */}
            <div className="flex flex-col gap-3">
              {order && order.paymentStatus === 'Unpaid' && (
                <button
                  onClick={handleRequestBill}
                  className="w-full py-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-850 text-sm font-bold shadow-xs cursor-pointer transition-colors"
                >
                  Request Bill / Mark Pending
                </button>
              )}

              {order && order.paymentStatus !== 'Paid' && (
                <button
                  onClick={() => setConfirmPaymentOpen(true)}
                  disabled={!hasPaymentPermission || items.length === 0}
                  className={`w-full py-3.5 rounded-2xl text-sm font-bold shadow-md cursor-pointer transition-all flex items-center justify-center gap-2 ${
                    !hasPaymentPermission || items.length === 0
                      ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 border border-slate-200/50 dark:border-slate-850 cursor-not-allowed shadow-none'
                      : 'bg-emerald-500 hover:bg-emerald-600 dark:bg-emerald-400 dark:text-slate-950 dark:hover:bg-emerald-350 text-white'
                  }`}
                  title={!hasPaymentPermission ? `Payment must be collected by ${isB1InsideRule ? 'Restaurant Counter' : 'Fast Food Counter'}` : 'Record Payment'}
                >
                  <CreditCard className="w-4 h-4" /> Collect Payment (₹{order.total})
                </button>
              )}

              {order && order.paymentStatus === 'Paid' && (
                <button
                  onClick={handleCloseAndArchive}
                  className="w-full py-3.5 rounded-2xl bg-indigo-500 hover:bg-indigo-600 text-white dark:bg-indigo-400 dark:text-slate-950 dark:hover:bg-indigo-350 text-sm font-bold shadow-md cursor-pointer transition-colors flex items-center justify-center gap-2"
                >
                  <CheckCircle className="w-4 h-4" /> Close Table / Set Available
                </button>
              )}
            </div>

          </div>

        </div>
      )}

      {/* Collect Payment Confirmation Dialog */}
      <AnimatePresence>
        {confirmPaymentOpen && order && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setConfirmPaymentOpen(false)}
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
                  <CreditCard className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold">Collect Payment?</h3>
              </div>

              <p className="text-slate-500 dark:text-slate-400 text-sm font-light leading-relaxed mb-6">
                Are you sure you want to mark Table {table.number} as paid? 
                This will log payment collected by <strong>{counter === 'B1' ? 'Restaurant Counter' : 'Fast Food Counter'}</strong> and notify the other counter instantly.
              </p>

              <div className="space-y-4 max-h-[300px] overflow-y-auto mb-6 pr-1 border-y border-slate-150 dark:border-slate-800 py-4 text-xs font-mono">
                {restaurantItems.length > 0 && (
                  <div>
                    <h4 className="font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">Restaurant Items (B1)</h4>
                    <div className="space-y-1.5 pl-2 mb-3">
                      {restaurantItems.map((item) => (
                        <div key={item.id} className="flex justify-between text-slate-800 dark:text-slate-200">
                          <span>✓ {item.itemName} (x{item.quantity})</span>
                          <span>₹{item.price * item.quantity}</span>
                        </div>
                      ))}
                      <div className="flex justify-between font-bold border-t border-dashed border-slate-200 dark:border-slate-800 pt-1 text-slate-900 dark:text-white mt-1">
                        <span>Restaurant Subtotal:</span>
                        <span>₹{restaurantSubtotal}</span>
                      </div>
                    </div>
                  </div>
                )}

                {fastFoodItems.length > 0 && (
                  <div>
                    <h4 className="font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">Fast Food Items (B2)</h4>
                    <div className="space-y-1.5 pl-2">
                      {fastFoodItems.map((item) => (
                        <div key={item.id} className="flex justify-between text-slate-800 dark:text-slate-200">
                          <span>✓ {item.itemName} (x{item.quantity})</span>
                          <span>₹{item.price * item.quantity}</span>
                        </div>
                      ))}
                      <div className="flex justify-between font-bold border-t border-dashed border-slate-200 dark:border-slate-800 pt-1 text-slate-900 dark:text-white mt-1">
                        <span>Fast Food Subtotal:</span>
                        <span>₹{fastFoodSubtotal}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-150 dark:border-slate-850 mb-6 font-mono text-sm space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-400 font-light">Table:</span>
                  <span className="font-bold">{table.number}</span>
                </div>
                <div className="flex justify-between border-t border-dashed border-slate-200 dark:border-slate-800 pt-1.5 mt-1.5">
                  <span className="text-slate-400 font-light">Grand Total:</span>
                  <span className="font-black text-slate-900 dark:text-white text-lg">₹{order.total}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400 font-light">Collected By:</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">{counter === 'B1' ? 'Restaurant Counter' : 'Fast Food Counter'}</span>
                </div>
              </div>

              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => setConfirmPaymentOpen(false)}
                  className="px-5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-850 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCollectPayment}
                  className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 dark:bg-emerald-400 dark:text-slate-950 dark:hover:bg-emerald-350 text-white text-sm font-bold shadow-md cursor-pointer transition-colors"
                >
                  Confirm Payment Collected
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Add Items dialog slider */}
      <AddItemsDialog
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        onAddItems={handleAddItems}
      />
    </div>
  );
};



