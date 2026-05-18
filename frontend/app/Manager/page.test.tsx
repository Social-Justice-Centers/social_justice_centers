import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import ManagerPage from './page';

const mockPush = jest.fn();
jest.mock('next/navigation', () => ({ useRouter: () => ({ push: mockPush }) }));
jest.mock('../config', () => ({ API_BASE_URL: 'http://mock-api' }));

const okJson = (data: unknown) => ({ ok: true, json: jest.fn().mockResolvedValue(data) });

const managerProfile = { username: 'Test Manager', phone: '0505656888', role: 'manager', isFlexibleModel: false, isRegularModel: false };
const teamData = [
  { id: 2, username: 'עובד א', phone: '0501111111', isFlexibleModel: true, isRegularModel: false },
  { id: 3, username: 'עובד ב', phone: '0502222222', isFlexibleModel: false, isRegularModel: true },
];

describe('ManagerPage', () => {
  beforeEach(() => { jest.clearAllMocks(); global.fetch = jest.fn(); });

  test('Redirects to / when not logged in', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({ ok: false, json: jest.fn().mockResolvedValue({}) });
    render(<ManagerPage />);
    await waitFor(() => expect(mockPush).toHaveBeenCalledWith('/'));
  });

  test('Renders all three action buttons', async () => {
    (global.fetch as jest.Mock).mockResolvedValue(okJson(managerProfile));
    render(<ManagerPage />);
    await waitFor(() => {
      expect(screen.getByText('הוספת עובד')).toBeInTheDocument();
      expect(screen.getByText('העובדים שלי')).toBeInTheDocument();
      expect(screen.getByText('הקצאת משמרת')).toBeInTheDocument();
    });
  });

  test('"הוספת עובד" navigates to /AddUserPage', async () => {
    (global.fetch as jest.Mock).mockResolvedValue(okJson(managerProfile));
    render(<ManagerPage />);
    await waitFor(() => expect(screen.getByText('הוספת עובד')).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: /הוספת עובד/ }));
    expect(mockPush).toHaveBeenCalledWith('/AddUserPage');
  });

  test('Back button navigates to /ManagerMenu', async () => {
    (global.fetch as jest.Mock).mockResolvedValue(okJson(managerProfile));
    render(<ManagerPage />);
    await waitFor(() => expect(screen.getByText('חזרה')).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: /חזרה/ }));
    expect(mockPush).toHaveBeenCalledWith('/ManagerMenu');
  });

  test('"העובדים שלי" fetches and displays team members', async () => {
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce(okJson(managerProfile))
      .mockResolvedValueOnce(okJson(teamData));
    render(<ManagerPage />);
    await waitFor(() => expect(screen.getByText('העובדים שלי')).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: /העובדים שלי/ }));
    await waitFor(() => expect(screen.getByText('עובד א')).toBeInTheDocument());
    expect(screen.getByText('עובד ב')).toBeInTheDocument();
  });

  test('Shows empty state when team is empty', async () => {
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce(okJson(managerProfile))
      .mockResolvedValueOnce(okJson([]));
    render(<ManagerPage />);
    await waitFor(() => expect(screen.getByText('העובדים שלי')).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: /העובדים שלי/ }));
    await waitFor(() => expect(screen.getByText('אין עובדים תחת ניהולך עדיין')).toBeInTheDocument());
  });

  test('Opens shift modal on "הקצאת משמרת" click', async () => {
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce(okJson(managerProfile))
      .mockResolvedValueOnce(okJson(teamData));
    render(<ManagerPage />);
    await waitFor(() => expect(screen.getByText('הקצאת משמרת')).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: /הקצאת משמרת/ }));
    await waitFor(() => expect(screen.getByRole('combobox')).toBeInTheDocument());
  });

  test('Shows error when submitting without selecting employee', async () => {
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce(okJson(managerProfile))
      .mockResolvedValueOnce(okJson(teamData));
    render(<ManagerPage />);
    await waitFor(() => expect(screen.getByText('הקצאת משמרת')).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: /הקצאת משמרת/ }));
    await waitFor(() => expect(screen.getByRole('button', { name: /הקצה משמרת/ })).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: /הקצה משמרת/ }));
    await waitFor(() => expect(screen.getByText('נא לבחור עובד')).toBeInTheDocument());
  });

  test('Calls POST /shifts when form is valid', async () => {
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce(okJson(managerProfile))
      .mockResolvedValueOnce(okJson(teamData))
      .mockResolvedValueOnce(okJson({ message: 'משמרת הוקצתה בהצלחה' }));

    render(<ManagerPage />);
    await waitFor(() => expect(screen.getByText('הקצאת משמרת')).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: /הקצאת משמרת/ }));
    await waitFor(() => expect(screen.getByRole('combobox')).toBeInTheDocument());

    fireEvent.change(screen.getByRole('combobox'), { target: { value: '0505656888' } });
    const timeInputs = document.querySelectorAll('input[type="time"]');
    fireEvent.change(timeInputs[0], { target: { value: '09:00' } });
    fireEvent.change(timeInputs[1], { target: { value: '17:00' } });
    fireEvent.click(screen.getByRole('button', { name: /הקצה משמרת/ }));

    await waitFor(() =>
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/shifts'),
        expect.objectContaining({ method: 'POST' })
      )
    );
  });
});