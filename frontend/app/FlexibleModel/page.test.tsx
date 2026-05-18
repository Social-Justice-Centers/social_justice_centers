import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import FlexibleModelPage from './page';

const mockPush = jest.fn();
jest.mock('next/navigation', () => ({ useRouter: () => ({ push: mockPush }) }));
jest.mock('../config', () => ({ API_BASE_URL: 'http://mock-api' }));

const okJson = (data: unknown) => ({ ok: true, json: jest.fn().mockResolvedValue(data) });

describe('FlexibleModelPage', () => {
  beforeEach(() => { jest.clearAllMocks(); global.fetch = jest.fn(); });

  test('Redirects to / when not logged in', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({ ok: false, json: jest.fn().mockResolvedValue({}) });
    render(<FlexibleModelPage />);
    await waitFor(() => expect(mockPush).toHaveBeenCalledWith('/'));
  });

  test('Renders header and blank state content', async () => {
    (global.fetch as jest.Mock).mockResolvedValue(okJson({ role: 'employee' }));
    render(<FlexibleModelPage />);
    await waitFor(() => {
      expect(screen.getByText('מודל גמיש')).toBeInTheDocument();
      expect(screen.getByText('מסך מודל גמיש')).toBeInTheDocument();
      expect(screen.getByText('כאן יופיע בעתיד התוכן למודל גמיש.')).toBeInTheDocument();
    });
  });

  test('Back button navigates to /Browser', async () => {
    (global.fetch as jest.Mock).mockResolvedValue(okJson({ role: 'employee' }));
    render(<FlexibleModelPage />);
    await waitFor(() => expect(screen.getByRole('button', { name: /חזרה/ })).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: /חזרה/ }));
    expect(mockPush).toHaveBeenCalledWith('/Browser');
  });
});
