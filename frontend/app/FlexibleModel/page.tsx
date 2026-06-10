'use client';

import { API_BASE_URL } from '../config';
import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, CheckCircle, Sun, Clock, Thermometer, Umbrella } from 'lucide-react';

const BRAND_BLUE = '#0284C7';
const BG_CREAM    = '#FFFFFF';
const INPUT_BG    = '#E0F2FE';

type DayType = 'full' | 'half' | 'sick' | 'dayoff';

interface DayOption {
    value: DayType;
    label: string;
    icon: React.ReactNode;
    color: string;
}

const DAY_OPTIONS: DayOption[] = [
    { value: 'full',   label: 'יום מלא',   icon: <Sun size={32} />,         color: BRAND_BLUE },
    { value: 'half',   label: 'חצי יום',   icon: <Clock size={32} />,        color: '#6a9e65' },
    { value: 'sick',   label: 'מחלה',      icon: <Thermometer size={32} />,  color: '#c0882a' },
    { value: 'dayoff', label: 'יום חופש',  icon: <Umbrella size={32} />,     color: '#3b7abf' },
];

const todayString = (): string => {
    const d = new Date();
    return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
};

const FlexibleModelPage = () => {
    const router = useRouter();

    const [pageLoading, setPageLoading] = useState(true);
    const [selected, setSelected]       = useState<DayType | null>(null);
    const [notes, setNotes]             = useState('');
    const [confirmed, setConfirmed]     = useState<boolean | null>(null);
    const [confirmError, setConfirmError] = useState('');
    const [submitting, setSubmitting]   = useState(false);
    const [errorMsg, setErrorMsg]       = useState('');
    const [success, setSuccess]         = useState(false);

    const date = todayString();

    // ---- Session guard & Auto-fill ----
    useEffect(() => {
        const verifyAndFetch = async () => {
            try {
                const res = await fetch(`${API_BASE_URL}/me`, { credentials: 'include' });
                if (!res.ok) {
                    router.push('/');
                    return;
                }
                
                // Auto-fill from planned shift today
                const shiftsRes = await fetch(`${API_BASE_URL}/shifts`, { credentials: 'include' });
                if (shiftsRes.ok) {
                    const allShifts = await shiftsRes.json();
                    const plannedToday = allShifts.find((s: any) => s.type === 'planned' && s.date === date);
                    if (plannedToday && plannedToday.notes) {
                        setNotes(plannedToday.notes);
                    }
                }

            } catch {
                router.push('/');
            } finally {
                setPageLoading(false);
            }
        };
        verifyAndFetch();
    }, [router, date]);

    // ---- Submit ----
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setConfirmError('');
        setErrorMsg('');

        if (!selected) {
            setErrorMsg('יש לבחור סוג יום');
            return;
        }
        if (confirmed !== true) {
            setConfirmError('יש לאשר שהפרטים נכונים לפני השליחה');
            return;
        }

        setSubmitting(true);
        try {
            const res = await fetch(`${API_BASE_URL}/shifts/report`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({
                    date,
                    startTime:    '',
                    endTime:      '',
                    workDuration: selected,
                    notes,
                }),
            });
            const data = await res.json();
            if (!res.ok) {
                setErrorMsg(data.error || 'שגיאה בשמירת הדיווח');
                return;
            }
            setSuccess(true);
        } catch {
            setErrorMsg('שגיאת תקשורת עם השרת');
        } finally {
            setSubmitting(false);
        }
    };

    // ---- Loading ----
    if (pageLoading) return (
        <div style={{ backgroundColor: BG_CREAM }} className="flex min-h-screen items-center justify-center">
            <p style={{ color: BRAND_BLUE }} className="text-xl font-bold">טוען...</p>
        </div>
    );

    // ---- Success screen ----
    if (success) return (
        <div style={{ backgroundColor: BG_CREAM }} className="flex min-h-screen flex-col items-center justify-center p-6" dir="rtl">
            <CheckCircle size={64} style={{ color: BRAND_BLUE }} className="mb-6" />
            <h2 className="text-2xl font-bold mb-2" style={{ color: BRAND_BLUE }}>הדיווח נשמר בהצלחה!</h2>
            <p className="text-gray-500 mb-2">
                {DAY_OPTIONS.find(o => o.value === selected)?.label} — {date}
            </p>
            <p className="text-gray-400 text-sm mb-8">הדיווח תועד במערכת</p>
            <button
                onClick={() => router.push('/Browser')}
                className="px-8 py-3 rounded-xl text-white text-lg font-bold transition hover:opacity-90"
                style={{ backgroundColor: BRAND_BLUE }}
            >
                חזרה לפאנל
            </button>
        </div>
    );

    // ---- Main form ----
    return (
        <div style={{ backgroundColor: BG_CREAM }} className="min-h-screen p-6 relative" dir="rtl">

            {/* Header */}
            <button
                onClick={() => router.push('/Browser')}
                className="absolute top-6 right-6 flex items-center gap-2 font-bold hover:opacity-70 transition z-10"
                style={{ color: BRAND_BLUE }}
            >
                <ArrowRight size={22} />
                <span>חזרה</span>
            </button>

            <div className="flex items-center justify-center mb-8 pt-14">
                <h1 className="text-2xl font-bold" style={{ color: BRAND_BLUE }}>מודל גמיש</h1>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-6 max-w-md mx-auto">

                {/* Date card */}
                <div className="bg-gray-50 rounded-2xl border p-5 text-center">
                    <p className="text-sm text-gray-500 font-semibold mb-1">תאריך הדיווח</p>
                    <p className="text-3xl font-bold" style={{ color: BRAND_BLUE }}>{date}</p>
                </div>

                {/* Day-type selector */}
                <div>
                    <p className="text-sm font-semibold mb-3" style={{ color: BRAND_BLUE }}>סוג הנוכחות</p>
                    <div className="grid grid-cols-2 gap-3">
                        {DAY_OPTIONS.map(opt => {
                            const isActive = selected === opt.value;
                            return (
                                <button
                                    key={opt.value}
                                    type="button"
                                    onClick={() => { setSelected(opt.value); setConfirmed(null); setConfirmError(''); }}
                                    className="flex flex-col items-center justify-center gap-2 h-28 rounded-2xl border-2 font-bold text-lg transition-all active:scale-95"
                                    style={{
                                        borderColor:     opt.color,
                                        backgroundColor: isActive ? opt.color : 'white',
                                        color:           isActive ? 'white'   : opt.color,
                                    }}
                                >
                                    {opt.icon}
                                    <span>{opt.label}</span>
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Notes */}
                <div>
                    <label className="block text-sm font-semibold mb-1" style={{ color: BRAND_BLUE }}>
                        הערות (אופציונלי)
                    </label>
                    <textarea
                        rows={3}
                        placeholder="הערות..."
                        className="w-full px-4 py-3 rounded-lg text-right font-semibold outline-none focus:ring-2 focus:ring-[#0284C7] resize-none"
                        style={{ backgroundColor: INPUT_BG, color: BRAND_BLUE }}
                        value={notes}
                        onChange={e => setNotes(e.target.value)}
                    />
                </div>

                {/* Confirmation */}
                <div className="bg-white rounded-xl border-2 p-5" style={{ borderColor: BRAND_BLUE }}>
                    <p className="font-bold text-center mb-4" style={{ color: BRAND_BLUE }}>האם הפרטים שהזנת נכונים?</p>
                    <div className="flex gap-4 justify-center">
                        <button
                            type="button"
                            onClick={() => { setConfirmed(true); setConfirmError(''); }}
                            className="flex-1 h-12 rounded-xl font-bold text-lg border-2 transition"
                            style={confirmed === true
                                ? { backgroundColor: BRAND_BLUE, color: 'white', borderColor: BRAND_BLUE }
                                : { backgroundColor: 'white', color: BRAND_BLUE, borderColor: BRAND_BLUE }}
                        >
                            כן
                        </button>
                        <button
                            type="button"
                            onClick={() => { setConfirmed(false); setConfirmError(''); }}
                            className="flex-1 h-12 rounded-xl font-bold text-lg border-2 transition"
                            style={confirmed === false
                                ? { backgroundColor: '#dc2626', color: 'white', borderColor: '#dc2626' }
                                : { backgroundColor: 'white', color: '#dc2626', borderColor: '#dc2626' }}
                        >
                            לא
                        </button>
                    </div>
                    {confirmed === false && (
                        <p className="text-center text-red-500 text-sm mt-3 font-semibold">אנא תקן את הפרטים</p>
                    )}
                    {confirmError && (
                        <p className="text-center text-red-500 text-sm mt-3 font-semibold">{confirmError}</p>
                    )}
                </div>

                {errorMsg && (
                    <div className="bg-red-100 text-red-700 p-3 rounded-lg text-center font-bold">
                        {errorMsg}
                    </div>
                )}

                <button
                    type="submit"
                    disabled={submitting || !selected || confirmed !== true}
                    className="w-full h-16 text-white text-xl font-bold rounded-xl transition hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
                    style={{ backgroundColor: BRAND_BLUE }}
                >
                    {submitting ? 'שומר...' : 'שליחת דיווח'}
                </button>

            </form>
        </div>
    );
};

export default FlexibleModelPage;
