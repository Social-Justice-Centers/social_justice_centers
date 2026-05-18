import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import EmployeePanelPage from './page';

const mockPush = jest.fn();
jest.mock('next/navigation', () => ({ useRouter: () => ({ push: mockPush }) }));
jest.mock('../config', () => ({ API_BASE_URL: 'http://mock-api' }));

const profile = (overrides = {}) => ({
  username: 'Test', phone: '0501234567', role: 'employee',
  isFlexibleModel: false, isRegularModel: false, ...overrides,
});

const okJson = (data: unknown) => ({ ok: true, json: jest.fn().mockResolvedValue(data) });

describe('EmployeePanelPage', () => {
  beforeEach(() => { jest.clearAllMocks(); global.fetch = jest.fn(); });

  test('Redirects to / when not logged in', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({ ok: false, json: jest.fn().mockResolvedValue({}) });
    render(<EmployeePanelPage />);
    await waitFor(() => expect(mockPush).toHaveBeenCalledWith('/'));
  });

  test('Always renders "המשמרות שלי" and logout', async () => {
    (global.fetch as jest.Mock).mockResolvedValue(okJson(profile()));
    render(<EmployeePanelPage />);
    await waitFor(() => expect(screen.getByText('המשמרות שלי')).toBeInTheDocument());
    expect(screen.getByText('התנתקות')).toBeInTheDocument();
  });

  test('Shows מודל גמיש only when isFlexibleModel=true', async () => {
    (global.fetch as jest.Mock).mockResolvedValue(okJson(profile({ isFlexibleModel: true })));
    render(<EmployeePanelPage />);
    await waitFor(() => expect(screen.getByRole('button', { name: /מודל גמיש/ })).toBeInTheDocument());
  });

  test('Does NOT show מודל גמיש when isFlexibleModel=false', async () => {
    (global.fetch as jest.Mock).mockResolvedValue(okJson(profile({ isFlexibleModel: false })));
    render(<EmployeePanelPage />);
    await waitFor(() => expect(screen.getByText('המשמרות שלי')).toBeInTheDocument());
    expect(screen.queryByText('מודל גמיש')).not.toBeInTheDocument();
  });

  test('Shows מודל קבוע only when isRegularModel=true', async () => {
    (global.fetch as jest.Mock).mockResolvedValue(okJson(profile({ isRegularModel: true })));
    render(<EmployeePanelPage />);
    await waitFor(() => expect(screen.getByRole('button', { name: /מודל קבוע/ })).toBeInTheDocument());
  });

  test('Shows back button only for managers', async () => {
    (global.fetch as jest.Mock).mockResolvedValue(okJson(profile({ role: 'manager' })));
    render(<EmployeePanelPage />);
    await waitFor(() => expect(screen.getByText('חזרה')).toBeInTheDocument());
  });

  test('No back button for regular employees', async () => {
    (global.fetch as jest.Mock).mockResolvedValue(okJson(profile()));
    render(<EmployeePanelPage />);
    await waitFor(() => expect(screen.getByText('המשמרות שלי')).toBeInTheDocument());
    expect(screen.queryByText('חזרה')).not.toBeInTheDocument();
  });

  test('Fetches and shows shifts on button click', async () => {
    const shifts = [{ ID: 1, date: '15/05/2025', startTime: '09:00', endTime: '17:00', notes: '' }];
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce(okJson(profile()))
      .mockResolvedValueOnce(okJson(shifts));
    render(<EmployeePanelPage />);
    await waitFor(() => expect(screen.getByText('המשמרות שלי')).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: /המשמרות שלי/ }));
    await waitFor(() => expect(screen.getByText('15/05/2025')).toBeInTheDocument());
    expect(screen.getByText(/09:00/)).toBeInTheDocument();
  });

  test('Shows empty state when no shifts', async () => {
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce(okJson(profile()))
      .mockResolvedValueOnce(okJson([]));
    render(<EmployeePanelPage />);
    await waitFor(() => expect(screen.getByText('המשמרות שלי')).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: /המשמרות שלי/ }));
    await waitFor(() => expect(screen.getByText('אין משמרות מוקצות עדיין')).toBeInTheDocument());
  });

  test('מודל קבוע navigates to /RegularShift', async () => {
    (global.fetch as jest.Mock).mockResolvedValue(okJson(profile({ isRegularModel: true })));
    render(<EmployeePanelPage />);
    await waitFor(() => expect(screen.getByRole('button', { name: /מודל קבוע/ })).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: /מודל קבוע/ }));
    expect(mockPush).toHaveBeenCalledWith('/RegularShift');
  });

  test('מודל גמיש navigates to /FlexibleModel', async () => {
    (global.fetch as jest.Mock).mockResolvedValue(okJson(profile({ isFlexibleModel: true })));
    render(<EmployeePanelPage />);
    await waitFor(() => expect(screen.getByRole('button', { name: /מודל גמיש/ })).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: /מודל גמיש/ }));
    expect(mockPush).toHaveBeenCalledWith('/FlexibleModel');
  });

  test('Logout calls /logout and redirects to /', async () => {
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce(okJson(profile()))
      .mockResolvedValueOnce(okJson({}));
    render(<EmployeePanelPage />);
    await waitFor(() => expect(screen.getByText('התנתקות')).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: /התנתקות/ }));
    await waitFor(() => expect(mockPush).toHaveBeenCalledWith('/'));
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/logout'),
      expect.objectContaining({ method: 'POST' })
    );
  });
});