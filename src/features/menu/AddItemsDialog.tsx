import React, { useState, useEffect, useMemo, useRef } from 'react';
import { subscribeToMenu, type MenuItem } from '@/firebase/services';
import { motion } from 'framer-motion';
import { X, Search, Plus, Minus, FileText, ShoppingBag } from 'lucide-react';

export const getCategoryBadgeStyles = (category: string | undefined | null) => {
  if (!category) {
    return 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20';
  }
  const cat = category.toLowerCase();
  if (cat.includes('veg') && !cat.includes('non')) {
    return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20';
  }
  if (cat.includes('non') || cat.includes('chicken') || cat.includes('momo') || cat.includes('wing') || cat.includes('leg') || cat.includes('starter')) {
    return 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20';
  }
  if (cat.includes('pizza') || cat.includes('burger') || cat.includes('sandwich') || cat.includes('roll') || cat.includes('saver') || cat.includes('combo')) {
    return 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20';
  }
  if (cat.includes('drink') || cat.includes('shake') || cat.includes('mocktail')) {
    return 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20';
  }
  if (cat.includes('ice cream')) {
    return 'bg-pink-500/10 text-pink-600 dark:text-pink-400 border border-pink-500/20';
  }
  return 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20';
};

interface AddItemsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onAddItems: (items: Array<{ menuItem: MenuItem; quantity: number; notes: string | null }>) => void;
}

export const AddItemsDialog: React.FC<AddItemsDialogProps> = ({ isOpen, onClose, onAddItems }) => {
  const [menu, setMenu] = useState<MenuItem[]>([]);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  
  // Selection state: map of menuItemId -> { quantity: number, notes: string | null }
  const [selectedItems, setSelectedItems] = useState<Record<string, { quantity: number; notes: string | null }>>({});
  const [focusedItemId, setFocusedItemId] = useState<string | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Subscribe to menu
  useEffect(() => {
    if (!isOpen) return;
    const unsubscribe = subscribeToMenu((data) => {
      // Filter out inactive items
      setMenu(data.filter(item => item.active));
    });
    return unsubscribe;
  }, [isOpen]);

  // Focus search input on open
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 100);
      // Clear previous selections
      setSelectedItems({});
      setSearch('');
      setSelectedCategory('All');
      setFocusedItemId(null);
    }
  }, [isOpen]);

  // Filtered menu items
  const filteredMenu = useMemo(() => {
    return menu.filter((item) => {
      const itemName = item.name || '';
      const itemCategory = item.category || '';
      const matchesSearch = itemName.toLowerCase().includes(search.toLowerCase()) ||
                            itemCategory.toLowerCase().includes(search.toLowerCase());
      const matchesCategory = selectedCategory === 'All' || itemCategory === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [menu, search, selectedCategory]);

  const handleUpdateQuantity = (itemId: string, delta: number) => {
    setSelectedItems((prev) => {
      const current = prev[itemId] || { quantity: 0, notes: '' };
      const nextQuantity = current.quantity + delta;

      if (nextQuantity <= 0) {
        const copy = { ...prev };
        delete copy[itemId];
        if (focusedItemId === itemId) setFocusedItemId(null);
        return copy;
      }

      return {
        ...prev,
        [itemId]: { ...current, quantity: nextQuantity },
      };
    });

    if (delta > 0 && !selectedItems[itemId]) {
      setFocusedItemId(itemId);
    }
  };

  const handleUpdateNotes = (itemId: string, notes: string) => {
    setSelectedItems((prev) => {
      const current = prev[itemId] || { quantity: 1, notes: '' };
      return {
        ...prev,
        [itemId]: { ...current, notes: notes || null },
      };
    });
  };

  const totalCost = useMemo(() => {
    return Object.entries(selectedItems).reduce((sum, [itemId, selection]) => {
      const item = menu.find((m) => m.id === itemId);
      const price = item && typeof item.price === 'number' ? item.price : 0;
      return sum + (price * selection.quantity);
    }, 0);
  }, [selectedItems, menu]);

  const selectedCount = useMemo(() => {
    return Object.values(selectedItems).reduce((sum, item) => sum + item.quantity, 0);
  }, [selectedItems]);

  const handleAdd = () => {
    const itemsToAdd = Object.entries(selectedItems).map(([itemId, selection]) => {
      const menuItem = menu.find((m) => m.id === itemId)!;
      return {
        menuItem,
        quantity: selection.quantity,
        notes: selection.notes,
      };
    });

    if (itemsToAdd.length > 0) {
      onAddItems(itemsToAdd);
    }
    onClose();
  };

  if (!isOpen) return null;

  const categories = useMemo(() => {
    const cats = Array.from(new Set(menu.map((item) => item.category).filter(Boolean)));
    return ['All', ...cats.sort()];
  }, [menu]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-black/60 backdrop-blur-sm"
      />

      {/* Modal Dialog */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ type: 'spring', duration: 0.4 }}
        className="relative w-full max-w-4xl h-[85vh] flex flex-col bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden text-slate-950 dark:text-white"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h2 className="text-2xl font-bold">Add Items</h2>
            <p className="text-slate-400 text-xs font-light">Search and configure items to add to this order</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full border border-slate-100 dark:border-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filter Controls (Search + Categories) */}
        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex flex-col md:flex-row gap-4 justify-between bg-slate-50/50 dark:bg-slate-950/20">
          {/* Search bar */}
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-400" />
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Search dishes, categories..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
            />
          </div>

          {/* Categories Horizontal Scroller */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap cursor-pointer transition-all ${
                  selectedCategory === cat
                    ? 'bg-emerald-500 dark:bg-emerald-400 text-white dark:text-slate-950'
                    : 'bg-white dark:bg-slate-950 text-slate-500 dark:text-slate-400 border border-slate-200/60 dark:border-slate-850 hover:bg-slate-100 dark:hover:bg-slate-900'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Two Column Layout: Items List (Left), Notes Panel (Right) */}
        <div className="flex-1 min-h-0 flex flex-col md:flex-row">
          
          {/* Items Grid (Left) */}
          <div className="flex-1 overflow-y-auto p-6 min-h-0">
            {filteredMenu.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-slate-400 py-10">
                <Search className="w-12 h-12 text-slate-300 dark:text-slate-800 mb-3" />
                <p className="text-sm font-medium">No items found</p>
                <p className="text-xs font-light text-slate-400">Try checking a different search term or category</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {filteredMenu.map((item) => {
                  const selection = selectedItems[item.id];
                  const isSelected = !!selection;

                  return (
                    <div
                      key={item.id}
                      onClick={() => {
                        if (!isSelected) handleUpdateQuantity(item.id, 1);
                        else setFocusedItemId(item.id);
                      }}
                      className={`p-4 rounded-2xl border text-left cursor-pointer transition-all duration-200 flex items-center justify-between group ${
                        isSelected
                          ? 'border-emerald-500 dark:border-emerald-400 bg-emerald-500/5 dark:bg-emerald-400/5 ring-1 ring-emerald-500'
                          : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 hover:border-slate-400 dark:hover:border-slate-700'
                      }`}
                    >
                      <div className="flex-1 pr-3">
                        <div className="flex items-center gap-1.5">
                          <span className="font-semibold text-sm line-clamp-1">{item.name || 'Unnamed Item'}</span>
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${getCategoryBadgeStyles(item.category)}`}>
                            {item.category || 'Uncategorized'}
                          </span>
                        </div>
                        <span className="text-sm font-extrabold mt-1 text-slate-700 dark:text-slate-300 block">
                          ₹{item.price !== null ? item.price : 'N/A'}
                        </span>
                        {isSelected && selection.notes && (
                          <span className="text-[10px] text-emerald-600 dark:text-emerald-400 italic block mt-1 line-clamp-1">
                            Note: {selection.notes}
                          </span>
                        )}
                      </div>

                      {/* Controls */}
                      <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                        {isSelected ? (
                          <>
                            <button
                              onClick={() => handleUpdateQuantity(item.id, -1)}
                              className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-400 hover:bg-slate-100 cursor-pointer"
                            >
                              <Minus className="w-3.5 h-3.5" />
                            </button>
                            <span className="w-6 text-center font-extrabold text-sm">{selection.quantity}</span>
                            <button
                              onClick={() => handleUpdateQuantity(item.id, 1)}
                              className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-400 hover:bg-slate-100 cursor-pointer"
                            >
                              <Plus className="w-3.5 h-3.5" />
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={() => handleUpdateQuantity(item.id, 1)}
                            className="p-2 rounded-xl bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-400 group-hover:bg-emerald-500 dark:group-hover:bg-emerald-400 group-hover:text-white dark:group-hover:text-slate-950 transition-colors cursor-pointer"
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Selection Notes Panel (Right) */}
          <div className="w-full md:w-80 border-t md:border-t-0 md:border-l border-slate-150 dark:border-slate-850 p-6 flex flex-col justify-start bg-slate-50/30 dark:bg-slate-950/20">
            <h3 className="text-sm font-bold flex items-center gap-2 text-slate-500 dark:text-slate-400 mb-4">
              <FileText className="w-4 h-4" /> Add Special Notes
            </h3>

            {focusedItemId ? (
              <div className="flex flex-col gap-3">
                <div className="p-3 bg-emerald-500/5 dark:bg-emerald-400/5 border border-emerald-500/20 rounded-xl">
                  <span className="text-xs text-slate-400 block font-light">Cooking for:</span>
                  <span className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                    {menu.find(m => m.id === focusedItemId)?.name || 'Unnamed Item'}
                  </span>
                </div>
                
                <textarea
                  placeholder="e.g. Extra spicy, No onions, Sauce on the side..."
                  value={selectedItems[focusedItemId]?.notes || ''}
                  onChange={(e) => handleUpdateNotes(focusedItemId, e.target.value)}
                  rows={4}
                  className="w-full p-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 resize-none"
                />
                
                <p className="text-[10px] text-slate-400 font-light">
                  Press outside this area or select another item to finalize notes. Notes are printed in timeline logs.
                </p>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center text-slate-400">
                <ShoppingBag className="w-10 h-10 text-slate-300 dark:text-slate-800 mb-2" />
                <p className="text-xs">Select an item on the grid to attach custom notes/instructions.</p>
              </div>
            )}
          </div>
        </div>

        {/* Footer Summary & Confirm button */}
        <div className="p-6 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between">
          <div className="flex flex-col">
            <span className="text-xs text-slate-400 font-light">{selectedCount} items selected</span>
            <span className="text-xl font-extrabold text-slate-900 dark:text-white">
              Total: ₹{totalCost}
            </span>
          </div>

          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-850 cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={handleAdd}
              disabled={selectedCount === 0}
              className={`px-6 py-2.5 rounded-xl text-sm font-bold shadow-md cursor-pointer transition-all flex items-center gap-2 ${
                selectedCount === 0
                  ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 border border-slate-200/50 dark:border-slate-850 cursor-not-allowed shadow-none'
                  : 'bg-emerald-500 hover:bg-emerald-600 dark:bg-emerald-400 dark:text-slate-950 dark:hover:bg-emerald-350 text-white'
              }`}
            >
              Add to Order (₹{totalCost})
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
