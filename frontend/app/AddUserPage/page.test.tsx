import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import CreateUserPage from './page';

const mockPush = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}));

jest.mock('../config', () => ({ API_BASE_URL: 'http://mock-api.com' }));

describe('CreateUserPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn();
  });

  test('renders form', () => {
    render(<CreateUserPage />);
    expect(screen.getByText('יצירת משתמש חדש')).toBeInTheDocument();
  });

  test('submits form successfully', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ message: 'User created' }),
    });

    const { container } = render(<CreateUserPage />);
    
    fireEvent.change(screen.getByPlaceholderText('שם מלא'), { target: { value: 'Yoav Test' } });
    fireEvent.change(screen.getByPlaceholderText('מספר טלפון'), { target: { value: '0509999999' } });
    fireEvent.change(screen.getByPlaceholderText('******'), { target: { value: 'pass' } });
    
    // FIX: Find the form element and trigger submit directly
    // This is more reliable than clicking the button in test environments
    const form = container.querySelector('form');
    if (form) fireEvent.submit(form);

    expect(await screen.findByText('המשתמש נוצר בהצלחה!')).toBeInTheDocument();
  });

  test('displays error message when API fails', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      statusText: 'Bad Request',
      json: async () => ({ error: 'User already exists' }),
    });

    const { container } = render(<CreateUserPage />);
    
    fireEvent.change(screen.getByPlaceholderText('שם מלא'), { target: { value: 'Error User' } });
    
    const form = container.querySelector('form');
    if (form) fireEvent.submit(form);

    // Use findByText which waits for the element to appear
    expect(await screen.findByText('User already exists')).toBeInTheDocument();
  });
});