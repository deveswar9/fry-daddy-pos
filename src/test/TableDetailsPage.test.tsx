import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { TableDetailsPage } from '../features/tables/TableDetailsPage';
import { AuthProvider } from '../context/AuthContext';
import { mockDb, createOrder } from '../firebase/services';

describe('TableDetailsPage Component', () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem('restaurant_counter', 'B1');
  });

  it('renders Available status empty state for un-ordered table A1', async () => {
    render(
      <AuthProvider>
        <MemoryRouter initialEntries={['/table/A1']}>
          <Routes>
            <Route path="/table/:id" element={<TableDetailsPage />} />
          </Routes>
        </MemoryRouter>
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getAllByText(/Table A1/i).length).toBeGreaterThan(0);
    });

    expect(screen.getByText(/Table A1 is free/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Add Items/i })).toBeInTheDocument();
  });

  it('displays Occupied status and Active Order Items when order exists', async () => {
    const orderId = await createOrder('A1', 'B1');
    const menuItem = {
      id: 'm1',
      name: 'Crispy Chicken',
      price: 220,
      category: 'Franchise',
      kitchen: 'Restaurant' as const,
      active: true,
    };
    await mockDb.addOrderItem(orderId, menuItem, 1, null, 'B1');

    render(
      <AuthProvider>
        <MemoryRouter initialEntries={['/table/A1']}>
          <Routes>
            <Route path="/table/:id" element={<TableDetailsPage />} />
          </Routes>
        </MemoryRouter>
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getAllByText(/Crispy Chicken/i).length).toBeGreaterThan(0);
    });

    expect(screen.getByText(/Active Order Items/i)).toBeInTheDocument();
    expect(screen.getByText(/Occupied/i)).toBeInTheDocument();
  });
});
