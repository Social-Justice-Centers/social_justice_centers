'use client';

import { API_BASE_URL } from '../config';
import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, CheckCircle, Clock, Check } from 'lucide-react';

const BRAND_GREEN = '#446F41';
const BG_CREAM = '#FFFFFF';
const INPUT_BG = '#B2C6AE';

const getCurrentTimeString = () => {
    return new Date().toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit', hour12: false });
};

const RegularShiftPage = () => {
    const router = useRouter();

    const [activeShift, setActiveShift] = useState<any>(null);
    const [pageLoading, setPageLoading] = useState(true);
    const [loading, setLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');

    // Popups & Views state
    const [showClockInPopup, setShowClockInPopup] = useState(false);
    const [clockedInTime, setClockedInTime] = useState('');
    const [showClockOutForm, setShowClockOutForm] = useState(false);

    // Form state (for clock out)
    const [endTime, setEndTime] = useState('');
    const [notes, setNotes] = useState('');

    // Confirmation state
    const [confirmed, setConfirmed] = useState<boolean | null>(null);
    const [confirmError, setConfirmError] = useState('');
    const [success, setSuccess] = useState(false);

    // ---- Fetch Active Shift ----
    useEffect(() => {
        const fetchCurrentShift = async () => {
            try {
                const meRes = await fetch(`${API_BASE_URL}/me`, { credentials: 'include' });
                if (!meRes.ok) { router.push('/'); return; }

                const shiftRes = await fetch(`${API_BASE_URL}/shifts/current`, { credentials: 'include' });
                if (shiftRes.ok) {
                    const data = await shiftRes.json();
                    setActiveShift(data);
                } else {
                    setActiveShift(null);
                }
            } catch {
                setErrorMsg("שגיאת תקשורת עם השרת");
            } finally {
                setPageLoading(false);
            }
        };
        fetchCurrentShift();
    }, [router]);

    // ---- Clock In ----
    const handleClockIn = async () => {
        setLoading(true);
        setErrorMsg('');
        try {
            const res = await fetch(`${API_BASE_URL}/shifts/clock-in`, {
                method: 'POST',
                credentials: 'include'
            });
            const data = await res.json();
            if (res.ok) {
                setActiveShift(data);
                setClockedInTime(data.startTime);
                setShowClockInPopup(true);
            } else {
                setErrorMsg(data.error || "שגיאה בכניסה למשמרת");
            }
        } catch {
            setErrorMsg("שגיאת תקשורת עם השרת");
        } finally {
            setLoading(false);
        }
    };

    // ---- Open Clock Out Form ----
    const openClockOutForm = () => {
        setEndTime(getCurrentTimeString());
        setShowClockOutForm(true);
    };

    // ---- Submit Clock Out ----
    const handleClockOutSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setConfirmError('');
        setErrorMsg('');

        if (confirmed !== true) {
            setConfirmError('יש לאשר שהפרטים נכונים לפני השליחה');
            return;
        }

        if (!endTime) {
            setErrorMsg('נא למלא שעת סיום');
            return;
        }

        setLoading(true);
        try {
            const res = await fetch(`${API_BASE_URL}/shifts/clock-out`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ endTime, notes }),
            });

            const data = await res.json();
            if (!res.ok) {
                setErrorMsg(data.error || 'שגיאה ביציאה ממשמרת');
                return;
            }
            setSuccess(true);
        } catch {
            setErrorMsg('שגיאת תקשורת עם השרת');
        } finally {
            setLoading(false);
        }
    };

    const inputClass = "w-full h-12 px-4 rounded-lg text-right font-semibold outline-none focus:ring-2 focus:ring-[#446F41]";
    const labelClass = "block text-sm font-semibold mb-1";

    if (pageLoading) {
        return (
            <div style={{ backgroundColor: BG_CREAM }} className="flex min-h-screen items-center justify-center">
                <p style={{ color: BRAND_GREEN }} className="text-xl font-bold">טוען...</p>
            </div>
        );
    }

    if (success) {
        return (
            <div style={{ backgroundColor: BG_CREAM }} className="flex min-h-screen flex-col items-center justify-center p-6" dir="rtl">
                <CheckCircle size={64} style={{ color: BRAND_GREEN }} className="mb-6" />
                <h2 className="text-2xl font-bold mb-2" style={{ color: BRAND_GREEN }}>המשמרת הסתיימה בהצלחה!</h2>
                <p className="text-gray-500 mb-8">הדיווח תועד במערכת</p>
                <button
                    onClick={() => router.push('/Browser')}
                    className="px-8 py-3 rounded-xl text-white text-lg font-bold transition hover:opacity-90"
                    style={{ backgroundColor: BRAND_GREEN }}
                >
                    חזרה לפאנל
                </button>
            </div>
        );
    }

    return (
        <div style={{ backgroundColor: BG_CREAM }} className="min-h-screen p-6 relative" dir="rtl">
            <button
                onClick={() => {
                    if (showClockOutForm) setShowClockOutForm(false);
                    else router.push('/Browser');
                }}
                className="absolute top-6 right-6 flex items-center gap-2 font-bold hover:opacity-70 transition z-10"
                style={{ color: BRAND_GREEN }}
            >
                <ArrowRight size={22} />
                <span>חזרה</span>
            </button>

            {/* Header */}
            <div className="flex items-center justify-center mb-8 max-w-md mx-auto pt-14">
                <h1 className="text-2xl font-bold" style={{ color: BRAND_GREEN }}>מודל קבוע</h1>
            </div>

            {errorMsg && (
                <div className="max-w-md mx-auto mb-4 bg-red-100 text-red-700 p-3 rounded-lg text-center font-bold">
                    {errorMsg}
                </div>
            )}

            {/* Clock In Popup */}
            {showClockInPopup && (
                <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 text-center" dir="rtl">
                        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Check size={32} style={{ color: BRAND_GREEN }} />
                        </div>
                        <h2 className="text-2xl font-bold mb-2" style={{ color: BRAND_GREEN }}>כניסה אושרה</h2>
                        <p className="text-gray-600 mb-6">שעת כניסה למשמרת: <strong>{clockedInTime}</strong></p>
                        <button
                            onClick={() => setShowClockInPopup(false)}
                            className="w-full py-3 rounded-xl text-white font-bold transition hover:opacity-90"
                            style={{ backgroundColor: BRAND_GREEN }}
                        >
                            אישור
                        </button>
                    </div>
                </div>
            )}

            {!showClockOutForm ? (
                /* MAIN SCREEN: Two Buttons */
                <div className="max-w-md mx-auto flex flex-col gap-6 mt-12">
                    <div className="bg-gray-50 p-6 rounded-2xl border mb-4 text-center">
                        <h2 className="text-lg font-bold text-gray-800 mb-2">סטטוס נוכחי</h2>
                        {activeShift ? (
                            <p className="text-green-600 font-bold">פעיל ממשעה {activeShift.startTime}</p>
                        ) : (
                            <p className="text-gray-500">אין משמרת פעילה</p>
                        )}
                    </div>

                    <div className="flex gap-6 w-full">
                        <button
                            onClick={handleClockIn}
                            disabled={loading || activeShift !== null}
                            className="flex-1 h-32 text-white text-2xl font-bold rounded-2xl shadow-lg transition-all hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed flex flex-col items-center justify-center gap-2"
                            style={{ backgroundColor: BRAND_GREEN }}
                        >
                            <Clock size={32} />
                            <span>{loading && !activeShift ? 'טוען...' : 'כניסה'}</span>
                        </button>

                        <button
                            onClick={openClockOutForm}
                            disabled={loading || activeShift === null}
                            className="flex-1 h-32 text-white text-2xl font-bold rounded-2xl shadow-lg transition-all hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed flex flex-col items-center justify-center gap-2"
                            style={{ backgroundColor: '#dc2626' }}
                        >
                            <Clock size={32} />
                            <span>יציאה</span>
                        </button>
                    </div>
                </div>
            ) : (
                /* CLOCK OUT FORM */
                <form onSubmit={handleClockOutSubmit} className="flex flex-col gap-5 max-w-md mx-auto">
                    <div className="bg-white p-4 rounded-xl shadow-sm border mb-2 flex justify-between items-center">
                        <div>
                            <p className="text-sm text-gray-500 font-bold mb-1">תאריך</p>
                            <p className="text-lg font-bold" style={{ color: BRAND_GREEN }}>{activeShift.date}</p>
                        </div>
                        <div className="text-left">
                            <p className="text-sm text-gray-500 font-bold mb-1">שעת כניסה</p>
                            <p className="text-lg font-bold" style={{ color: BRAND_GREEN }}>{activeShift.startTime}</p>
                        </div>
                    </div>

                    <div>
                        <label className={labelClass} style={{ color: BRAND_GREEN }}>שעת סיום</label>
                        <input
                            type="time"
                            className={inputClass}
                            style={{ backgroundColor: INPUT_BG, color: BRAND_GREEN }}
                            value={endTime}
                            onChange={(e) => setEndTime(e.target.value)}
                        />
                    </div>

                    <div>
                        <label className={labelClass} style={{ color: BRAND_GREEN }}>הערות</label>
                        <textarea
                            rows={3}
                            placeholder="הערות אופציונליות..."
                            className="w-full px-4 py-3 rounded-lg text-right font-semibold outline-none focus:ring-2 focus:ring-[#446F41] resize-none"
                            style={{ backgroundColor: INPUT_BG, color: BRAND_GREEN }}
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                        />
                    </div>

                    {/* Verification */}
                    <div className="bg-white rounded-xl border-2 p-5 mt-2" style={{ borderColor: BRAND_GREEN }}>
                        <p className="font-bold text-center mb-4" style={{ color: BRAND_GREEN }}>האם הפרטים שהזנת נכונים?</p>
                        <div className="flex gap-4 justify-center">
                            <button
                                type="button"
                                onClick={() => { setConfirmed(true); setConfirmError(''); }}
                                className="flex-1 h-12 rounded-xl font-bold text-lg border-2 transition"
                                style={confirmed === true ? { backgroundColor: BRAND_GREEN, color: 'white', borderColor: BRAND_GREEN } : { backgroundColor: 'white', color: BRAND_GREEN, borderColor: BRAND_GREEN }}
                            >
                                כן
                            </button>
                            <button
                                type="button"
                                onClick={() => { setConfirmed(false); setConfirmError(''); }}
                                className="flex-1 h-12 rounded-xl font-bold text-lg border-2 transition"
                                style={confirmed === false ? { backgroundColor: '#dc2626', color: 'white', borderColor: '#dc2626' } : { backgroundColor: 'white', color: '#dc2626', borderColor: '#dc2626' }}
                            >
                                לא
                            </button>
                        </div>
                        {confirmed === false && <p className="text-center text-red-500 text-sm mt-3 font-semibold">אנא תקן את הפרטים</p>}
                        {confirmError && <p className="text-center text-red-500 text-sm mt-3 font-semibold">{confirmError}</p>}
                    </div>

                    <button
                        type="submit"
                        disabled={loading || confirmed !== true}
                        className="w-full h-16 text-white text-xl font-bold rounded-xl transition hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed mt-2"
                        style={{ backgroundColor: BRAND_GREEN }}
                    >
                        {loading ? 'שומר...' : 'סיום משמרת ושליחה'}
                    </button>
                </form>
            )}
        </div>
    );
};

export default RegularShiftPage;
