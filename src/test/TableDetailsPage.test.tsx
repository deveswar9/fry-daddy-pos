import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { TableDetailsPage } from '../features/tables/TableDetailsPage';
import { AuthProvider } from '../context/AuthContext';
import { ThemeProvider } from '../context/ThemeContext';
import { mockDb, createOrder } from '../firebase/services';

describe('TableDetailsPage Component', () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem('restaurant_counter', 'B1');
  });

  it('renders Available status empty state for un-ordered table A1', async () => {
    render(
      <AuthProvider>
        <ThemeProvider>
          <MemoryRouter initialEntries={['/table/A1']}>
            <Routes>
              <Route path="/table/:id" element={<TableDetailsPage />} />
            </Routes>
          </MemoryRouter>
        </ThemeProvider>
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
        <ThemeProvider>
          <MemoryRouter initialEntries={['/table/A1']}>
            <Routes>
              <Route path="/table/:id" element={<TableDetailsPage />} />
            </Routes>
          </MemoryRouter>
        </ThemeProvider>
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getAllByText(/Crispy Chicken/i).length).toBeGreaterThan(0);
    });

    expect(screen.getByText(/Active Order Items/i)).toBeInTheDocument();
    expect(screen.getByText(/Occupied/i)).toBeInTheDocument();
  });

  it('hides Print button in payment dialog when print setting is OFF', async () => {
    localStorage.setItem('print_button_enabled', 'false');
    const orderId = await createOrder('S1', 'B1');
    const menuItem = {
      id: 'm2',
      name: 'Fries',
      price: 100,
      category: 'Sides',
      kitchen: 'Restaurant' as const,
      active: true,
    };
    await mockDb.addOrderItem(orderId, menuItem, 1, null, 'B1');

    render(
      <AuthProvider>
        <ThemeProvider>
          <MemoryRouter initialEntries={['/table/S1']}>
            <Routes>
              <Route path="/table/:id" element={<TableDetailsPage />} />
            </Routes>
          </MemoryRouter>
        </ThemeProvider>
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByText(/Collect Payment/i)).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText(/Collect Payment/i));

    await waitFor(() => {
      expect(screen.getByText(/Collect Payment\?/i)).toBeInTheDocument();
    });

    expect(screen.getByRole('button', { name: /^Cancel$/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Confirm Payment Collected$/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^Print$/i })).not.toBeInTheDocument();
  });

  it('shows Print button in payment dialog when print setting is ON', async () => {
    localStorage.setItem('print_button_enabled', 'true');
    const orderId = await createOrder('S1', 'B1');
    const menuItem = {
      id: 'm3',
      name: 'Burger',
      price: 150,
      category: 'Fast Food',
      kitchen: 'Fast Food' as const,
      active: true,
    };
    await mockDb.addOrderItem(orderId, menuItem, 1, null, 'B1');

    render(
      <AuthProvider>
        <ThemeProvider>
          <MemoryRouter initialEntries={['/table/S1']}>
            <Routes>
              <Route path="/table/:id" element={<TableDetailsPage />} />
            </Routes>
          </MemoryRouter>
        </ThemeProvider>
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByText(/Collect Payment/i)).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText(/Collect Payment/i));

    await waitFor(() => {
      expect(screen.getByText(/Collect Payment\?/i)).toBeInTheDocument();
    });

    expect(screen.getByRole('button', { name: /^Cancel$/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Print$/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Confirm Payment Collected$/i })).toBeInTheDocument();
  });
});
