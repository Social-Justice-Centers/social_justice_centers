import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import ManagerPage from './page';

const mockPush = jest.fn();
jest.mock('next/navigation', () => ({ useRouter: () => ({ push: mockPush }) }));
jest.mock('../config', () => ({ API_BASE_URL: 'http://mock-api' }));

const okJson = (data: unknown) => ({ ok: true, json: jest.fn().mockResolvedValue(data) });
const okBlob = () => ({ ok: true, blob: jest.fn().mockResolvedValue(new Blob()) });

const managerProfile = { username: 'Test Manager', phone: '0505656888', role: 'manager', isFlexibleModel: false, isRegularModel: false };

describe('ManagerPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn();
    window.URL.createObjectURL = jest.fn().mockReturnValue('blob:mock-url');
    window.URL.revokeObjectURL = jest.fn();
  });

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

  test('Opens export modal and triggers file download with selected parameters', async () => {
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce(okJson(managerProfile)) // profile verify
      .mockResolvedValueOnce(okBlob());              // export fetch

    render(<ManagerPage />);
    
    await waitFor(() => expect(screen.getByText('ייצוא נתונים למיכפל')).toBeInTheDocument());
    
    // Open modal
    fireEvent.click(screen.getByRole('button', { name: /ייצוא נתונים למיכפל/ }));

    await waitFor(() => {
      expect(screen.getByText('חודש דיווח')).toBeInTheDocument();
    });

    // Change Month and Year dropdowns
    const monthSelect = screen.getByLabelText('חודש דיווח');
    const yearSelect = screen.getByLabelText('שנת מס');

    fireEvent.change(monthSelect, { target: { value: '05' } });
    fireEvent.change(yearSelect, { target: { value: '2026' } });

    // Mock document.createElement and click trigger
    const mockClick = jest.fn();
    const mockAnchor = { click: mockClick, href: '', download: '' };
    const spyCreate = jest.spyOn(document, 'createElement').mockImplementation((tagName) => {
      if (tagName === 'a') return mockAnchor as any;
      return document.createElement(tagName);
    });
    const spyAppend = jest.spyOn(document.body, 'appendChild').mockImplementation(() => ({} as any));
    const spyRemove = jest.spyOn(document.body, 'removeChild').mockImplementation(() => ({} as any));

    // Click download button
    const downloadBtn = screen.getByRole('button', { name: 'הורד קובץ XLS' });
    fireEvent.click(downloadBtn);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/manager/export/michpal?month=05&year=2026'),
        expect.objectContaining({ credentials: 'include' })
      );
    });

    await waitFor(() => {
      expect(mockClick).toHaveBeenCalled();
      expect(mockAnchor.download).toBe('michpal_export_2026_05.xls');
    });

    spyCreate.mockRestore();
    spyAppend.mockRestore();
    spyRemove.mockRestore();
  });

  test('Closes export modal on cancel or close click', async () => {
    (global.fetch as jest.Mock).mockResolvedValue(okJson(managerProfile));
    render(<ManagerPage />);
    
    await waitFor(() => expect(screen.getByText('ייצוא נתונים למיכפל')).toBeInTheDocument());
    
    // Open modal
    fireEvent.click(screen.getByRole('button', { name: /ייצוא נתונים למיכפל/ }));
    await waitFor(() => expect(screen.getByText('חודש דיווח')).toBeInTheDocument());

    // Click cancel button
    const cancelBtn = screen.getByRole('button', { name: 'ביטול' });
    fireEvent.click(cancelBtn);

    await waitFor(() => {
      expect(screen.queryByText('חודש דיווח')).not.toBeInTheDocument();
    });
  });
});