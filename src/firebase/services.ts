import { 
  collection, 
  doc, 
  setDoc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  onSnapshot, 
  query, 
  where, 
  runTransaction,
  writeBatch,
  getDoc,
  getDocs,
  deleteField
} from 'firebase/firestore';
import { db, isFirebaseConfigured } from './config';
import { menuSeed, type MenuKitchen, type MenuSeedItem } from '@/data/menuSeed';
export type { MenuKitchen, MenuSeedItem };

// ----------------------------------------------------
// TYPES
// ----------------------------------------------------
export interface Table {
  id: string;
  number: string;
  location: 'Inside' | 'Outside';
  status: 'Available' | 'Occupied' | 'Payment Pending' | 'Paid' | 'Cleaning';
  currentOrderId: string | null;
  lastPaymentCollectedBy?: string | null;
  lastPaymentTimestamp?: number | null;
}

export interface MenuItem {
  id: string;
  name: string;
  price: number | null;
  category: string;
  kitchen: MenuKitchen;
  active: boolean;
  needsVerification?: boolean;
}

export interface Order {
  id: string;
  tableId: string;
  status: 'Active' | 'Completed';
  subtotal: number;
  total: number;
  paymentStatus: 'Unpaid' | 'Pending' | 'Paid';
  collectedBy: string | null;
  paidAt: number | null;
  createdAt: number;
  updatedAt: number;
}

export interface OrderItem {
  id: string;
  orderId: string;
  menuItemId: string;
  itemName: string;
  price: number;
  quantity: number;
  category: string;
  kitchen: MenuKitchen;
  notes: string | null;
  createdAt: number;
  served?: boolean;
  status?: 'Pending' | 'Accepted' | 'Completed';
  kitchenNotified?: boolean;

  // Realtime Kitchen Send fields:
  availableAt?: string;
  kitchenStatus?: 'Not Sent' | 'Pending' | 'Accepted' | 'Completed';
  sentAt?: number;
  acceptedAt?: number;
  acceptedBy?: string;
  completedAt?: number;
  completedBy?: string;
}

export interface KitchenNotification {
  id: string; // notificationId
  orderId: string;
  tableId: string;
  tableNumber: string;
  sourceCounter: string;
  targetCounter: string;
  items: Array<{
    itemId: string;
    itemName: string;
    quantity: number;
    category: string;
    availableAt: string;
  }>;
  status: 'Pending' | 'Accepted' | 'Completed';
  createdAt: number;
  acceptedAt: number | null;
  acceptedBy: string | null;
  createdBy: string;
  completedAt?: number | null;
  completedBy?: string | null;
}


export interface PaymentNotification {
  id: string;
  orderId: string;
  tableId: string;
  tableName: string;
  paidByCounter: string;
  targetCounter: string;
  paymentMethod: string;
  paidAmount: number;
  items: string[];
  status: 'pending' | 'acknowledged';
  createdAt: number;
  acknowledgedAt: number | null;
  read: boolean;

  // Backwards compatibility fields:
  sourceCounter?: string;
  itemNames?: string[];
  total?: number;
  message?: string;
}

export interface OrderNotification {
  id: string;
  orderId: string;
  tableId: string;
  tableName: string;
  sourceCounter: string;
  targetCounter: string;
  items: Array<{ itemName: string; quantity: number; kitchen?: string; itemId?: string }>;
  status: 'Pending' | 'Accepted';
  createdAt: number;
  acceptedAt: number | null;
  acceptedBy: string | null;
}

export const KITCHEN_TO_COUNTER: Record<string, string> = {
  'Restaurant': 'B1',
  'Fast Food': 'B2',
  'Franchise Kitchen': 'B1',
  'Fast Food Kitchen': 'B2',
  'Franchise': 'B1',
  'B1': 'B1',
  'B2': 'B2'
};

// ----------------------------------------------------
// PRE-SEEDED DATA
// ----------------------------------------------------
const INITIAL_TABLES: Table[] = [
  // Outside (Fast Food Counter)
  { id: 'A1', number: 'A1', location: 'Outside', status: 'Available', currentOrderId: null },
  { id: 'A2', number: 'A2', location: 'Outside', status: 'Available', currentOrderId: null },
  { id: 'A3', number: 'A3', location: 'Outside', status: 'Available', currentOrderId: null },
  { id: 'A4', number: 'A4', location: 'Outside', status: 'Available', currentOrderId: null },
  { id: 'A5', number: 'A5', location: 'Outside', status: 'Available', currentOrderId: null },
  { id: 'A6', number: 'A6', location: 'Outside', status: 'Available', currentOrderId: null },
  // Online Orders
  { id: 'ONLINE_1', number: 'Online order 1', location: 'Outside', status: 'Available', currentOrderId: null },
  { id: 'ONLINE_2', number: 'Online order 2', location: 'Outside', status: 'Available', currentOrderId: null },
  { id: 'ONLINE_3', number: 'Online order 3', location: 'Outside', status: 'Available', currentOrderId: null },
  { id: 'ONLINE_4', number: 'Online order 4', location: 'Outside', status: 'Available', currentOrderId: null },
  // Parcel Orders
  { id: 'PARCEL_1', number: 'Parcel order 1', location: 'Outside', status: 'Available', currentOrderId: null },
  { id: 'PARCEL_2', number: 'Parcel order 2', location: 'Outside', status: 'Available', currentOrderId: null },
  { id: 'PARCEL_3', number: 'Parcel order 3', location: 'Outside', status: 'Available', currentOrderId: null },
  { id: 'PARCEL_4', number: 'Parcel order 4', location: 'Outside', status: 'Available', currentOrderId: null },
  // Inside
  { id: 'S1', number: 'S1', location: 'Inside', status: 'Available', currentOrderId: null },
  { id: 'S2', number: 'S2', location: 'Inside', status: 'Available', currentOrderId: null },
  { id: 'S3', number: 'S3', location: 'Inside', status: 'Available', currentOrderId: null },
  { id: 'S4', number: 'S4', location: 'Inside', status: 'Available', currentOrderId: null },
  { id: 'S5', number: 'S5', location: 'Inside', status: 'Available', currentOrderId: null },
  { id: 'S6', number: 'S6', location: 'Inside', status: 'Available', currentOrderId: null },
  { id: 'S7', number: 'S7', location: 'Inside', status: 'Available', currentOrderId: null },
  { id: 'S8', number: 'S8', location: 'Inside', status: 'Available', currentOrderId: null },
  { id: 'S9', number: 'S9', location: 'Inside', status: 'Available', currentOrderId: null },
  { id: 'S10', number: 'S10', location: 'Inside', status: 'Available', currentOrderId: null },
  { id: 'S11', number: 'S11', location: 'Inside', status: 'Available', currentOrderId: null },
  { id: 'S12', number: 'S12', location: 'Inside', status: 'Available', currentOrderId: null },
];

const INITIAL_MENU: MenuItem[] = [
  // Franchise
  { id: 'm1', name: 'Crispy Chicken', price: 220, category: 'Franchise', kitchen: 'Restaurant', active: true },
  { id: 'm2', name: 'Chicken Burger', price: 120, category: 'Franchise', kitchen: 'Restaurant', active: true },
  { id: 'm3', name: 'Club Sandwich', price: 90, category: 'Franchise', kitchen: 'Restaurant', active: true },
  // Fast Food
  { id: 'm4', name: 'Hakka Noodles', price: 140, category: 'Fast Food', kitchen: 'Fast Food', active: true },
  { id: 'm5', name: 'Veg Fried Rice', price: 150, category: 'Fast Food', kitchen: 'Fast Food', active: true },
  { id: 'm6', name: 'Manchuria Wet', price: 135, category: 'Fast Food', kitchen: 'Fast Food', active: true },
  // Drinks
  { id: 'm7', name: 'Coca Cola 350ml', price: 40, category: 'Drinks', kitchen: 'Restaurant', active: true },
  { id: 'm8', name: 'Virgin Mojito', price: 120, category: 'Drinks', kitchen: 'Restaurant', active: true },
  // Ice Cream
  { id: 'm9', name: 'Vanilla Scoop', price: 60, category: 'Ice Cream', kitchen: 'Restaurant', active: true },
  { id: 'm10', name: 'Chocolate Sundae', price: 95, category: 'Ice Cream', kitchen: 'Restaurant', active: true },
];

// ----------------------------------------------------
// LOCAL MOCK STATE (For Demo Mode)
// ----------------------------------------------------
class MockDatabase {
  private tables: Table[] = [];
  private menu: MenuItem[] = [];
  private orders: Map<string, Order> = new Map();
  private orderItems: Map<string, OrderItem[]> = new Map(); // orderId -> items
  private paymentNotifications: PaymentNotification[] = [];
  private orderNotifications: OrderNotification[] = [];
  private kitchenNotifications: KitchenNotification[] = [];

  private listeners: Map<string, Set<(data: any) => void>> = new Map();

  constructor() {
    this.loadFromStorage();
    window.addEventListener('storage', (event) => {
      if (!event.key || !event.key.startsWith('r_')) return;
      this.loadFromStorage(false);
      this.notifyLocalListeners();
    });
  }

  private loadFromStorage(persist = true) {
    try {
      const storedTables = localStorage.getItem('r_tables');
      const storedMenu = localStorage.getItem('r_menu');
      const storedOrders = localStorage.getItem('r_orders');
      const storedItems = localStorage.getItem('r_items');
      const storedPaymentNotifications = localStorage.getItem('r_payment_notifications');
      const storedOrderNotifications = localStorage.getItem('r_order_notifications');
      const storedKitchenNotifications = localStorage.getItem('r_kitchen_notifications');

      const tablesData = storedTables ? JSON.parse(storedTables) : [];
      const hasOldIds = tablesData.some((t: any) => t.id.startsWith('I') || t.id.startsWith('O'));
      if (hasOldIds || !storedTables || tablesData.length === 0) {
        this.tables = [...INITIAL_TABLES];
      } else {
        const existingIds = new Set(tablesData.map((t: any) => t.id));
        const missingTables = INITIAL_TABLES.filter(t => !existingIds.has(t.id));
        let mergedTables = missingTables.length > 0 ? [...tablesData, ...missingTables] : tablesData;
        
        // Filter out legacy single-table IDs (ONLINE_ORDERS and PARCEL_ORDERS)
        mergedTables = mergedTables.filter((t: any) => t.id !== 'ONLINE_ORDERS' && t.id !== 'PARCEL_ORDERS');

        // Sync updated number labels
        mergedTables = mergedTables.map((t: any) => {
          if (t.id === 'ONLINE_1') return { ...t, number: 'Online order 1' };
          if (t.id === 'PARCEL_1') return { ...t, number: 'Parcel order 1' };
          if (t.id === 'ONLINE_2') return { ...t, number: 'Online order 2' };
          if (t.id === 'ONLINE_3') return { ...t, number: 'Online order 3' };
          if (t.id === 'ONLINE_4') return { ...t, number: 'Online order 4' };
          if (t.id === 'PARCEL_2') return { ...t, number: 'Parcel order 2' };
          if (t.id === 'PARCEL_3') return { ...t, number: 'Parcel order 3' };
          if (t.id === 'PARCEL_4') return { ...t, number: 'Parcel order 4' };
          return t;
        });

        this.tables = mergedTables;
        if (persist) {
          localStorage.setItem('r_tables', JSON.stringify(this.tables));
        }
      }
      const parsedMenu = storedMenu ? JSON.parse(storedMenu) : [...INITIAL_MENU];
      this.menu = parsedMenu.map((item: any) => {
        let kitchen = item.kitchen;
        if (kitchen === 'Fast Food Kitchen') {
          kitchen = 'Fast Food';
        } else if (kitchen === 'Franchise Kitchen') {
          kitchen = 'Restaurant';
        }
        return { ...item, kitchen };
      });

      if (storedOrders) {
        const parsedOrders = JSON.parse(storedOrders);
        this.orders = new Map(Object.entries(parsedOrders));
      }
      if (storedItems) {
        const parsedItems = JSON.parse(storedItems);
        const migratedItems: Record<string, OrderItem[]> = {};
        Object.entries(parsedItems).forEach(([orderId, itemsList]) => {
          if (Array.isArray(itemsList)) {
            migratedItems[orderId] = itemsList.map((item: any) => {
              let kitchen = item.kitchen;
              if (kitchen === 'Fast Food Kitchen') {
                kitchen = 'Fast Food';
              } else if (kitchen === 'Franchise Kitchen') {
                kitchen = 'Restaurant';
              }
              return { ...item, kitchen };
            });
          }
        });
        this.orderItems = new Map(Object.entries(migratedItems));
      }
      if (storedPaymentNotifications) {
        this.paymentNotifications = JSON.parse(storedPaymentNotifications);
      } else {
        this.paymentNotifications = [];
      }
      if (storedOrderNotifications) {
        this.orderNotifications = JSON.parse(storedOrderNotifications);
      } else {
        this.orderNotifications = [];
      }
      if (storedKitchenNotifications) {
        this.kitchenNotifications = JSON.parse(storedKitchenNotifications);
      } else {
        this.kitchenNotifications = [];
      }

      if (persist) {
        this.saveToStorage();
      }
    } catch (e) {
      this.tables = [...INITIAL_TABLES];
      this.menu = [...INITIAL_MENU];
    }
  }

  private saveToStorage() {
    localStorage.setItem('r_tables', JSON.stringify(this.tables));
    localStorage.setItem('r_menu', JSON.stringify(this.menu));
    localStorage.setItem('r_orders', JSON.stringify(Object.fromEntries(this.orders)));
    localStorage.setItem('r_items', JSON.stringify(Object.fromEntries(this.orderItems)));
    localStorage.setItem('r_payment_notifications', JSON.stringify(this.paymentNotifications));
    localStorage.setItem('r_order_notifications', JSON.stringify(this.orderNotifications));
    localStorage.setItem('r_kitchen_notifications', JSON.stringify(this.kitchenNotifications));
  }

  public subscribe(key: string, callback: (data: any) => void) {
    if (!this.listeners.has(key)) {
      this.listeners.set(key, new Set());
    }
    this.listeners.get(key)!.add(callback);
    callback(this.getData(key));
    return () => {
      this.listeners.get(key)!.delete(callback);
    };
  }

  private notify(key: string) {
    this.saveToStorage();
    if (this.listeners.has(key)) {
      const data = this.getData(key);
      this.listeners.get(key)!.forEach(cb => cb(data));
    }
  }

  private notifyLocalListeners() {
    this.listeners.forEach((callbacks, key) => {
      const data = this.getData(key);
      callbacks.forEach(cb => cb(data));
    });
  }

  private getData(key: string): any {
    if (key === 'tables') return [...this.tables];
    if (key === 'menu') return [...this.menu];
    if (key.startsWith('paymentNotifications:')) {
      const targetCounter = key.split(':')[1];
      return this.paymentNotifications
        .filter((entry) => entry.targetCounter === targetCounter)
        .sort((a, b) => b.createdAt - a.createdAt)
        .slice(0, 10);
    }
    if (key.startsWith('orderNotifications:')) {
      const targetCounter = key.split(':')[1];
      return this.orderNotifications
        .filter((entry) => entry.targetCounter === targetCounter && entry.status === 'Pending')
        .sort((a, b) => b.createdAt - a.createdAt);
    }
    if (key.startsWith('kitchenNotifications:')) {
      const targetCounter = key.split(':')[1];
      return this.kitchenNotifications
        .filter((entry) => entry.targetCounter === targetCounter && entry.status === 'Pending')
        .sort((a, b) => b.createdAt - a.createdAt);
    }
    if (key.startsWith('allKitchenNotifications:')) {
      const targetCounter = key.split(':')[1];
      return this.kitchenNotifications
        .filter((entry) => entry.targetCounter === targetCounter)
        .sort((a, b) => b.createdAt - a.createdAt);
    }
    if (key.startsWith('orderItems:')) {
      const orderId = key.split(':')[1];
      return [...(this.orderItems.get(orderId) || [])].sort((a, b) => b.createdAt - a.createdAt);
    }
    if (key.startsWith('order:')) {
      const orderId = key.split(':')[1];
      return this.orders.get(orderId) || null;
    }
    return null;
  }

  // State mutation operations
  public getTable(tableId: string): Table | undefined {
    return this.tables.find(t => t.id === tableId);
  }

  public getMenu(): MenuItem[] {
    return this.menu;
  }

  public updateTable(tableId: string, updates: Partial<Table>) {
    this.tables = this.tables.map(t => {
      if (t.id === tableId) {
        return { ...t, ...updates };
      }
      return t;
    });
    this.notify('tables');
  }

  public createOrder(tableId: string, actor: 'B1' | 'B2'): string {
    const orderId = 'ORD_' + Math.random().toString(36).substr(2, 9).toUpperCase();
    const now = Date.now();
    const order: Order = {
      id: orderId,
      tableId,
      status: 'Active',
      subtotal: 0,
      total: 0,
      paymentStatus: 'Unpaid',
      collectedBy: null,
      paidAt: null,
      createdAt: now,
      updatedAt: now
    };

    this.orders.set(orderId, order);
    this.updateTable(tableId, { status: 'Occupied', currentOrderId: orderId });

    this.notify(`order:${orderId}`);
    return orderId;
  }

  public addOrderItem(orderId: string, menuItem: MenuItem, quantity: number, notes: string | null, actor: 'B1' | 'B2') {
    const itemPrice = menuItem.price;
    if (itemPrice === null) {
      throw new Error('Menu item needs price verification before ordering');
    }

    const order = this.orders.get(orderId);
    if (!order) return;

    const currentItems = this.orderItems.get(orderId) || [];
    
    // Check if item already exists in this order to increment quantity (no duplicates)
    const existingIndex = currentItems.findIndex(i => i.menuItemId === menuItem.id && i.notes === notes);
    const now = Date.now();

    if (existingIndex > -1) {
      currentItems[existingIndex].quantity += quantity;
    } else {
      const newItem: OrderItem = {
        id: 'ITEM_' + Math.random().toString(36).substr(2, 9).toUpperCase(),
        orderId,
        menuItemId: menuItem.id,
        itemName: menuItem.name,
        price: itemPrice,
        quantity,
        category: menuItem.category,
        kitchen: menuItem.kitchen,
        notes,
        createdAt: now,
        status: getCounterForKitchen(menuItem.kitchen) === actor ? 'Accepted' : 'Pending',
        availableAt: getCounterForKitchen(menuItem.kitchen),
        kitchenStatus: getCounterForKitchen(menuItem.kitchen) === actor ? 'Accepted' : 'Not Sent'
      };
      currentItems.push(newItem);
    }

    this.orderItems.set(orderId, currentItems);

    // Update totals
    const subtotal = currentItems.reduce((acc, item) => acc + (item.price * item.quantity), 0);
    order.subtotal = subtotal;
    order.total = subtotal;
    order.updatedAt = now;
    this.orders.set(orderId, order);

    // Always ensure associated table is Occupied with currentOrderId linked
    const table = this.tables.find(t => t.currentOrderId === orderId || t.id === order.tableId);
    if (table) {
      this.updateTable(table.id, { status: 'Occupied', currentOrderId: orderId });
    }

    this.notify(`order:${orderId}`);
    this.notify(`orderItems:${orderId}`);
  }

  public updateOrderItemQuantity(orderId: string, itemId: string, quantity: number, actor: 'B1' | 'B2') {
    const order = this.orders.get(orderId);
    const items = this.orderItems.get(orderId) || [];
    const item = items.find(i => i.id === itemId);
    if (!order || !item) return;

    if (item.price === null) {
      throw new Error('Menu item needs price verification before ordering');
    }

    if (quantity <= 0) {
      // Remove item
      this.orderItems.set(orderId, items.filter(i => i.id !== itemId));
    } else {
      item.quantity = quantity;
    }

    const now = Date.now();
    const newItems = this.orderItems.get(orderId) || [];
    const subtotal = newItems.reduce((acc, i) => acc + (i.price * i.quantity), 0);
    order.subtotal = subtotal;
    order.total = subtotal;
    order.updatedAt = now;
    this.orders.set(orderId, order);

    this.notify(`order:${orderId}`);
    this.notify(`orderItems:${orderId}`);
  }

  public updateOrderItemServedStatus(orderId: string, itemId: string, served: boolean, actor: 'B1' | 'B2') {
    const items = this.orderItems.get(orderId) || [];
    const item = items.find(i => i.id === itemId);
    if (!item) return;

    item.served = served;
    this.orderItems.set(orderId, items);

    this.saveToStorage();
    this.notify(`orderItems:${orderId}`);
  }

  public markOrderPaymentPending(orderId: string, actor: 'B1' | 'B2') {
    const order = this.orders.get(orderId);
    if (!order) return;

    order.paymentStatus = 'Pending';
    order.updatedAt = Date.now();
    this.orders.set(orderId, order);

    this.updateTable(order.tableId, { status: 'Payment Pending' });

    this.notify(`order:${orderId}`);
  }

  public collectPayment(orderId: string, collectedBy: 'B1' | 'B2') {
    const order = this.orders.get(orderId);
    if (!order) return;

    const now = Date.now();
    order.paymentStatus = 'Paid';
    order.collectedBy = collectedBy;
    order.paidAt = now;
    order.updatedAt = now;
    this.orders.set(orderId, order);

    this.updateTable(order.tableId, {
      status: 'Paid',
      lastPaymentCollectedBy: collectedBy,
      lastPaymentTimestamp: now
    });

    const itemsList = this.orderItems.get(orderId) || [];
    const tableObj = this.getTable(order.tableId);
    const tableName = tableObj ? tableObj.number : order.tableId;

    const itemsByCounter: Record<string, OrderItem[]> = {};
    itemsList.forEach((item) => {
      const target = KITCHEN_TO_COUNTER[item.kitchen] || 'B1';
      if (!itemsByCounter[target]) {
        itemsByCounter[target] = [];
      }
      itemsByCounter[target].push(item);
    });

    Object.entries(itemsByCounter).forEach(([targetCounter, list]) => {
      if (targetCounter !== collectedBy && list.length > 0) {
        // Check for null item price when creating notifications
        const validItems = list.filter(item => item.price !== null);
        if (validItems.length === 0) {
          return; // Skip if no valid items (all have null price)
        }

        const itemNames = validItems.map((item) => item.itemName);
        const paidAmount = validItems.reduce((sum, item) => sum + (item.price ?? 0) * item.quantity, 0);
        const paymentMethod = collectedBy === 'B1' ? 'UPI' : (collectedBy === 'B2' ? 'Cash' : 'UPI');

        const notification: PaymentNotification = {
          id: 'PAY_' + Math.random().toString(36).substr(2, 9).toUpperCase(),
          orderId,
          tableId: order.tableId,
          tableName,
          paidByCounter: collectedBy,
          targetCounter,
          paymentMethod,
          paidAmount,
          items: itemNames,
          status: 'pending',
          createdAt: now,
          acknowledgedAt: null,
          read: false,

          // Backwards compatibility fields:
          sourceCounter: collectedBy,
          itemNames,
          total: paidAmount,
          message: `Bill paid at Counter ${collectedBy} for: ${itemNames.join(', ')}`,
        };

        this.paymentNotifications.unshift(notification);
        this.notify(`paymentNotifications:${targetCounter}`);
      }
    });

    this.notify(`order:${orderId}`);
  }

  public closeTable(orderId: string, actor: 'B1' | 'B2') {
    const order = this.orders.get(orderId);
    if (!order) return;

    order.status = 'Completed';
    order.updatedAt = Date.now();
    this.orders.set(orderId, order);

    // Reset table structure
    this.updateTable(order.tableId, { 
      status: 'Available', 
      currentOrderId: null,
      lastPaymentCollectedBy: null,
      lastPaymentTimestamp: null
    });

    this.notify(`order:${orderId}`);
  }

  // Admin menu management
  public createMenuItem(item: Omit<MenuItem, 'id'>) {
    const newItem: MenuItem = {
      ...item,
      id: 'MENU_' + Math.random().toString(36).substr(2, 9).toUpperCase(),
    };
    this.menu.push(newItem);
    this.notify('menu');
  }

  public updateMenuItem(itemId: string, updates: Partial<MenuItem>) {
    this.menu = this.menu.map(m => m.id === itemId ? { ...m, ...updates } : m);
    this.notify('menu');
  }

  public deleteMenuItem(itemId: string) {
    this.menu = this.menu.filter(m => m.id !== itemId);
    this.notify('menu');
  }

  public setMenuItem(item: MenuItem) {
    const idx = this.menu.findIndex(m => m.id === item.id);
    if (idx > -1) {
      this.menu[idx] = item;
    } else {
      this.menu.push(item);
    }
    this.notify('menu');
  }

  public clearMenu() {
    this.menu = [];
    this.notify('menu');
  }

  public acknowledgeNotification(notificationId: string) {
    this.paymentNotifications = this.paymentNotifications.map(n => 
      n.id === notificationId ? { ...n, status: 'acknowledged', acknowledgedAt: Date.now(), read: true } : n
    );
    this.notify('paymentNotifications:B2');
    this.notify('paymentNotifications:B1');
  }

  public createOrderNotification(notification: Omit<OrderNotification, 'id'>): string {
    const id = 'ON-' + Math.floor(Math.random() * 1000000);
    const newNotif = { ...notification, id };
    this.orderNotifications.push(newNotif);
    this.notify(`orderNotifications:${notification.targetCounter}`);
    return id;
  }

  public acceptOrderNotification(notificationId: string, acceptedBy: string): void {
    this.orderNotifications = this.orderNotifications.map(n => 
      n.id === notificationId 
        ? { ...n, status: 'Accepted' as const, acceptedAt: Date.now(), acceptedBy } 
        : n
    );
    const notif = this.orderNotifications.find(n => n.id === notificationId);
    if (notif) {
      const items = this.orderItems.get(notif.orderId) || [];
      const notificationItemIds = new Set((notif.items || []).map((entry) => entry.itemId).filter(Boolean));
      const updatedItems = items.map(item => {
        const matchesNotification = notificationItemIds.size > 0
          ? notificationItemIds.has(item.id)
          : getCounterForKitchen(item.kitchen) === notif.targetCounter;
        if (matchesNotification) {
          return { ...item, status: 'Accepted' as const };
        }
        return item;
      });
      this.orderItems.set(notif.orderId, updatedItems);

      this.saveToStorage();
      this.notify(`orderItems:${notif.orderId}`);
      this.notify(`orderNotifications:${notif.targetCounter}`);
    }
  }

  public createKitchenNotification(notification: Omit<KitchenNotification, 'id'>): string {
    const id = 'KN-' + Math.floor(Math.random() * 1000000);
    const newNotif = { ...notification, id };
    this.kitchenNotifications.push(newNotif as any);

    // Update order items
    const orderId = notification.orderId;
    const items = this.orderItems.get(orderId) || [];
    const itemIds = new Set(notification.items.map(i => i.itemId));
    const updated = items.map(item => {
      if (itemIds.has(item.id)) {
        return {
          ...item,
          kitchenStatus: 'Pending' as const,
          sentAt: Date.now()
        };
      }
      return item;
    });
    this.orderItems.set(orderId, updated);

    this.saveToStorage();
    this.notify(`orderItems:${orderId}`);
    this.notify(`kitchenNotifications:${notification.targetCounter}`);
    this.notify(`allKitchenNotifications:${notification.targetCounter}`);
    return id;
  }

  public acceptKitchenNotification(notificationId: string, acceptedBy: string): void {
    this.kitchenNotifications = this.kitchenNotifications.map(n =>
      n.id === notificationId
        ? { ...n, status: 'Accepted' as const, acceptedAt: Date.now(), acceptedBy } as any
        : n
    );
    const notif = this.kitchenNotifications.find(n => n.id === notificationId);
    if (notif) {
      const items = this.orderItems.get(notif.orderId) || [];
      const itemIds = new Set(notif.items.map(i => i.itemId));
      const updated = items.map(item => {
        if (itemIds.has(item.id)) {
          return {
            ...item,
            status: 'Accepted' as const,
            kitchenStatus: 'Accepted' as const,
            acceptedAt: Date.now(),
            acceptedBy
          };
        }
        return item;
      });
      this.orderItems.set(notif.orderId, updated);

      this.saveToStorage();
      this.notify(`orderItems:${notif.orderId}`);
      this.notify(`kitchenNotifications:${notif.targetCounter}`);
      this.notify(`allKitchenNotifications:${notif.targetCounter}`);
    }
  }

  public completeKitchenNotification(notificationId: string, completedBy: string): void {
    this.kitchenNotifications = this.kitchenNotifications.map(n =>
      n.id === notificationId
        ? { ...n, status: 'Completed' as const, completedAt: Date.now(), completedBy } as any
        : n
    );
    const notif = this.kitchenNotifications.find(n => n.id === notificationId);
    if (notif) {
      const items = this.orderItems.get(notif.orderId) || [];
      const itemIds = new Set(notif.items.map(i => i.itemId));
      const updated = items.map(item => {
        if (itemIds.has(item.id)) {
          return {
            ...item,
            status: 'Completed' as const,
            kitchenStatus: 'Completed' as const,
            completedAt: Date.now(),
            completedBy
          };
        }
        return item;
      });
      this.orderItems.set(notif.orderId, updated);

      this.saveToStorage();
      this.notify(`orderItems:${notif.orderId}`);
      this.notify(`kitchenNotifications:${notif.targetCounter}`);
      this.notify(`allKitchenNotifications:${notif.targetCounter}`);
    }
  }

  public resetOrderItemKitchenStatus(orderId: string, itemId: string): void {
    const items = this.orderItems.get(orderId) || [];
    const updated = items.map(item => {
      if (item.id === itemId) {
        return {
          ...item,
          kitchenStatus: 'Not Sent' as const,
          sentAt: undefined,
          acceptedAt: undefined,
          acceptedBy: undefined
        };
      }
      return item;
    });
    this.orderItems.set(orderId, updated);
    this.saveToStorage();
    this.notify(`orderItems:${orderId}`);
  }

  public markOrderItemKitchenAcceptedImmediately(orderId: string, itemId: string, actor: string): void {
    const items = this.orderItems.get(orderId) || [];
    const item = items.find(i => i.id === itemId);
    if (!item) return;

    const updated = items.map(i => {
      if (i.id === itemId) {
        return {
          ...i,
          status: 'Accepted' as const,
          kitchenStatus: 'Accepted' as const,
          acceptedAt: Date.now(),
          acceptedBy: actor
        };
      }
      return i;
    });
    this.orderItems.set(orderId, updated);

    this.saveToStorage();
    this.notify(`orderItems:${orderId}`);
  }

  public markOrderItemKitchenNotified(orderId: string, itemId: string, actor: 'B1' | 'B2') {
    const items = this.orderItems.get(orderId) || [];
    const item = items.find(i => i.id === itemId);
    if (!item) return;

    item.kitchenNotified = true;
    this.orderItems.set(orderId, items);

    this.saveToStorage();
    this.notify(`orderItems:${orderId}`);
  }

  public acceptSingleOrderItem(orderId: string, itemId: string, actor: 'B1' | 'B2') {
    const items = this.orderItems.get(orderId) || [];
    const item = items.find(i => i.id === itemId);
    if (!item) return;

    item.status = 'Accepted';
    item.kitchenStatus = 'Accepted';
    this.orderItems.set(orderId, items);

    this.saveToStorage();
    this.notify(`orderItems:${orderId}`);
  }

  public getAllOrders(): Order[] {
    return Array.from(this.orders.values());
  }

  public getOrderItemsForReports(): OrderItem[] {
    return Array.from(this.orderItems.values()).flat();
  }
}

export const mockDb = new MockDatabase();

// ----------------------------------------------------
// REAL FIRESTORE LISTENERS AND FUNCTIONS
// ----------------------------------------------------

export function subscribeToTables(callback: (tables: Table[]) => void) {
  if (!isFirebaseConfigured) {
    return mockDb.subscribe('tables', callback);
  }

  return onSnapshot(
    collection(db, 'tables'), 
    (snapshot) => {
      const tables: Table[] = [];
      snapshot.forEach((doc) => {
        tables.push({ id: doc.id, ...doc.data() } as Table);
      });
      // Sort tables to maintain consistent order (numeric aware sorting: S1, S2, ..., S10, S11, S12)
      tables.sort((a, b) => {
        const aMatch = a.id.match(/^([A-Za-z]+)(\d+)$/);
        const bMatch = b.id.match(/^([A-Za-z]+)(\d+)$/);
        if (aMatch && bMatch) {
          const aLetter = aMatch[1];
          const aNum = parseInt(aMatch[2], 10);
          const bLetter = bMatch[1];
          const bNum = parseInt(bMatch[2], 10);
          if (aLetter !== bLetter) {
            return aLetter.localeCompare(bLetter);
          }
          return aNum - bNum;
        }
        return a.id.localeCompare(b.id);
      });
      callback(tables);
    },
    async (error) => {
      console.error('Error listening to tables, initializing if empty:', error);
      // Auto-initialize tables in Firestore if permission is available
      try {
        const snap = await getDocs(collection(db, 'tables'));
        if (snap.empty) {
          const batch = writeBatch(db);
          INITIAL_TABLES.forEach((table) => {
            const docRef = doc(db, 'tables', table.id);
            batch.set(docRef, table);
          });
          await batch.commit();
        }
      } catch (err) {
        console.error('Failed to auto-seed tables:', err);
      }
    }
  );
}

export function subscribeToMenu(callback: (menu: MenuItem[]) => void) {
  if (!isFirebaseConfigured) {
    return mockDb.subscribe('menu', callback);
  }

  return onSnapshot(
    collection(db, 'menu'),
    (snapshot) => {
      const menu: MenuItem[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        let kitchen = data.kitchen;
        let needsUpdate = false;
        if (kitchen === 'Fast Food Kitchen') {
          kitchen = 'Fast Food';
          needsUpdate = true;
        } else if (kitchen === 'Franchise Kitchen') {
          kitchen = 'Restaurant';
          needsUpdate = true;
        }
        if (needsUpdate) {
          const docRef = doc(db, 'menu', docSnap.id);
          updateDoc(docRef, { kitchen }).catch(err => console.error('Failed to migrate kitchen target in menu:', err));
        }
        menu.push({ id: docSnap.id, ...data, kitchen } as MenuItem);
      });
      callback(menu);
    },
    async (error) => {
      console.error('Error listening to menu, seeding default menu:', error);
      // Auto-initialize menu in Firestore if permission is available
      try {
        const snap = await getDocs(collection(db, 'menu'));
        if (snap.empty) {
          const batch = writeBatch(db);
          INITIAL_MENU.forEach((item) => {
            const docRef = doc(db, 'menu', item.id);
            batch.set(docRef, item);
          });
          await batch.commit();
        }
      } catch (err) {
        console.error('Failed to auto-seed menu:', err);
      }
    }
  );
}

export function subscribeToOrder(orderId: string, callback: (order: Order | null) => void) {
  if (!isFirebaseConfigured) {
    return mockDb.subscribe(`order:${orderId}`, callback);
  }

  return onSnapshot(doc(db, 'orders', orderId), (docSnap) => {
    if (docSnap.exists()) {
      callback({ id: docSnap.id, ...docSnap.data() } as Order);
    } else {
      callback(null);
    }
  });
}

export function subscribeToOrderItems(orderId: string, callback: (items: OrderItem[]) => void) {
  if (!isFirebaseConfigured) {
    return mockDb.subscribe(`orderItems:${orderId}`, callback);
  }

  const q = query(
    collection(db, 'orderItems'),
    where('orderId', '==', orderId)
  );

  return onSnapshot(q, (snapshot) => {
    const items: OrderItem[] = [];
    snapshot.forEach((docSnap) => {
      const data = docSnap.data();
      let kitchen = data.kitchen;
      let needsUpdate = false;
      if (kitchen === 'Fast Food Kitchen') {
        kitchen = 'Fast Food';
        needsUpdate = true;
      } else if (kitchen === 'Franchise Kitchen') {
        kitchen = 'Restaurant';
        needsUpdate = true;
      }
      if (needsUpdate) {
        const docRef = doc(db, 'orderItems', docSnap.id);
        updateDoc(docRef, { kitchen }).catch(err => console.error('Failed to migrate kitchen target in order item:', err));
      }
      items.push({ id: docSnap.id, ...data, kitchen } as OrderItem);
    });
    items.sort((a, b) => b.createdAt - a.createdAt);
    callback(items);
  }, (error) => {
    console.error('Error listening to order items:', error);
    callback([]);
  });
}


export function subscribeToPaymentNotifications(
  targetCounter: string,
  callback: (notifications: PaymentNotification[]) => void
) {
  if (!isFirebaseConfigured) {
    return mockDb.subscribe(`paymentNotifications:${targetCounter}`, callback);
  }

  const q = query(
    collection(db, 'paymentNotifications'),
    where('targetCounter', '==', targetCounter)
  );

  return onSnapshot(q, (snapshot) => {
    const notifications: PaymentNotification[] = [];
    snapshot.forEach((docSnap) => {
      const data = docSnap.data() as PaymentNotification;
      if (data.status === 'pending' || !data.read) {
        notifications.push({ ...data, id: docSnap.id } as PaymentNotification);
      }
    });
    notifications.sort((a, b) => b.createdAt - a.createdAt);
    callback(notifications.slice(0, 10));
  });
}

export function getCounterForKitchen(kitchen: string | undefined | null): string {
  if (!kitchen) return 'B1';
  return KITCHEN_TO_COUNTER[kitchen] || kitchen;
}

export async function createOrderNotification(
  notification: Omit<OrderNotification, 'id'>
): Promise<string> {
  if (!isFirebaseConfigured) {
    return mockDb.createOrderNotification(notification);
  }

  const docRef = await addDoc(collection(db, 'orderNotifications'), notification);
  return docRef.id;
}

export async function acceptOrderNotification(
  notificationId: string,
  acceptedBy: string
): Promise<void> {
  if (!isFirebaseConfigured) {
    return mockDb.acceptOrderNotification(notificationId, acceptedBy);
  }

  const notifRef = doc(db, 'orderNotifications', notificationId);
  const notifSnap = await getDoc(notifRef);
  if (!notifSnap.exists()) return;
  const notifData = notifSnap.data() as OrderNotification;

  const q = query(
    collection(db, 'orderItems'),
    where('orderId', '==', notifData.orderId)
  );
  const itemsSnap = await getDocs(q);
  const batch = writeBatch(db);
  itemsSnap.forEach((itemDoc) => {
    const itemData = itemDoc.data() as OrderItem;
    const notificationItemIds = new Set((notifData.items || []).map((entry) => entry.itemId).filter(Boolean));
    const matchesNotification = notificationItemIds.size > 0
      ? notificationItemIds.has(itemDoc.id)
      : getCounterForKitchen(itemData.kitchen) === notifData.targetCounter;
    if (matchesNotification) {
      batch.update(itemDoc.ref, { status: 'Accepted' });
    }
  });
  await batch.commit();

  await updateDoc(notifRef, {
    status: 'Accepted',
    acceptedAt: Date.now(),
    acceptedBy: acceptedBy
  });
}

export async function markOrderItemKitchenNotified(
  orderId: string,
  itemId: string,
  actor: 'B1' | 'B2'
): Promise<void> {
  if (!isFirebaseConfigured) {
    return mockDb.markOrderItemKitchenNotified(orderId, itemId, actor);
  }

  const itemRef = doc(db, 'orderItems', itemId);
  await updateDoc(itemRef, { kitchenNotified: true });
}

export async function acceptSingleOrderItem(
  orderId: string,
  itemId: string,
  actor: 'B1' | 'B2'
): Promise<void> {
  if (!isFirebaseConfigured) {
    return mockDb.acceptSingleOrderItem(orderId, itemId, actor);
  }

  const itemRef = doc(db, 'orderItems', itemId);
  await updateDoc(itemRef, { status: 'Accepted', kitchenStatus: 'Accepted' });
}

export function subscribeToOrderNotifications(
  targetCounter: string,
  callback: (notifications: OrderNotification[]) => void
) {
  if (!isFirebaseConfigured) {
    return mockDb.subscribe(`orderNotifications:${targetCounter}`, callback);
  }

  const q = query(
    collection(db, 'orderNotifications'),
    where('targetCounter', '==', targetCounter)
  );

  return onSnapshot(q, (snapshot) => {
    const notifications: OrderNotification[] = [];
    snapshot.forEach((docSnap) => {
      const notification = { ...docSnap.data(), id: docSnap.id } as OrderNotification;
      if (notification.status === 'Pending') {
        notifications.push(notification);
      }
    });
    notifications.sort((a, b) => b.createdAt - a.createdAt);
    callback(notifications);
  }, (error) => {
    console.error('Failed to subscribe to order notifications:', error);
    callback([]);
  });
}

export async function createKitchenNotification(
  notification: Omit<KitchenNotification, 'id'>
): Promise<string> {
  if (!isFirebaseConfigured) {
    return mockDb.createKitchenNotification(notification);
  }

  const batch = writeBatch(db);
  const docRef = doc(collection(db, 'kitchenNotifications'));
  batch.set(docRef, { ...notification, status: 'Pending', createdAt: Date.now() });

  notification.items.forEach((item) => {
    const itemRef = doc(db, 'orderItems', item.itemId);
    batch.update(itemRef, {
      kitchenStatus: 'Pending',
      sentAt: Date.now()
    });
  });

  await batch.commit();
  return docRef.id;
}

export async function acceptKitchenNotification(
  notificationId: string,
  acceptedBy: string
): Promise<void> {
  if (!isFirebaseConfigured) {
    return mockDb.acceptKitchenNotification(notificationId, acceptedBy);
  }

  const notifRef = doc(db, 'kitchenNotifications', notificationId);
  const notifSnap = await getDoc(notifRef);
  if (!notifSnap.exists()) return;
  const notifData = notifSnap.data() as KitchenNotification;

  // 1. Update the kitchen notification status first to clear the popup immediately
  await updateDoc(notifRef, {
    status: 'Accepted',
    acceptedAt: Date.now(),
    acceptedBy
  });

  // 2. Perform secondary updates safely in try/catch to prevent blocking the UI on non-existent records
  try {
    const batch = writeBatch(db);
    notifData.items.forEach((item) => {
      const itemRef = doc(db, 'orderItems', item.itemId);
      batch.update(itemRef, {
        status: 'Accepted',
        kitchenStatus: 'Accepted',
        acceptedAt: Date.now(),
        acceptedBy
      });
    });

    if (notifData.orderId) {
    }

    await batch.commit();
  } catch (error) {
    console.error('Failed to update secondary collections in acceptKitchenNotification:', error);
  }
}

export async function completeKitchenNotification(
  notificationId: string,
  completedBy: string
): Promise<void> {
  if (!isFirebaseConfigured) {
    return mockDb.completeKitchenNotification(notificationId, completedBy);
  }

  const notifRef = doc(db, 'kitchenNotifications', notificationId);
  const notifSnap = await getDoc(notifRef);
  if (!notifSnap.exists()) return;
  const notifData = notifSnap.data() as KitchenNotification;

  // 1. Update the kitchen notification status to Completed first
  await updateDoc(notifRef, {
    status: 'Completed',
    completedAt: Date.now(),
    completedBy
  });

  // 2. Safely perform secondary updates
  try {
    const batch = writeBatch(db);
    notifData.items.forEach((item) => {
      const itemRef = doc(db, 'orderItems', item.itemId);
      batch.update(itemRef, {
        status: 'Completed',
        kitchenStatus: 'Completed',
        completedAt: Date.now(),
        completedBy
      });
    });

    await batch.commit();
  } catch (error) {
    console.error('Failed to update secondary collections in completeKitchenNotification:', error);
  }
}

export function subscribeToKitchenNotifications(
  targetCounter: string,
  callback: (notifications: KitchenNotification[]) => void
) {
  if (!isFirebaseConfigured) {
    return mockDb.subscribe(`kitchenNotifications:${targetCounter}`, callback);
  }

  const q = query(
    collection(db, 'kitchenNotifications'),
    where('targetCounter', '==', targetCounter),
    where('status', '==', 'Pending')
  );

  return onSnapshot(q, (snapshot) => {
    const notifications: KitchenNotification[] = [];
    snapshot.forEach((docSnap) => {
      notifications.push({ ...docSnap.data(), id: docSnap.id } as KitchenNotification);
    });
    notifications.sort((a, b) => b.createdAt - a.createdAt);
    callback(notifications);
  }, (error) => {
    console.error('Failed to subscribe to kitchen notifications:', error);
    callback([]);
  });
}

export function subscribeToAllKitchenNotifications(
  targetCounter: string,
  callback: (notifications: KitchenNotification[]) => void
) {
  if (!isFirebaseConfigured) {
    return mockDb.subscribe(`allKitchenNotifications:${targetCounter}`, callback);
  }

  const q = query(
    collection(db, 'kitchenNotifications'),
    where('targetCounter', '==', targetCounter)
  );

  return onSnapshot(q, (snapshot) => {
    const notifications: KitchenNotification[] = [];
    snapshot.forEach((docSnap) => {
      notifications.push({ ...docSnap.data(), id: docSnap.id } as KitchenNotification);
    });
    notifications.sort((a, b) => b.createdAt - a.createdAt);
    callback(notifications);
  }, (error) => {
    console.error('Failed to subscribe to all kitchen notifications:', error);
    callback([]);
  });
}

export async function resetOrderItemKitchenStatus(
  orderId: string,
  itemId: string
): Promise<void> {
  if (!isFirebaseConfigured) {
    return mockDb.resetOrderItemKitchenStatus(orderId, itemId);
  }
  const itemRef = doc(db, 'orderItems', itemId);
  await updateDoc(itemRef, {
    kitchenStatus: 'Not Sent',
    sentAt: deleteField(),
    acceptedAt: deleteField(),
    acceptedBy: deleteField()
  });
}

export async function markOrderItemKitchenAcceptedImmediately(
  orderId: string,
  itemId: string,
  actor: string
): Promise<void> {
  if (!isFirebaseConfigured) {
    return mockDb.markOrderItemKitchenAcceptedImmediately(orderId, itemId, actor);
  }

  const itemRef = doc(db, 'orderItems', itemId);

  await updateDoc(itemRef, {
    status: 'Accepted',
    kitchenStatus: 'Accepted',
    acceptedAt: Date.now(),
    acceptedBy: actor
  });

}

// ----------------------------------------------------
// TRANSACTION & ACTION OPERATIONS
// ----------------------------------------------------

export async function createOrder(tableId: string, actor: 'B1' | 'B2'): Promise<string> {
  if (!isFirebaseConfigured) {
    return mockDb.createOrder(tableId, actor);
  }

  const orderRef = doc(collection(db, 'orders'));
  const orderId = orderRef.id;
  const now = Date.now();

  const newOrder = {
    tableId,
    status: 'Active',
    subtotal: 0,
    total: 0,
    paymentStatus: 'Unpaid',
    collectedBy: null,
    paidAt: null,
    createdAt: now,
    updatedAt: now
  };

  await runTransaction(db, async (transaction) => {
    // 1. Create order
    transaction.set(orderRef, newOrder);
    
    // 3. Update Table state safely with merge: true
    const tableRef = doc(db, 'tables', tableId);
    transaction.set(tableRef, {
      status: 'Occupied',
      currentOrderId: orderId
    }, { merge: true });
  });

  return orderId;
}

export async function addOrderItem(
  orderId: string, 
  menuItem: MenuItem, 
  quantity: number, 
  notes: string | null, 
  actor: 'B1' | 'B2'
): Promise<void> {
  const itemPrice = menuItem.price;
  if (itemPrice === null) {
    throw new Error('Menu item needs price verification before ordering');
  }

  if (!isFirebaseConfigured) {
    return mockDb.addOrderItem(orderId, menuItem, quantity, notes, actor);
  }

  const now = Date.now();
  const orderRef = doc(db, 'orders', orderId);
  const itemsColl = collection(db, 'orderItems');

  // Let's check if the item already exists in the active orderItems (with same notes)
  // To avoid duplicate rows and combine quantities.
  // In Firebase, we can fetch matching records first.
  const q = query(itemsColl, where('orderId', '==', orderId));
  const querySnap = await getDocs(q);
  const existingItemDoc = querySnap.docs.find((itemDoc) => {
    const item = itemDoc.data() as OrderItem;
    return item.menuItemId === menuItem.id && item.notes === notes;
  });

  await runTransaction(db, async (transaction) => {
    const orderDoc = await transaction.get(orderRef);
    if (!orderDoc.exists()) throw new Error('Order does not exist');

    const orderData = orderDoc.data() as Order;
    let oldSubtotal = orderData.subtotal || 0;

    let targetItemRef;
    let newQuantity = quantity;

    if (existingItemDoc) {
      // Exist, increment
      const existingDoc = existingItemDoc;
      targetItemRef = doc(db, 'orderItems', existingDoc.id);
      const existingData = existingDoc.data() as OrderItem;
      newQuantity = existingData.quantity + quantity;
      transaction.update(targetItemRef, { quantity: newQuantity });
    } else {
      // Create new
      targetItemRef = doc(collection(db, 'orderItems'));
      const newItem = {
        orderId,
        menuItemId: menuItem.id,
        itemName: menuItem.name,
        price: itemPrice,
        quantity,
        category: menuItem.category,
        kitchen: menuItem.kitchen,
        notes,
        createdAt: now,
        status: getCounterForKitchen(menuItem.kitchen) === actor ? 'Accepted' : 'Pending',
        availableAt: getCounterForKitchen(menuItem.kitchen),
        kitchenStatus: getCounterForKitchen(menuItem.kitchen) === actor ? 'Accepted' : 'Not Sent'
      };
      transaction.set(targetItemRef, newItem);
    }

    // Recalculate order subtotal
    const addedCost = itemPrice * quantity;
    const finalSubtotal = oldSubtotal + addedCost;

    transaction.update(orderRef, {
      subtotal: finalSubtotal,
      total: finalSubtotal,
      updatedAt: now
    });

    // Update table status and keep currentOrderId synced
    const tableRef = doc(db, 'tables', orderData.tableId);
    transaction.set(tableRef, {
      status: 'Occupied',
      currentOrderId: orderId
    }, { merge: true });
  });
}

export async function updateOrderItemQuantity(
  orderId: string,
  itemId: string,
  quantity: number,
  actor: 'B1' | 'B2'
): Promise<void> {
  if (!isFirebaseConfigured) {
    return mockDb.updateOrderItemQuantity(orderId, itemId, quantity, actor);
  }

  const orderRef = doc(db, 'orders', orderId);
  const itemRef = doc(db, 'orderItems', itemId);
  const now = Date.now();

  await runTransaction(db, async (transaction) => {
    const orderDoc = await transaction.get(orderRef);
    const itemDoc = await transaction.get(itemRef);

    if (!orderDoc.exists() || !itemDoc.exists()) {
      throw new Error('Order or Item does not exist');
    }

    const orderData = orderDoc.data() as Order;
    const itemData = itemDoc.data() as OrderItem;

    const oldQuantity = itemData.quantity;
    const itemPrice = itemData.price;
    if (itemPrice === null) {
      throw new Error('Menu item needs price verification before ordering');
    }
    const diffQuantity = quantity - oldQuantity;
    const priceDiff = itemPrice * diffQuantity;

    if (quantity <= 0) {
      transaction.delete(itemRef);
    } else {
      transaction.update(itemRef, { quantity });
    }

    const finalSubtotal = (orderData.subtotal || 0) + priceDiff;
    transaction.update(orderRef, {
      subtotal: finalSubtotal,
      total: finalSubtotal,
      updatedAt: now
    });
  });
}

export async function updateOrderItemServedStatus(
  orderId: string,
  itemId: string,
  served: boolean,
  actor: 'B1' | 'B2'
): Promise<void> {
  if (!isFirebaseConfigured) {
    return mockDb.updateOrderItemServedStatus(orderId, itemId, served, actor);
  }

  const itemRef = doc(db, 'orderItems', itemId);

  await runTransaction(db, async (transaction) => {
    const itemDoc = await transaction.get(itemRef);
    if (!itemDoc.exists()) {
      throw new Error('Item does not exist');
    }

    transaction.update(itemRef, { served });
  });
}

export async function markOrderPaymentPending(orderId: string, actor: 'B1' | 'B2'): Promise<void> {
  if (!isFirebaseConfigured) {
    return mockDb.markOrderPaymentPending(orderId, actor);
  }

  const orderRef = doc(db, 'orders', orderId);
  const now = Date.now();

  await runTransaction(db, async (transaction) => {
    const orderDoc = await transaction.get(orderRef);
    if (!orderDoc.exists()) throw new Error('Order not found');
    const orderData = orderDoc.data() as Order;

    transaction.update(orderRef, {
      paymentStatus: 'Pending',
      updatedAt: now
    });

    const tableRef = doc(db, 'tables', orderData.tableId);
    transaction.update(tableRef, {
      status: 'Payment Pending'
    });
  });
}

export async function collectPayment(orderId: string, collectedBy: 'B1' | 'B2'): Promise<void> {
  if (!isFirebaseConfigured) {
    return mockDb.collectPayment(orderId, collectedBy);
  }

  const orderRef = doc(db, 'orders', orderId);
  const itemsQuery = query(collection(db, 'orderItems'), where('orderId', '==', orderId));

  // Step 1: Read the order and items outside the transaction
  const orderSnap = await getDoc(orderRef);
  if (!orderSnap.exists()) {
    throw new Error('Order not found');
  }
  const orderData = orderSnap.data() as Order;

  const itemSnapshot = await getDocs(itemsQuery);
  const items: OrderItem[] = [];
  itemSnapshot.forEach((itemDoc) => {
    const item = { id: itemDoc.id, ...itemDoc.data() } as OrderItem;
    items.push(item);
  });

  // Group items by target counter (for the other counter)
  const itemsByCounter: Record<string, OrderItem[]> = {};
  items.forEach((item) => {
    const target = KITCHEN_TO_COUNTER[item.kitchen] || 'B1';
    if (!itemsByCounter[target]) {
      itemsByCounter[target] = [];
    }
    itemsByCounter[target].push(item);
  });

  const now = Date.now();

  await runTransaction(db, async (transaction) => {
    const orderDoc = await transaction.get(orderRef);
    if (!orderDoc.exists()) {
      throw new Error('Order not found');
    }

    const orderData = orderDoc.data() as Order;

    const tableRef = doc(db, 'tables', orderData.tableId);

    transaction.update(orderRef, {
      paymentStatus: 'Paid',
      collectedBy,
      paidAt: now,
      updatedAt: now
    });

    transaction.update(tableRef, {
      status: 'Paid',
      lastPaymentCollectedBy: collectedBy,
      lastPaymentTimestamp: now
    });
  });

  // Step 3: Outside the transaction, create payment notifications for items prepared by the other counter (using a batch)
  // Get table name for the notification (outside transaction)
  const tableRefForName = doc(db, 'tables', orderData.tableId);
  const tableSnap = await getDoc(tableRefForName);
  const tableNameForNotification = tableSnap.exists() ? (tableSnap.data()?.number || orderData.tableId) : orderData.tableId;

  const batch = writeBatch(db);
  Object.entries(itemsByCounter).forEach(([targetCounter, list]) => {
    if (targetCounter !== collectedBy && list.length > 0) {
      // Check for null item price when creating notifications
      const validItems = list.filter(item => item.price !== null);
      if (validItems.length === 0) {
        return; // Skip if no valid items (all have null price)
      }

      const itemNames = validItems.map((item) => item.itemName);
      const paidAmount = validItems.reduce((sum, item) => sum + (item.price ?? 0) * item.quantity, 0);
      const paymentMethod = collectedBy === 'B1' ? 'UPI' : (collectedBy === 'B2' ? 'Cash' : 'UPI');

      const notificationRef = doc(collection(db, 'paymentNotifications'));
      batch.set(notificationRef, {
        orderId,
        tableId: orderData.tableId,
        tableName: tableNameForNotification,
        paidByCounter: collectedBy,
        targetCounter,
        paymentMethod,
        paidAmount,
        items: itemNames,
        status: 'pending',
        createdAt: now,
        acknowledgedAt: null,
        read: false,

        // Backwards compatibility fields:
        sourceCounter: collectedBy,
        itemNames,
        total: paidAmount,
        message: `Bill paid at Counter ${collectedBy} for: ${itemNames.join(', ')}`,
      });
    }
  });

  await batch.commit();
}

export async function closeTable(orderId: string, actor: 'B1' | 'B2'): Promise<void> {
  if (!isFirebaseConfigured) {
    return mockDb.closeTable(orderId, actor);
  }

  const orderRef = doc(db, 'orders', orderId);
  const now = Date.now();

  await runTransaction(db, async (transaction) => {
    const orderDoc = await transaction.get(orderRef);
    if (!orderDoc.exists()) throw new Error('Order not found');
    const orderData = orderDoc.data() as Order;

    transaction.update(orderRef, {
      status: 'Completed',
      updatedAt: now
    });

    const tableRef = doc(db, 'tables', orderData.tableId);
    transaction.update(tableRef, {
      status: 'Available',
      currentOrderId: null,
      lastPaymentCollectedBy: null,
      lastPaymentTimestamp: null
    });
  });
}

export async function acknowledgePaymentNotification(notificationId: string): Promise<void> {
  if (!isFirebaseConfigured) {
    mockDb.acknowledgeNotification(notificationId);
    return;
  }
  const ref = doc(db, 'paymentNotifications', notificationId);
  await updateDoc(ref, { 
    status: 'acknowledged',
    acknowledgedAt: Date.now(),
    read: true 
  });
}

// ----------------------------------------------------
// ADMIN MENU OPERATIONS (CRUD)
// ----------------------------------------------------

export async function importDefaultMenu(): Promise<void> {
  const seededItems: MenuItem[] = menuSeed.map((item) => ({
    ...item,
    active: item.active ?? item.price !== null,
    needsVerification: item.needsVerification ?? item.price === null,
  }));

  if (!isFirebaseConfigured) {
    seededItems.forEach((item) => mockDb.setMenuItem(item));
    return;
  }

  const batch = writeBatch(db);
  seededItems.forEach((item) => {
    batch.set(doc(db, 'menu', item.id), item);
  });
  await batch.commit();
}

export async function importMenuFromList(items: Omit<MenuItem, 'id'>[]): Promise<void> {
  const mappedItems: MenuItem[] = items.map((item) => {
    const id = `${item.category}-${item.name}`.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    return {
      ...item,
      id,
      active: item.active ?? item.price !== null,
      needsVerification: item.price === null,
    };
  });

  if (!isFirebaseConfigured) {
    mockDb.clearMenu();
    mappedItems.forEach((item) => mockDb.setMenuItem(item));
    return;
  }

  // Fetch all existing menu items to delete them
  const menuSnap = await getDocs(collection(db, 'menu'));

  // Prepare chunked write batch operations
  const ops: Array<{ type: 'set' | 'delete'; ref: any; data?: any }> = [];

  menuSnap.forEach((docSnap) => {
    ops.push({ type: 'delete', ref: doc(db, 'menu', docSnap.id) });
  });

  mappedItems.forEach((item) => {
    ops.push({ type: 'set', ref: doc(db, 'menu', item.id), data: item });
  });

  const chunkSize = 400;
  for (let i = 0; i < ops.length; i += chunkSize) {
    const chunk = ops.slice(i, i + chunkSize);
    const batch = writeBatch(db);
    chunk.forEach((op) => {
      if (op.type === 'delete') {
        batch.delete(op.ref);
      } else if (op.type === 'set') {
        batch.set(op.ref, op.data);
      }
    });
    await batch.commit();
  }
}

export async function createMenuItem(item: Omit<MenuItem, 'id'>): Promise<void> {
  if (!isFirebaseConfigured) {
    return mockDb.createMenuItem(item);
  }
  const ref = doc(collection(db, 'menu'));
  await setDoc(ref, { ...item });
}

export async function updateMenuItem(itemId: string, updates: Partial<MenuItem>): Promise<void> {
  if (!isFirebaseConfigured) {
    return mockDb.updateMenuItem(itemId, updates);
  }
  const ref = doc(db, 'menu', itemId);
  await updateDoc(ref, updates);
}

export async function deleteMenuItem(itemId: string): Promise<void> {
  if (!isFirebaseConfigured) {
    return mockDb.deleteMenuItem(itemId);
  }
  const ref = doc(db, 'menu', itemId);
  await deleteDoc(ref);
}

export async function batchImportMenuItems(items: Omit<MenuItem, 'id'>[]): Promise<void> {
  if (!isFirebaseConfigured) {
    items.forEach(item => mockDb.createMenuItem(item));
    return;
  }

  const batch = writeBatch(db);
  items.forEach((item) => {
    const newDocRef = doc(collection(db, 'menu'));
    let kitchenTarget: MenuItem['kitchen'] = item.kitchen || 'Restaurant';
    if ((kitchenTarget as string) === 'Fast Food Kitchen') kitchenTarget = 'Fast Food';
    if ((kitchenTarget as string) === 'Franchise Kitchen') kitchenTarget = 'Restaurant';

    batch.set(newDocRef, {
      name: item.name.trim(),
      price: Number(item.price) || 0,
      category: item.category || 'General',
      kitchen: kitchenTarget,
      active: item.active !== false
    });
  });

  await batch.commit();
}

// Reports helpers
export async function getReportsData(): Promise<{ orders: Order[], items: OrderItem[] }> {
  if (!isFirebaseConfigured) {
    return {
      orders: mockDb.getAllOrders(),
      items: mockDb.getOrderItemsForReports()
    };
  }

  // Fetch all orders
  const ordersSnap = await getDocs(collection(db, 'orders'));
  const orders: Order[] = [];
  ordersSnap.forEach(d => {
    orders.push({ id: d.id, ...d.data() } as Order);
  });

  // Fetch all order items
  const itemsSnap = await getDocs(collection(db, 'orderItems'));
  const items: OrderItem[] = [];
  itemsSnap.forEach(docSnap => {
    const data = docSnap.data();
    let kitchen = data.kitchen;
    let needsUpdate = false;
    if (kitchen === 'Fast Food Kitchen') {
      kitchen = 'Fast Food';
      needsUpdate = true;
    } else if (kitchen === 'Franchise Kitchen') {
      kitchen = 'Restaurant';
      needsUpdate = true;
    }
    if (needsUpdate) {
      const docRef = doc(db, 'orderItems', docSnap.id);
      updateDoc(docRef, { kitchen }).catch(err => console.error('Failed to migrate kitchen target in reports:', err));
    }
    items.push({ id: docSnap.id, ...data, kitchen } as OrderItem);
  });

  return { orders, items };
}

// Initialize tables and menu once if Firestore is configured but has empty collections
export async function seedFirestoreIfEmpty(): Promise<void> {
  if (!isFirebaseConfigured) return;
  try {
    const tablesSnap = await getDocs(collection(db, 'tables'));
    const tables: any[] = [];
    tablesSnap.forEach(doc => {
      tables.push({ id: doc.id });
    });

    const hasOldIds = tables.some((t: any) => t.id.startsWith('I') || t.id.startsWith('O'));

    if (tablesSnap.empty || hasOldIds) {
      console.log('Seeding Firestore tables (updating schema)...');
      const batch = writeBatch(db);
      
      // Delete old tables if they exist
      if (hasOldIds) {
        tables.forEach(table => {
          if (table.id.startsWith('I') || table.id.startsWith('O')) {
            batch.delete(doc(db, 'tables', table.id));
          }
        });
      }

      // Add new tables
      INITIAL_TABLES.forEach(table => {
        batch.set(doc(db, 'tables', table.id), table);
      });
      
      await batch.commit();
      console.log('Firestore tables seeded successfully.');
    } else {
      // Append any missing tables from INITIAL_TABLES to Firestore dynamically
      const existingIds = new Set(tables.map(t => t.id));
      const missingTables = INITIAL_TABLES.filter(t => !existingIds.has(t.id));
      const batch = writeBatch(db);
      let needsCommit = false;

      if (missingTables.length > 0) {
        console.log(`Adding ${missingTables.length} missing tables to Firestore...`);
        missingTables.forEach(table => {
          batch.set(doc(db, 'tables', table.id), table);
        });
        needsCommit = true;
      }

      // Sync updated number labels in Firestore & delete legacy IDs
      tablesSnap.forEach(docSnap => {
        const data = docSnap.data();
        if (docSnap.id === 'ONLINE_ORDERS' || docSnap.id === 'PARCEL_ORDERS') {
          batch.delete(doc(db, 'tables', docSnap.id));
          needsCommit = true;
          return;
        }
        if (docSnap.id === 'ONLINE_1' && data.number !== 'Online order 1') {
          batch.update(doc(db, 'tables', docSnap.id), { number: 'Online order 1' });
          needsCommit = true;
        }
        if (docSnap.id === 'PARCEL_1' && data.number !== 'Parcel order 1') {
          batch.update(doc(db, 'tables', docSnap.id), { number: 'Parcel order 1' });
          needsCommit = true;
        }
        if (docSnap.id === 'ONLINE_2' && data.number !== 'Online order 2') {
          batch.update(doc(db, 'tables', docSnap.id), { number: 'Online order 2' });
          needsCommit = true;
        }
        if (docSnap.id === 'ONLINE_3' && data.number !== 'Online order 3') {
          batch.update(doc(db, 'tables', docSnap.id), { number: 'Online order 3' });
          needsCommit = true;
        }
        if (docSnap.id === 'ONLINE_4' && data.number !== 'Online order 4') {
          batch.update(doc(db, 'tables', docSnap.id), { number: 'Online order 4' });
          needsCommit = true;
        }
        if (docSnap.id === 'PARCEL_2' && data.number !== 'Parcel order 2') {
          batch.update(doc(db, 'tables', docSnap.id), { number: 'Parcel order 2' });
          needsCommit = true;
        }
        if (docSnap.id === 'PARCEL_3' && data.number !== 'Parcel order 3') {
          batch.update(doc(db, 'tables', docSnap.id), { number: 'Parcel order 3' });
          needsCommit = true;
        }
        if (docSnap.id === 'PARCEL_4' && data.number !== 'Parcel order 4') {
          batch.update(doc(db, 'tables', docSnap.id), { number: 'Parcel order 4' });
          needsCommit = true;
        }
      });

      if (needsCommit) {
        await batch.commit();
        console.log('Firestore tables updated successfully.');
      }
    }

    const menuSnap = await getDocs(collection(db, 'menu'));
    if (menuSnap.empty) {
      console.log('Seeding Firestore menu...');
      const batch = writeBatch(db);
      INITIAL_MENU.forEach(item => {
        batch.set(doc(db, 'menu', item.id), item);
      });
      await batch.commit();
    }
  } catch (error) {
    console.error('Failed to seed Firestore collections:', error);
  }
}









