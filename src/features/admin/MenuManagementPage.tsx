import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  subscribeToMenu, 
  createMenuItem, 
  updateMenuItem, 
  deleteMenuItem, 
  batchImportMenuItems,
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
  AlertCircle,
  Upload,
  Download,
  FileSpreadsheet
} from 'lucide-react';
import { getCategoryBadgeStyles } from '@/features/menu/AddItemsDialog';
import * as XLSX from 'xlsx';

export const MenuManagementPage: React.FC = () => {
  const [menu, setMenu] = useState<MenuItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

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

  // File Upload states
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [parsedImportItems, setParsedImportItems] = useState<Omit<MenuItem, 'id'>[]>([]);
  const [showImportModal, setShowImportModal] = useState(false);
  const [isSavingImport, setIsSavingImport] = useState(false);

  useEffect(() => {
    const unsubscribe = subscribeToMenu((data) => {
      setMenu(data);
      setIsLoading(false);
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
        kitchen: editKitchen
      });
      setEditingId(null);
    } catch (err) {
      console.error(err);
    }
  };

  const handleToggleActive = async (item: MenuItem) => {
    try {
      await updateMenuItem(item.id, { active: !item.active });
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this menu item?')) return;
    try {
      await deleteMenuItem(id);
    } catch (err) {
      console.error(err);
    }
  };

  // Export Current Menu / Excel Template Downloader
  const handleDownloadTemplate = () => {
    const exportData = menu.length > 0 ? menu.map((item) => ({
      Name: item.name,
      Price: item.price,
      Category: item.category,
      Kitchen: item.kitchen,
      Active: item.active !== false ? 'TRUE' : 'FALSE'
    })) : [
      { Name: 'Chicken Biryani', Price: 220, Category: 'Rice', Kitchen: 'Restaurant', Active: 'TRUE' },
      { Name: 'Paneer Butter Masala', Price: 180, Category: 'Main Course', Kitchen: 'Restaurant', Active: 'TRUE' },
      { Name: 'Crispy French Fries', Price: 90, Category: 'Fast Food', Kitchen: 'Fast Food', Active: 'TRUE' },
      { Name: 'Cold Coffee', Price: 70, Category: 'Beverages', Kitchen: 'Fast Food', Active: 'TRUE' }
    ];
    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Current Menu');
    const dateStr = new Date().toISOString().split('T')[0];
    XLSX.writeFile(workbook, `fry_daddy_menu_${dateStr}.xlsx`);
  };

  // Excel / CSV File Parsing Handler
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = new Uint8Array(event.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const jsonData = XLSX.utils.sheet_to_json<any>(worksheet);

        if (!jsonData || jsonData.length === 0) {
          alert('The selected Excel/CSV file is empty or formatted incorrectly.');
          return;
        }

        const items: Omit<MenuItem, 'id'>[] = jsonData.map((row: any) => {
          const itemName = String(row.Name || row.name || row['Item Name'] || '').trim();
          const itemPrice = parseFloat(row.Price || row.price || '0') || 0;
          const itemCategory = String(row.Category || row.category || 'General').trim();
          let rawKitchen = String(row.Kitchen || row.kitchen || 'Restaurant').trim();
          if (rawKitchen === 'Fast Food Kitchen') rawKitchen = 'Fast Food';
          if (rawKitchen === 'Franchise Kitchen') rawKitchen = 'Restaurant';
          const activeVal = row.Active !== undefined ? String(row.Active).toUpperCase() !== 'FALSE' : true;

          return {
            name: itemName,
            price: itemPrice,
            category: itemCategory || 'General',
            kitchen: (rawKitchen === 'Fast Food' ? 'Fast Food' : 'Restaurant') as MenuItem['kitchen'],
            active: activeVal
          };
        }).filter(item => item.name.length > 0);

        if (items.length === 0) {
          alert('No valid menu items could be read. Make sure columns are named Name, Price, Category, Kitchen.');
          return;
        }

        setParsedImportItems(items);
        setShowImportModal(true);
      } catch (err) {
        console.error('Error reading excel file:', err);
        alert('Failed to parse Excel file. Please ensure it is a valid .xlsx, .xls, or .csv file.');
      }
    };
    reader.readAsArrayBuffer(file);
    if (e.target) e.target.value = '';
  };

  // Confirm Import Handler
  const handleConfirmImport = async () => {
    if (parsedImportItems.length === 0) return;
    setIsSavingImport(true);
    try {
      await batchImportMenuItems(parsedImportItems);
      setShowImportModal(false);
      setParsedImportItems([]);
    } catch (err) {
      console.error('Failed to import menu items:', err);
      alert('Error saving imported menu items.');
    } finally {
      setIsSavingImport(false);
    }
  };

  const categories = useMemo(() => {
    const cats = Array.from(new Set(menu.map(item => item.category)));
    return ['All', ...cats.sort()];
  }, [menu]);

  if (isLoading) {
    return (
      <div className="flex flex-col gap-6 py-6 animate-pulse">
        <div className="h-10 w-48 bg-slate-200 dark:bg-slate-900 rounded-xl" />
        <div className="h-14 bg-slate-200 dark:bg-slate-900/60 border border-slate-200/50 dark:border-slate-800/80 rounded-2xl" />
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
      {/* Title & Action Buttons */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">Menu Management</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm font-light">
            Add, update, or toggle items on the franchise and fast food menus.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={handleDownloadTemplate}
            className="flex items-center gap-2 px-3.5 py-2 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-900 rounded-xl text-xs font-bold shadow-xs cursor-pointer transition-all"
            title="Download current live menu items as Excel file"
          >
            <Download className="w-3.5 h-3.5 text-slate-400" />
            Export Current Menu
          </button>

          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx, .xls, .csv"
            onChange={handleFileChange}
            className="hidden"
          />

          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-2 px-3.5 py-2 border border-blue-500/30 bg-blue-500/10 text-blue-600 dark:text-blue-400 hover:bg-blue-500/20 rounded-xl text-xs font-bold shadow-xs cursor-pointer transition-all"
            title="Upload Excel or CSV file to bulk import menu items"
          >
            <Upload className="w-3.5 h-3.5" />
            Upload Excel / CSV
          </button>

          <button
            onClick={() => setIsAdding(!isAdding)}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 dark:bg-emerald-400 dark:text-slate-950 dark:hover:bg-emerald-350 text-white rounded-xl text-xs font-bold shadow-md cursor-pointer transition-colors"
          >
            {isAdding ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
            {isAdding ? 'Cancel' : 'Add Item'}
          </button>
        </div>
      </div>

      {/* Add Item Form Panel */}
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
                placeholder="e.g. 150"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                required
                min="0"
                step="any"
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-400 uppercase">Category</label>
              <input
                type="text"
                placeholder="e.g. Veg Starters, Drinks"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                required
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-400 uppercase">Kitchen Target</label>
              <select
                value={kitchen}
                onChange={(e) => setKitchen(e.target.value as MenuItem['kitchen'])}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
              >
                <option value="Restaurant">Restaurant Counter (B1)</option>
                <option value="Fast Food">Fast Food Counter (B2)</option>
              </select>
            </div>

            <div className="flex items-center gap-2 pb-2">
              <label className="text-xs font-bold text-slate-400 uppercase cursor-pointer flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={active}
                  onChange={(e) => setActive(e.target.checked)}
                  className="w-4 h-4 rounded text-emerald-500 focus:ring-emerald-500"
                />
                Active Item
              </label>
            </div>

            <div className="md:col-span-3 flex justify-end">
              <button
                type="submit"
                className="px-6 py-2.5 bg-emerald-500 hover:bg-emerald-600 dark:bg-emerald-400 dark:text-slate-950 text-white rounded-xl text-sm font-bold shadow-md cursor-pointer transition-colors"
              >
                Create Menu Item
              </button>
            </div>
          </motion.form>
        )}
      </AnimatePresence>

      {/* Filters Area (Stacked Row 1: Search, Row 2: Categories) */}
      <div className="flex flex-col gap-4 p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 rounded-2xl shadow-sm">
        {/* Row 1: Search */}
        <div className="relative w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search items..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
          />
        </div>

        {/* Row 2: Categories Horizontal filters */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none w-full">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap cursor-pointer transition-all ${
                selectedCategory === cat
                  ? 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-950'
                  : 'bg-slate-50 dark:bg-slate-955 text-slate-500 dark:text-slate-400 border border-slate-200/50 dark:border-slate-850 hover:bg-slate-100 dark:hover:bg-slate-900'
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
            <p className="text-xs font-light">Create a new menu item above or upload an Excel file.</p>
          </div>
        ) : (
          filteredMenu.map((item) => {
            const isEditing = editingId === item.id;
            return (
              <motion.div
                key={item.id}
                layout
                className={`p-5 rounded-3xl border transition-all shadow-sm flex flex-col justify-between ${
                  item.active
                    ? 'bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800/80'
                    : 'bg-slate-50/70 dark:bg-slate-950/40 border-slate-200/40 dark:border-slate-850/40 opacity-70'
                }`}
              >
                {isEditing ? (
                  /* Edit Mode */
                  <div className="space-y-3">
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase">Name</label>
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="w-full px-3 py-1.5 rounded-lg border text-xs bg-slate-50 dark:bg-slate-950 font-bold"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[10px] font-bold text-slate-400 uppercase">Price (₹)</label>
                        <input
                          type="number"
                          value={editPrice}
                          onChange={(e) => setEditPrice(e.target.value)}
                          className="w-full px-3 py-1.5 rounded-lg border text-xs bg-slate-50 dark:bg-slate-950 font-bold"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-slate-400 uppercase">Category</label>
                        <input
                          type="text"
                          value={editCategory}
                          onChange={(e) => setEditCategory(e.target.value)}
                          className="w-full px-3 py-1.5 rounded-lg border text-xs bg-slate-50 dark:bg-slate-950 font-bold"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase">Kitchen</label>
                      <select
                        value={editKitchen}
                        onChange={(e) => setEditKitchen(e.target.value as MenuItem['kitchen'])}
                        className="w-full px-3 py-1.5 rounded-lg border text-xs bg-slate-50 dark:bg-slate-950"
                      >
                        <option value="Restaurant">Restaurant Counter (B1)</option>
                        <option value="Fast Food">Fast Food Counter (B2)</option>
                      </select>
                    </div>

                    <div className="flex justify-end gap-2 pt-2">
                      <button
                        onClick={() => setEditingId(null)}
                        className="px-3 py-1.5 rounded-lg text-xs font-bold border border-slate-200 dark:border-slate-800"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => handleUpdate(item.id)}
                        className="px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-500 text-white dark:bg-emerald-400 dark:text-slate-950"
                      >
                        Save
                      </button>
                    </div>
                  </div>
                ) : (
                  /* Display Mode */
                  <>
                    <div>
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h3 className="font-extrabold text-base leading-snug">{item.name}</h3>
                          <span className={`inline-block mt-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${getCategoryBadgeStyles(item.category)}`}>
                            {item.category}
                          </span>
                        </div>
                        <span className="text-lg font-black text-emerald-600 dark:text-emerald-400 shrink-0">
                          ₹{item.price}
                        </span>
                      </div>
                    </div>

                    <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-850 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                          item.kitchen === 'Restaurant'
                            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                            : 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400'
                        }`}>
                          {item.kitchen === 'Restaurant' ? 'Restaurant Counter' : 'Fast Food Counter'}
                        </span>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleToggleActive(item)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
                          title={item.active ? "Deactivate item" : "Activate item"}
                        >
                          {item.active ? (
                            <ToggleRight className="w-5 h-5 text-emerald-500" />
                          ) : (
                            <ToggleLeft className="w-5 h-5 text-slate-400" />
                          )}
                        </button>
                        <button
                          onClick={() => handleStartEdit(item)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-blue-500 cursor-pointer"
                          title="Edit item"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(item.id)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 cursor-pointer"
                          title="Delete item"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </motion.div>
            );
          })
        )}
      </div>

      {/* Excel Upload Preview Modal */}
      <AnimatePresence>
        {showImportModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => !isSavingImport && setShowImportModal(false)}
              className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs"
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-2xl overflow-hidden z-10"
            >
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4 mb-4">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-blue-500/10 text-blue-500 rounded-xl">
                    <FileSpreadsheet className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-lg">Confirm Excel Import</h3>
                    <p className="text-xs text-slate-400">
                      Preview of {parsedImportItems.length} menu items parsed from file
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setShowImportModal(false)}
                  disabled={isSavingImport}
                  className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Preview Table */}
              <div className="max-h-72 overflow-y-auto border border-slate-100 dark:border-slate-850 rounded-2xl font-sans mb-6">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-950 sticky top-0 font-bold text-slate-400 uppercase border-b border-slate-100 dark:border-slate-800">
                    <tr>
                      <th className="py-2.5 px-3">Item Name</th>
                      <th className="py-2.5 px-3">Price</th>
                      <th className="py-2.5 px-3">Category</th>
                      <th className="py-2.5 px-3">Kitchen</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-850">
                    {parsedImportItems.map((item, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-850/30">
                        <td className="py-2 px-3 font-semibold">{item.name}</td>
                        <td className="py-2 px-3 font-bold text-emerald-500">₹{item.price}</td>
                        <td className="py-2 px-3">{item.category}</td>
                        <td className="py-2 px-3">{item.kitchen} Counter</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex items-center justify-end gap-3">
                <button
                  onClick={() => setShowImportModal(false)}
                  disabled={isSavingImport}
                  className="px-4 py-2 rounded-xl text-xs font-bold border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmImport}
                  disabled={isSavingImport}
                  className="flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-bold bg-blue-500 hover:bg-blue-600 dark:bg-blue-400 dark:text-slate-950 dark:hover:bg-blue-350 text-white shadow-md cursor-pointer transition-colors"
                >
                  {isSavingImport ? (
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Check className="w-4 h-4" />
                  )}
                  {isSavingImport ? 'Importing...' : `Import ${parsedImportItems.length} Items`}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
