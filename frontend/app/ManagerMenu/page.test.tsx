import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import ManagerMenuPage from './page';

// --- MOCKS ---

const mockPush = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}));

jest.mock('../config', () => ({
  API_BASE_URL: 'http://mock-api',
}));

describe('ManagerMenuPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn();
  });

  const mockManagerMe = () => ({
    ok: true,
    json: async () => ({ username: 'rotem', phone: '0505656888', role: 'manager' }),
  });

  // --- REDIRECT TESTS ---

  test('Redirects to / when session is invalid', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({ ok: false, json: async () => ({}) });
    render(<ManagerMenuPage />);
    await waitFor(() => expect(mockPush).toHaveBeenCalledWith('/'));
  });

  test('Redirects to /Browser if user is not a manager', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ username: 'worker', role: 'employee' }),
    });
    render(<ManagerMenuPage />);
    await waitFor(() => expect(mockPush).toHaveBeenCalledWith('/Browser'));
  });

  // --- RENDERING ---

  test('Renders greeting with manager username', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce(mockManagerMe());
    render(<ManagerMenuPage />);
    await waitFor(() => expect(screen.getByText(/שלום, rotem/)).toBeInTheDocument());
  });

  test('Renders both panel choice buttons', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce(mockManagerMe());
    render(<ManagerMenuPage />);
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /פאנל מנהל/ })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /פאנל עובד/ })).toBeInTheDocument();
    });
  });

  // --- NAVIGATION ---

  test('"פאנל מנהל" navigates to /Manager', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce(mockManagerMe());
    render(<ManagerMenuPage />);
    await waitFor(() => expect(screen.getByRole('button', { name: /פאנל מנהל/ })).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: /פאנל מנהל/ }));
    expect(mockPush).toHaveBeenCalledWith('/Manager');
  });

  test('"פאנל עובד" navigates to /Browser', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce(mockManagerMe());
    render(<ManagerMenuPage />);
    await waitFor(() => expect(screen.getByRole('button', { name: /פאנל עובד/ })).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: /פאנל עובד/ }));
    expect(mockPush).toHaveBeenCalledWith('/Browser');
  });

  // --- LOGOUT ---

  test('Logout calls /logout and redirects to /', async () => {
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce(mockManagerMe())
      .mockResolvedValueOnce({ ok: true, json: async () => ({}) });

    render(<ManagerMenuPage />);
    await waitFor(() => expect(screen.getByRole('button', { name: /התנתק/ })).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: /התנתק/ }));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/logout'),
        expect.objectContaining({ method: 'POST' })
      );
      expect(mockPush).toHaveBeenCalledWith('/');
    });
  });
});
