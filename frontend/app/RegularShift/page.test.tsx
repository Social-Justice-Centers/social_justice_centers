import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import RegularShiftPage from './page';

// --- MOCKS ---

const mockPush = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}));

jest.mock('../config', () => ({
  API_BASE_URL: 'http://mock-api',
}));

describe('RegularShiftPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn();
    // Mock session guard
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ phone: '0501234567', role: 'employee' }),
    });
  });

  // --- RENDERING ---

  test('Renders all form fields', async () => {
    render(<RegularShiftPage />);
    await waitFor(() => {
      expect(screen.getByLabelText !== undefined).toBeTruthy();
      expect(screen.getByText('תאריך')).toBeInTheDocument();
      expect(screen.getByText('שעת התחלה')).toBeInTheDocument();
      expect(screen.getByText('שעת סיום')).toBeInTheDocument();
      expect(screen.getByText('הערות')).toBeInTheDocument();
    });
  });

  test('Date field is pre-filled with today', async () => {
    render(<RegularShiftPage />);
    const d = new Date();
    const today = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
    await waitFor(() => expect(screen.getByDisplayValue(today)).toBeInTheDocument());
  });

  test('Work duration field is disabled', async () => {
    render(<RegularShiftPage />);
    await waitFor(() => {
      const workDuration = screen.getByPlaceholderText('—');
      expect(workDuration).toBeDisabled();
    });
  });

  test('Renders the confirmation Yes/No buttons', async () => {
    render(<RegularShiftPage />);
    await waitFor(() => {
      expect(screen.getByText('האם הפרטים שהזנת נכונים?')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'כן' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'לא' })).toBeInTheDocument();
    });
  });

  // --- CONFIRMATION VALIDATION ---

  test('Submit is disabled before confirming', async () => {
    render(<RegularShiftPage />);
    await waitFor(() => expect(screen.getByRole('button', { name: /שלח דיווח/ })).toBeDisabled());
  });

  test('Submit becomes enabled after clicking "כן"', async () => {
    render(<RegularShiftPage />);
    await waitFor(() => expect(screen.getByRole('button', { name: 'כן' })).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: 'כן' }));
    expect(screen.getByRole('button', { name: /שלח דיווח/ })).not.toBeDisabled();
  });

  test('Shows error when submitting without clicking "כן"', async () => {
    render(<RegularShiftPage />);
    await waitFor(() => expect(screen.getByRole('button', { name: /שלח דיווח/ })).toBeInTheDocument());
    // Try to submit without confirming — button is disabled, but let's verify the guard via fireEvent on the form
    const form = document.querySelector('form');
    if (form) fireEvent.submit(form);
    await waitFor(() => expect(screen.getByText('יש לאשר שהפרטים נכונים לפני השליחה')).toBeInTheDocument());
  });

  test('Selecting "לא" shows correction prompt', async () => {
    render(<RegularShiftPage />);
    await waitFor(() => expect(screen.getByRole('button', { name: 'לא' })).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: 'לא' }));
    expect(screen.getByText('אנא תקן את הפרטים לפני השליחה')).toBeInTheDocument();
  });

  // --- SUCCESSFUL SUBMISSION ---

  test('Shows success screen after successful submission', async () => {
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({ ok: true, json: async () => ({ role: 'employee' }) }) // /me
      .mockResolvedValueOnce({ ok: true, json: async () => ({ message: 'דיווח המשמרת נשמר בהצלחה' }) }); // /shifts/report

    render(<RegularShiftPage />);

    await waitFor(() => expect(screen.getByRole('button', { name: 'כן' })).toBeInTheDocument());

    // Fill required fields
    fireEvent.change(screen.getByPlaceholderText('DD/MM/YYYY'), { target: { value: '15/05/2025' } });
    const timeInputs = document.querySelectorAll('input[type="time"]');
    fireEvent.change(timeInputs[0], { target: { value: '09:00' } });
    fireEvent.change(timeInputs[1], { target: { value: '17:00' } });
    fireEvent.click(screen.getByRole('button', { name: 'כן' }));
    fireEvent.click(screen.getByRole('button', { name: /שלח דיווח/ }));

    await waitFor(() => expect(screen.getByText('הדיווח נשמר בהצלחה!')).toBeInTheDocument());
  });

  // --- NAVIGATION ---

  test('Back button navigates to /Browser', async () => {
    render(<RegularShiftPage />);
    await waitFor(() => expect(screen.getByRole('button', { name: /חזרה/ })).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: /חזרה/ }));
    expect(mockPush).toHaveBeenCalledWith('/Browser');
  });
});
