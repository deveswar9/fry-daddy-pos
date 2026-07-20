import { describe, it, expect, beforeEach } from 'vitest';
import { mockDb, createOrder, addOrderItem, collectPayment, closeTable, subscribeToTables } from '../firebase/services';

describe('Services / Mock DB Order Lifecycle', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('creates an order and updates table status to Occupied', async () => {
    const tableId = 'A1';
    const orderId = await createOrder(tableId, 'B1');

    expect(orderId).toBeDefined();
    expect(orderId).toMatch(/^ORD_/);

    const table = mockDb.getTable(tableId);
    expect(table).toBeDefined();
    expect(table?.status).toBe('Occupied');
    expect(table?.currentOrderId).toBe(orderId);
  });

  it('adds items to order and updates order totals and table status', async () => {
    const tableId = 'A2';
    const orderId = await createOrder(tableId, 'B1');

    const menuItem = {
      id: 'm1',
      name: 'Crispy Chicken',
      price: 220,
      category: 'Franchise',
      kitchen: 'Restaurant' as const,
      active: true,
    };

    await addOrderItem(orderId, menuItem, 2, 'Extra crispy', 'B1');

    const orders = mockDb.getAllOrders();
    const order = orders.find((o) => o.id === orderId);

    expect(order).toBeDefined();
    expect(order?.subtotal).toBe(440);
    expect(order?.total).toBe(440);

    const table = mockDb.getTable(tableId);
    expect(table?.status).toBe('Occupied');
  });

  it('collects payment and updates status to Paid', async () => {
    const tableId = 'A3';
    const orderId = await createOrder(tableId, 'B1');

    await collectPayment(orderId, 'B1');

    const table = mockDb.getTable(tableId);
    expect(table?.status).toBe('Paid');
    expect(table?.lastPaymentCollectedBy).toBe('B1');
  });

  it('closes table and resets status to Available', async () => {
    const tableId = 'A4';
    const orderId = await createOrder(tableId, 'B1');

    await closeTable(orderId, 'B1');

    const table = mockDb.getTable(tableId);
    expect(table?.status).toBe('Available');
    expect(table?.currentOrderId).toBeNull();
  });
});
