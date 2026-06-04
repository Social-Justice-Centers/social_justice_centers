import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import ManagerPage from './page';

const mockPush = jest.fn();
jest.mock('next/navigation', () => ({ useRouter: () => ({ push: mockPush }) }));
jest.mock('../config', () => ({ API_BASE_URL: 'http://mock-api' }));

const okJson = (data: unknown) => ({ ok: true, json: jest.fn().mockResolvedValue(data) });

const managerProfile = { username: 'Test Manager', phone: '0505656888', role: 'manager', isFlexibleModel: false, isRegularModel: false };

describe('ManagerPage', () => {
  beforeEach(() => { jest.clearAllMocks(); global.fetch = jest.fn(); });

  test('Redirects to / when not logged in', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({ ok: false, json: jest.fn().mockResolvedValue({}) });
    render(<ManagerPage />);
    await waitFor(() => expect(mockPush).toHaveBeenCalledWith('/'));
  });

  test('Renders all action buttons', async () => {
    (global.fetch as jest.Mock).mockResolvedValue(okJson(managerProfile));
    render(<ManagerPage />);
    await waitFor(() => {
      expect(screen.getByText('הוספת עובד')).toBeInTheDocument();
      expect(screen.getByText('העובדים שלי')).toBeInTheDocument();
      expect(screen.getByText('משמרות הצוות')).toBeInTheDocument();
      expect(screen.getByText('אישור דוחות נסיעות')).toBeInTheDocument();
      expect(screen.getByText('ייצוא נתונים למיכפל')).toBeInTheDocument();
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

  test('Opens export modal on "ייצוא נתונים למיכפל" click and closes it', async () => {
    (global.fetch as jest.Mock).mockResolvedValue(okJson(managerProfile));
    render(<ManagerPage />);
    
    await waitFor(() => expect(screen.getByText('ייצוא נתונים למיכפל')).toBeInTheDocument());
    
    // The modal should not be visible initially
    expect(screen.queryByText('אפשרות זו נמצאת כעת בפיתוח ותהיה זמינה בקרוב!')).not.toBeInTheDocument();

    // Click the export button
    fireEvent.click(screen.getByRole('button', { name: /ייצוא נתונים למיכפל/ }));

    // The modal should appear
    await waitFor(() => {
      expect(screen.getByText('אפשרות זו נמצאת כעת בפיתוח ותהיה זמינה בקרוב!')).toBeInTheDocument();
    });

    // Click close button inside modal
    const closeBtn = screen.getByRole('button', { name: /הבנתי, תודה/ });
    fireEvent.click(closeBtn);

    // Modal should disappear
    await waitFor(() => {
      expect(screen.queryByText('אפשרות זו נמצאת כעת בפיתוח ותהיה זמינה בקרוב!')).not.toBeInTheDocument();
    });
  });
});