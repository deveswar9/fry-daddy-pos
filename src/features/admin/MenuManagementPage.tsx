import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  subscribeToMenu, 
  createMenuItem, 
  updateMenuItem, 
  deleteMenuItem, 
  importMenuFromList, 
  MenuItem 
} from '@/firebase/services';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Plus, 
  Search, 
  Trash2, 
  Edit3, 
  ToggleLeft, 
  ToggleRight, 
  Check, 
  X,
  PlusCircle,
  HelpCircle,
  AlertCircle,
  Download,
  Upload,
  FileText,
  Loader2
} from 'lucide-react';
import { getCategoryBadgeStyles } from '@/features/menu/AddItemsDialog';

function parseCSV(text: string): Record<string, string>[] {
  const lines = text.split(/\r?\n/);
  if (lines.length === 0 || !lines[0].trim()) return [];

  const splitCSVLine = (line: string): string[] => {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current.trim());
    return result;
  };

  const headers = splitCSVLine(lines[0]).map(h => h.toLowerCase());
  const categoryIdx = headers.indexOf('category');
  const nameIdx = headers.indexOf('name');
  const priceIdx = headers.indexOf('price');
  const kitchenIdx = headers.indexOf('kitchen');

  if (categoryIdx === -1 || nameIdx === -1 || priceIdx === -1 || kitchenIdx === -1) {
    throw new Error('CSV must contain Category, Name, Price, and Kitchen columns.');
  }

  const results: Record<string, string>[] = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const cells = splitCSVLine(line);
    if (cells.length < Math.max(categoryIdx, nameIdx, priceIdx, kitchenIdx) + 1) continue;

    results.push({
      category: cells[categoryIdx],
      name: cells[nameIdx],
      price: cells[priceIdx],
      kitchen: cells[kitchenIdx]
    });
  }
  return results;
}

export const MenuManagementPage: React.FC = () => {
  const [menu, setMenu] = useState<MenuItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [isAdding, setIsAdding] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form states
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [category, setCategory] = useState('Veg Starters');
  const [kitchen, setKitchen] = useState<MenuItem['kitchen']>('Restaurant');
  const [active, setActive] = useState(true);

  // Edit form states
  const [editName, setEditName] = useState('');
  const [editPrice, setEditPrice] = useState('');
  const [editCategory, setEditCategory] = useState('');
  const [editKitchen, setEditKitchen] = useState<MenuItem['kitchen']>('Restaurant');

  useEffect(() => {
    const unsubscribe = subscribeToMenu((data) => {
      // Defer state updates to allow Framer Motion's mount transition to complete smoothly
      setTimeout(() => {
        setMenu(data);
        setIsLoading(false);
      }, 0);
    });
    return unsubscribe;
  }, []);

  // Filter items
  const filteredMenu = useMemo(() => {
    return menu.filter((item) => {
      const matchesSearch = item.name.toLowerCase().includes(search.toLowerCase()) || 
                            item.category.toLowerCase().includes(search.toLowerCase());
      const matchesCategory = selectedCategory === 'All' || item.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [menu, search, selectedCategory]);

  const handleDownloadTemplate = () => {
    const csvContent = 
      "Category,Name,Price,Kitchen\n" +
      "Veg Starters,French Fries Salted,59,Restaurant\n" +
      "Fried Rice (Veg),Veg Fried Rice,90,Fast Food\n" +
      "Noodles (Veg),Veg Noodles,90,Fast Food\n" +
      "Burgers,Fry Daddy Chicken Burger,109,Restaurant\n" +
      "Combo Packs,\"Burger Combo (Burger + French Fries + Mocktail)\",249,Restaurant\n";

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "menu_template.csv");
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleCSVUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const text = event.target?.result as string;
      if (!text) return;

      setIsImporting(true);
      try {
        const parsed = parseCSV(text);
        if (parsed.length === 0) {
          throw new Error('CSV is empty or no valid items found.');
        }

        const itemsToImport: Omit<MenuItem, 'id'>[] = parsed.map((row, index) => {
          if (!row.category || !row.name) {
            throw new Error(`Row ${index + 2} must have a Category and Name.`);
          }

          let priceVal: number | null = null;
          if (row.price.trim() !== '') {
            const parsedPrice = parseFloat(row.price);
            if (isNaN(parsedPrice)) {
              throw new Error(`Row ${index + 2} has an invalid Price: "${row.price}".`);
            }
            priceVal = parsedPrice;
          }

          let kitchenVal: MenuItem['kitchen'] = 'Restaurant';
          const lowerKitchen = row.kitchen.toLowerCase();
          if (lowerKitchen.includes('fast') || lowerKitchen.includes('food')) {
            kitchenVal = 'Fast Food';
          } else if (lowerKitchen.includes('rest') || lowerKitchen.includes('fran') || lowerKitchen.includes('house')) {
            kitchenVal = 'Restaurant';
          } else {
            const lowerCat = row.category.toLowerCase();
            if (
              lowerCat.includes('noodles') ||
              lowerCat.includes('rice') ||
              lowerCat.includes('manchur') ||
              (lowerCat.includes('starters') && lowerCat.includes('veg') && !lowerCat.includes('non')) ||
              lowerCat.includes('chilli')
            ) {
              kitchenVal = 'Fast Food';
            } else {
              kitchenVal = 'Restaurant';
            }
          }

          return {
            category: row.category.trim(),
            name: row.name.trim(),
            price: priceVal,
            kitchen: kitchenVal,
            active: priceVal !== null
          };
        });

        await importMenuFromList(itemsToImport);
        alert(`Successfully imported ${itemsToImport.length} menu items!`);
      } catch (err: any) {
        console.error(err);
        alert(err.message || 'Failed to parse or import CSV file.');
      } finally {
        setIsImporting(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };
    reader.onerror = () => {
      alert('Failed to read the file.');
      setIsImporting(false);
    };
    reader.readAsText(file);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !price) return;

    try {
      await createMenuItem({
        name: name.trim(),
        price: parseFloat(price),
        category,
        kitchen,
        active
      });

      // Reset
      setName('');
      setPrice('');
      setIsAdding(false);
    } catch (err) {
      console.error(err);
    }
  };

  const handleStartEdit = (item: MenuItem) => {
    setEditingId(item.id);
    setEditName(item.name);
    setEditPrice(item.price !== null ? item.price.toString() : '');
    setEditCategory(item.category);
    setEditKitchen(item.kitchen);
  };

  const handleUpdate = async (id: string) => {
    if (!editName.trim() || !editPrice) return;
    try {
      await updateMenuItem(id, {
        name: editName.trim(),
        price: parseFloat(editPrice),
        category: editCategory,
        kitchen: editKitchen,
        needsVerification: false
      });
      setEditingId(null);
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this menu item?')) {
      try {
        await deleteMenuItem(id);
      } catch (err) {
        console.error(err);
      }
    }
  };

  const handleToggleActive = async (item: MenuItem) => {
    if (item.price === null && !item.active) {
      alert('Cannot activate item: Menu item needs a price set first.');
      return;
    }
    try {
      await updateMenuItem(item.id, { active: !item.active });
    } catch (err) {
      console.error(err);
    }
  };

  const categories = useMemo(() => {
    const cats = Array.from(new Set(menu.map(item => item.category)));
    return ['All', ...cats.sort()];
  }, [menu]);

  if (isLoading) {
    return (
      <div className="flex flex-col gap-6 py-6 animate-pulse">
        {/* Title skeleton */}
        <div className="h-10 w-48 bg-slate-200 dark:bg-slate-900 rounded-xl" />
        {/* Filter skeleton */}
        <div className="h-14 bg-slate-200 dark:bg-slate-900/60 border border-slate-200/50 dark:border-slate-800/80 rounded-2xl" />
        {/* Card grid skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-36 bg-slate-200 dark:bg-slate-900 rounded-3xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 pb-12">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">Menu Management</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm font-light">
            Add, update, or toggle items on the franchise and fast food menus.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleDownloadTemplate}
            className="flex items-center gap-2 px-5 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-900 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-xl text-sm font-bold border border-slate-200 dark:border-slate-800 shadow-xs cursor-pointer transition-all"
            title="Download CSV template"
          >
            <Download className="w-4 h-4" />
            <span>Template</span>
          </button>

          <input
            type="file"
            ref={fileInputRef}
            onChange={handleCSVUpload}
            accept=".csv"
            style={{ display: 'none' }}
          />

          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isImporting}
            className="flex items-center gap-2 px-5 py-2.5 bg-indigo-500 hover:bg-indigo-600 dark:bg-indigo-600 dark:hover:bg-indigo-500 text-white rounded-xl text-sm font-bold shadow-md cursor-pointer transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isImporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
            {isImporting ? 'Uploading...' : 'Upload CSV'}
          </button>

          <button
            onClick={() => setIsAdding(!isAdding)}
            className="flex items-center gap-2 px-5 py-2.5 bg-emerald-500 hover:bg-emerald-600 dark:bg-emerald-400 dark:text-slate-950 dark:hover:bg-emerald-350 text-white rounded-xl text-sm font-bold shadow-md cursor-pointer transition-colors"
          >
            {isAdding ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
            {isAdding ? 'Cancel' : 'Add Menu Item'}
          </button>
        </div>
      </div>

      {/* Add Item Panel */}
      <AnimatePresence>
        {isAdding && (
          <motion.form
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            onSubmit={handleCreate}
            className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-xl grid grid-cols-1 md:grid-cols-3 gap-5 items-end overflow-hidden"
          >
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-400 uppercase">Item Name</label>
              <input
                type="text"
                placeholder="e.g. Manchuria Dry"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-400 uppercase">Price (₹)</label>
              <input
                type="number"
                placeholder="Price"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                required
                min="0"
                step="0.01"
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-400 uppercase">Category</label>
              <input
                type="text"
                list="existing-categories"
                placeholder="e.g. Veg Starters"
                value={category}
                onChange={(e) => {
                  const val = e.target.value;
                  setCategory(val);
                  // Automatically map kitchen target
                  const lowerVal = val.toLowerCase();
                  if (
                    lowerVal.includes('noodles') ||
                    lowerVal.includes('rice') ||
                    lowerVal.includes('manchur') ||
                    (lowerVal.includes('starters') && lowerVal.includes('veg') && !lowerVal.includes('non')) ||
                    lowerVal.includes('chilli')
                  ) {
                    setKitchen('Fast Food');
                  } else {
                    setKitchen('Restaurant');
                  }
                }}
                required
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
              />
              <datalist id="existing-categories">
                {categories.filter(c => c !== 'All').map(c => (
                  <option key={c} value={c} />
                ))}
              </datalist>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-400 uppercase">Kitchen Target</label>
              <select
                value={kitchen}
                onChange={(e) => setKitchen(e.target.value as MenuItem['kitchen'])}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
              >
                <option value="Restaurant">Restaurant (Crispy Chicken, Burgers)</option>
                <option value="Fast Food">Fast Food (Noodles, Rice, Manchuria)</option>
              </select>
            </div>

            <div className="flex items-center gap-3 py-3.5">
              <input
                type="checkbox"
                id="activeCheckbox"
                checked={active}
                onChange={(e) => setActive(e.target.checked)}
                className="w-4 h-4 accent-emerald-500 rounded"
              />
              <label htmlFor="activeCheckbox" className="text-xs font-bold text-slate-400 uppercase cursor-pointer">
                Set Active immediately
              </label>
            </div>

            <button
              type="submit"
              className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-slate-200 dark:text-slate-950 text-white rounded-xl text-sm font-bold shadow-md cursor-pointer transition-colors"
            >
              Add Item
            </button>
          </motion.form>
        )}
      </AnimatePresence>

      {/* Filters Area */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 rounded-2xl shadow-sm">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search items..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
          />
        </div>

        {/* Categories Horizontal filters */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap cursor-pointer transition-all ${
                selectedCategory === cat
                  ? 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-950'
                  : 'bg-slate-50 dark:bg-slate-950 text-slate-500 dark:text-slate-400 border border-slate-200/50 dark:border-slate-850 hover:bg-slate-100 dark:hover:bg-slate-900'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Menu list Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredMenu.length === 0 ? (
          <div className="col-span-full text-center py-16 text-slate-400 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/50 dark:border-slate-800/80">
            <AlertCircle className="w-10 h-10 mx-auto text-slate-350 dark:text-slate-800 mb-2" />
            <p className="font-semibold text-sm">No menu items found</p>
            <p className="text-xs font-light">Create a new menu item above to get started.</p>
          </div>
        ) : (
          filteredMenu.map((item) => {
            const isEditing = editingId === item.id;
            return (
              <motion.div
                key={item.id}
                layout
                className={`p-5 rounded-3xl border transition-all duration-300 bg-white dark:bg-slate-900 ${
                  item.active 
                    ? 'border-slate-200/80 dark:border-slate-800/80 shadow-xs' 
                    : 'border-slate-200 dark:border-slate-800/50 opacity-60 bg-slate-50/50 dark:bg-slate-950/20'
                }`}
              >
                {isEditing ? (
                  /* Edit State */
                  <div className="space-y-4">
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                    
                    <div className="grid grid-cols-2 gap-3">
                      <input
                        type="number"
                        value={editPrice}
                        onChange={(e) => setEditPrice(e.target.value)}
                        className="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      />
                      
                      <input
                        type="text"
                        list="existing-categories"
                        placeholder="Category"
                        value={editCategory}
                        onChange={(e) => setEditCategory(e.target.value)}
                        className="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      />
                    </div>

                    <select
                      value={editKitchen}
                      onChange={(e) => setEditKitchen(e.target.value as MenuItem['kitchen'])}
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-xs"
                    >
                      <option value="Restaurant">Restaurant</option>
                      <option value="Fast Food">Fast Food</option>
                    </select>

                    <div className="flex gap-2.5 justify-end">
                      <button
                        onClick={() => setEditingId(null)}
                        className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-850 hover:bg-slate-100 cursor-pointer"
                      >
                        <X className="w-4 h-4 text-slate-500" />
                      </button>
                      <button
                        onClick={() => handleUpdate(item.id)}
                        className="p-1.5 rounded-lg bg-emerald-500 text-white dark:bg-emerald-400 dark:text-slate-950 cursor-pointer"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ) : (
                  /* Display State */
                  <div className="flex flex-col h-full justify-between">
                    <div>
                      <div className="flex items-center justify-end gap-2 mb-2">
                        {/* Active toggle switch */}
                        <button 
                          onClick={() => handleToggleActive(item)}
                          className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                          title={item.active ? 'Disable item' : 'Enable item'}
                        >
                          {item.active ? (
                            <ToggleRight className="w-7 h-7 text-emerald-500" />
                          ) : (
                            <ToggleLeft className="w-7 h-7" />
                          )}
                        </button>
                      </div>

                      <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-1">{item.name}</h3>
                      <p className="text-sm text-slate-400 font-light mb-4">{item.kitchen}</p>
                    </div>

                    <div className="flex items-center justify-between border-t border-slate-100 dark:border-slate-800/80 pt-3">
                      {item.price !== null ? (
                        <span className="text-xl font-extrabold text-slate-900 dark:text-white">₹{item.price}</span>
                      ) : (
                        <span className="text-xs font-semibold text-rose-500 flex items-center gap-1">
                          <AlertCircle className="w-3.5 h-3.5" /> Needs Price
                        </span>
                      )}
                      
                      <div className="flex gap-1">
                        <button
                          onClick={() => handleStartEdit(item)}
                          className="p-2 rounded-xl text-slate-500 hover:text-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer transition-colors"
                          title="Edit"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(item.id)}
                          className="p-2 rounded-xl text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/20 cursor-pointer transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </motion.div>
            );
          })
        )}
      </div>
    </div>
  );
};
