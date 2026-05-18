"use client";

import { API_BASE_URL } from './config';
import React, { useRef, useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';

const LOGO_SRC = '/images/logo.png';
const BRAND_GREEN = '#446F41';
const BG_CREAM = '#FFFFFF';
const INPUT_BG_COLOR = '#B2C6AE';

const LoginPage = () => {
    const [phone, setPhone] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const router = useRouter();
    const passwordRef = useRef<HTMLInputElement>(null);

    const handleLogin = async (e: React.FormEvent) => {
        if (e) e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const response = await fetch(`${API_BASE_URL}/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ phone, password }),
            });

            const data = await response.json();

            if (response.ok && data.role === 'employee') {
                router.push('/Browser');
            } else if (response.ok && data.role === 'manager') {
                router.push('/ManagerMenu');
            } else {
                setError(data.error || 'שם משתמש/סיסמא שגויים - נסה שוב');
            }
        } catch (err) {
            setError('אין תקשורת עם השרת');
        } finally {
            setLoading(false);
        }
    };

    const handlePhoneKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            passwordRef.current?.focus();
        }
    };

    const inputClasses = "h-16 w-full text-center text-lg font-semibold placeholder-current bg-opacity-70 rounded-lg outline-none focus:ring-2 focus:ring-[#446F41]";

    return (
        <div style={{ backgroundColor: BG_CREAM }} className="flex min-h-screen items-center justify-center p-4">
            <div className="w-full max-w-sm flex flex-col items-center">

                <div className="mb-10 flex flex-col items-center">
                    <Image
                        src={LOGO_SRC}
                        alt="לוגו מרכזים לצדק חברתי"
                        width={250}
                        height={250}
                        className="mb-3"
                        priority
                    />
                </div>

                <form onSubmit={handleLogin} className="space-y-6 w-full">
                    <input
                        type="tel"
                        id="phoneInput"
                        placeholder="מספר טלפון"
                        className={inputClasses}
                        style={{ backgroundColor: INPUT_BG_COLOR, color: BRAND_GREEN }}
                        value={phone}
                        onKeyDown={handlePhoneKeyDown}
                        onChange={(e) => setPhone(e.target.value)}
                        dir="rtl"
                    />

                    <input
                        type="password"
                        id="passwordInput"
                        ref={passwordRef}
                        placeholder="סיסמה"
                        className={inputClasses}
                        style={{ backgroundColor: INPUT_BG_COLOR, color: BRAND_GREEN }}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        dir="rtl"
                    />

                    {error && <p className="text-red-600 text-center font-bold">{error}</p>}

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full h-16 flex items-center justify-center text-lg font-bold text-white shadow-md rounded-lg transition duration-150 ease-in-out hover:bg-opacity-90 disabled:opacity-50"
                        style={{ backgroundColor: BRAND_GREEN }}
                    >
                        {loading ? 'מתחבר...' : 'כניסה'}
                    </button>

                </form>
            </div>
        </div>
    );
};

export default LoginPage;