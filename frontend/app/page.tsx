"use client";

import { API_BASE_URL } from './config';
import React, { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';

const LOGO_SRC = '/images/logo.png';
const BRAND_GREEN = '#446F41';
const BG_CREAM = '#FFFFFF';
const INPUT_BG_COLOR = '#B2C6AE';

const LoginPage = () => {
    const [step, setStep] = useState<'phone' | 'otp'>('phone');
    const [phone, setPhone] = useState('');
    const [otp, setOtp] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [secondsLeft, setSecondsLeft] = useState(60);
    const [devOtp, setDevOtp] = useState('');

    const router = useRouter();
    const otpRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (step !== 'otp') return;
        setSecondsLeft(60);
        const id = setInterval(() => {
            setSecondsLeft(s => {
                if (s <= 1) { clearInterval(id); return 0; }
                return s - 1;
            });
        }, 1000);
        return () => clearInterval(id);
    }, [step]);

    useEffect(() => {
        if (step === 'otp') otpRef.current?.focus();
    }, [step]);

    const handleRequestOTP = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const response = await fetch(`${API_BASE_URL}/otp/request`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ phone }),
            });
            const data = await response.json();

            if (response.ok) {
                setOtp('');
                setDevOtp(data.devOtp || '');
                setStep('otp');
            } else {
                setError(data.error || 'שגיאה בשליחת הקוד');
            }
        } catch {
            setError('אין תקשורת עם השרת');
        } finally {
            setLoading(false);
        }
    };

    const handleVerifyOTP = async (e: React.FormEvent) => {
        e.preventDefault();
        if (secondsLeft === 0) {
            setError('הקוד פג תוקף. בקש קוד חדש.');
            return;
        }
        setLoading(true);
        setError('');

        try {
            const response = await fetch(`${API_BASE_URL}/otp/verify`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ phone, otp }),
            });
            const data = await response.json();

            if (response.ok && data.role === 'employee') {
                router.push('/Browser');
            } else if (response.ok && data.role === 'manager') {
                router.push('/ManagerMenu');
            } else {
                setError(data.error || 'קוד שגוי');
            }
        } catch {
            setError('אין תקשורת עם השרת');
        } finally {
            setLoading(false);
        }
    };

    const goBack = () => { setStep('phone'); setError(''); setOtp(''); };

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

                {step === 'phone' ? (
                    <form onSubmit={handleRequestOTP} className="space-y-6 w-full">
                        <input
                            type="tel"
                            placeholder="מספר טלפון"
                            className={inputClasses}
                            style={{ backgroundColor: INPUT_BG_COLOR, color: BRAND_GREEN }}
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            dir="rtl"
                            autoFocus
                        />

                        {error && <p className="text-red-600 text-center font-bold">{error}</p>}

                        <button
                            type="submit"
                            disabled={loading || !phone}
                            className="w-full h-16 flex items-center justify-center text-lg font-bold text-white shadow-md rounded-lg transition duration-150 ease-in-out hover:bg-opacity-90 disabled:opacity-50"
                            style={{ backgroundColor: BRAND_GREEN }}
                        >
                            {loading ? 'שולח...' : 'שלח קוד לאימייל'}
                        </button>
                    </form>
                ) : (
                    <form onSubmit={handleVerifyOTP} className="space-y-6 w-full">
                        <p className="text-center text-sm font-medium" style={{ color: BRAND_GREEN }} dir="rtl">
                            קוד חד-פעמי נשלח לאימייל הרשום עבור מספר {phone}
                        </p>

                        {devOtp && (
                            <div className="w-full rounded-lg p-3 text-center border-2" style={{ borderColor: BRAND_GREEN, backgroundColor: '#f0f7ef' }}>
                                <p className="text-xs font-semibold mb-1" style={{ color: BRAND_GREEN }}>DEV MODE — הקוד שלך:</p>
                                <p className="text-3xl font-bold tracking-widest" style={{ color: BRAND_GREEN }}>{devOtp}</p>
                            </div>
                        )}

                        <input
                            ref={otpRef}
                            type="text"
                            inputMode="numeric"
                            maxLength={6}
                            placeholder="קוד 6 ספרות"
                            className={inputClasses}
                            style={{ backgroundColor: INPUT_BG_COLOR, color: BRAND_GREEN }}
                            value={otp}
                            onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                            dir="ltr"
                        />

                        <p
                            className="text-center text-sm font-semibold"
                            style={{ color: secondsLeft > 10 ? BRAND_GREEN : '#dc2626' }}
                        >
                            {secondsLeft > 0
                                ? `הקוד בתוקף עוד ${secondsLeft} שניות`
                                : 'הקוד פג תוקף'}
                        </p>

                        {error && <p className="text-red-600 text-center font-bold">{error}</p>}

                        <button
                            type="submit"
                            disabled={loading || secondsLeft === 0 || otp.length !== 6}
                            className="w-full h-16 flex items-center justify-center text-lg font-bold text-white shadow-md rounded-lg transition duration-150 ease-in-out hover:bg-opacity-90 disabled:opacity-50"
                            style={{ backgroundColor: BRAND_GREEN }}
                        >
                            {loading ? 'מאמת...' : 'כניסה'}
                        </button>

                        <button
                            type="button"
                            onClick={goBack}
                            className="w-full text-center text-sm font-medium underline"
                            style={{ color: BRAND_GREEN }}
                        >
                            {secondsLeft === 0 ? 'שלח קוד חדש' : 'חזרה'}
                        </button>
                    </form>
                )}
            </div>
        </div>
    );
};

export default LoginPage;
