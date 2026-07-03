'use client';

import { API_BASE_URL } from '../config';
import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Clock, ArrowRight, Pencil, Check, X, CalendarPlus } from 'lucide-react';

const BRAND_BLUE = '#0284C7';
const BG_CREAM = '#FFFFFF';
const INPUT_BG = '#E0F2FE';

const formatDateInput = (value: string): string => {
    const digits = value.replace(/\D/g, '').slice(0, 8);
    let formatted = '';
    if (digits.length > 0) {
        formatted += digits.slice(0, 2);
    }
    if (digits.length > 2) {
        formatted += '/' + digits.slice(2, 4);
    }
    if (digits.length > 4) {
        formatted += '/' + digits.slice(4, 8);
    }
    return formatted;
};

interface Shift {
    ID: number;
    assignedTo: string;
    assignedBy: string;
    type: string;
    date: string;
    startTime: string;
    endTime: string;
    notes: string;
    status: string;
}

interface EditForm {
    date: string;
    startTime: string;
    endTime: string;
    notes: string;
}

const ReportedShiftsPage = () => {
    const router = useRouter();
    const [shifts, setShifts] = useState<Shift[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'reported' | 'planned' | 'rejected'>('reported');
    const [editingId, setEditingId] = useState<number | null>(null);
    const [editForm, setEditForm] = useState<EditForm>({ date: '', startTime: '', endTime: '', notes: '' });
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    const fetchShifts = React.useCallback(async () => {
        try {
            const res = await fetch(`${API_BASE_URL}/shifts`, { credentials: 'include' });
            if (!res.ok) {
                if (res.status === 401) router.push('/');
                return;
            }
            const data = await res.json();
            setShifts(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error("Error fetching shifts", err);
        } finally {
            setLoading(false);
        }
    }, [router]);

    useEffect(() => {
        fetchShifts();
    }, [fetchShifts]);

    const addToGoogleCalendar = (shift: Shift) => {
        try {
            const [day, month, year] = shift.date.split('/');
            
            const startHour = shift.startTime ? parseInt(shift.startTime.split(':')[0], 10) : 9;
            const startMin = shift.startTime ? parseInt(shift.startTime.split(':')[1], 10) : 0;
            
            const startDate = new Date(Number(year), Number(month) - 1, Number(day), startHour, startMin);
            
            let endDate = new Date(startDate);
            if (shift.endTime) {
                const endHour = parseInt(shift.endTime.split(':')[0], 10);
                const endMin = parseInt(shift.endTime.split(':')[1], 10);
                endDate = new Date(Number(year), Number(month) - 1, Number(day), endHour, endMin);
            } else {
                endDate.setHours(endDate.getHours() + 8);
            }
            
            const pad = (n: number) => n.toString().padStart(2, '0');
            const formatForGoogle = (date: Date) => {
                return `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}T${pad(date.getHours())}${pad(date.getMinutes())}00`;
            };
            
            const startStr = formatForGoogle(startDate);
            const endStr = formatForGoogle(endDate);
            
            const title = encodeURIComponent('משמרת במרכז לצדק חברתי');
            const details = encodeURIComponent(shift.notes || 'משמרת מתוכננת');
            
            const url = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${startStr}/${endStr}&details=${details}&ctz=Asia/Jerusalem`;
            
            window.open(url, '_blank');
        } catch (e) {
            console.error("Failed to generate Google Calendar link", e);
            alert("שגיאה בפתיחת היומן");
        }
    };

    const startEdit = (shift: Shift) => {
        setEditingId(shift.ID);
        setEditForm({
            date: shift.date,
            startTime: shift.startTime,
            endTime: shift.endTime,
            notes: shift.notes,
        });
        setError('');
    };

    const cancelEdit = () => {
        setEditingId(null);
        setError('');
    };

    const saveEdit = async (id: number) => {
        setSaving(true);
        setError('');
        try {
            const res = await fetch(`${API_BASE_URL}/shifts/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify(editForm),
            });
            if (!res.ok) {
                const d = await res.json();
                setError(d.error || 'שגיאה בשמירה');
                return;
            }
            setEditingId(null);
            await fetchShifts();
        } catch {
            setError('שגיאת תקשורת');
        } finally {
            setSaving(false);
        }
    };

    const inputClass = "w-full h-10 px-3 rounded-lg text-right font-semibold outline-none focus:ring-2 focus:ring-[#0284C7] text-sm";

    const displayedShifts = shifts.filter(s => {
        if (activeTab === 'rejected') {
            return s.status === 'rejected';
        }
        if (activeTab === 'planned') {
            return s.type === 'planned' && s.status !== 'rejected';
        }
        return s.type !== 'planned' && s.status !== 'rejected';
    });

    if (loading) return (
        <div style={{ backgroundColor: BG_CREAM }} className="flex min-h-screen items-center justify-center">
            <p style={{ color: BRAND_BLUE }} className="text-xl font-bold">טוען משמרות...</p>
        </div>
    );

    return (
        <div style={{ backgroundColor: BG_CREAM }} className="min-h-screen p-6 relative" dir="rtl">
            <button
                onClick={() => router.push('/Browser')}
                className="absolute top-6 right-6 flex items-center gap-2 font-bold hover:opacity-70 transition z-10"
                style={{ color: BRAND_BLUE }}
            >
                <ArrowRight size={22} />
                <span>חזרה לפאנל</span>
            </button>

            <div className="max-w-3xl mx-auto pt-14">
                {/* Header */}
                <div className="flex items-center justify-center mb-8">
                    <div className="flex items-center gap-3">
                        <h1 className="text-2xl font-bold" style={{ color: BRAND_BLUE }}>המשמרות שלי</h1>
                        <Clock size={28} style={{ color: BRAND_BLUE }} />
                    </div>
                </div>

                {error && (
                    <div className="mb-4 bg-red-100 text-red-700 p-3 rounded-lg text-center font-bold text-sm">
                        {error}
                    </div>
                )}

                {/* Tabs */}
                <div className="flex bg-white rounded-xl shadow-sm mb-6 p-1 border-2" style={{ borderColor: INPUT_BG }}>
                    <button
                        onClick={() => setActiveTab('reported')}
                        className={`flex-1 py-2 text-sm font-bold rounded-lg transition ${activeTab === 'reported' ? 'bg-[#0284C7] text-white' : 'text-[#0284C7] hover:bg-sky-50'}`}
                    >
                        משמרות שדווחו (עבר)
                    </button>
                    <button
                        onClick={() => setActiveTab('planned')}
                        className={`flex-1 py-2 text-sm font-bold rounded-lg transition ${activeTab === 'planned' ? 'bg-[#0284C7] text-white' : 'text-[#0284C7] hover:bg-sky-50'}`}
                    >
                        משמרות עתידיות
                    </button>
                    <button
                        onClick={() => setActiveTab('rejected')}
                        className={`flex-1 py-2 text-sm font-bold rounded-lg transition ${activeTab === 'rejected' ? 'bg-[#0284C7] text-white' : 'text-[#0284C7] hover:bg-sky-50'}`}
                    >
                        משמרות שנדחו
                    </button>
                </div>

                {/* Shifts List */}
                <div className="bg-white rounded-2xl shadow-lg p-6" style={{ border: `2px solid ${BRAND_BLUE}` }}>
                    {displayedShifts.length === 0 ? (
                        <p className="text-center text-gray-400 py-10 font-bold text-lg">אין משמרות עדיין</p>
                    ) : (
                        <ul className="space-y-4">
                            {displayedShifts.map((shift) => (
                                <li key={shift.ID} className="border-2 rounded-xl p-4 flex flex-col gap-3"
                                    style={{ borderColor: editingId === shift.ID ? BRAND_BLUE : INPUT_BG }}>

                                    {editingId === shift.ID ? (
                                        /* ---- EDIT MODE ---- */
                                        <div className="flex flex-col gap-3">
                                            <p className="text-xs font-bold uppercase tracking-wide opacity-50" style={{ color: BRAND_BLUE }}>
                                                עריכת משמרת
                                            </p>

                                            {/* Date */}
                                            <div>
                                                <label className="block text-xs font-semibold mb-1" style={{ color: BRAND_BLUE }}>תאריך (DD/MM/YYYY)</label>
                                                <input
                                                    type="text"
                                                    className={inputClass}
                                                    style={{ backgroundColor: INPUT_BG, color: BRAND_BLUE }}
                                                    value={editForm.date}
                                                    onChange={e => setEditForm({ ...editForm, date: formatDateInput(e.target.value) })}
                                                />
                                            </div>

                                            {/* Start / End */}
                                            <div className="flex gap-3">
                                                <div className="flex-1">
                                                    <label className="block text-xs font-semibold mb-1" style={{ color: BRAND_BLUE }}>שעת התחלה</label>
                                                    <input
                                                        type="time"
                                                        className={inputClass}
                                                        style={{ backgroundColor: INPUT_BG, color: BRAND_BLUE }}
                                                        value={editForm.startTime}
                                                        onChange={e => setEditForm({ ...editForm, startTime: e.target.value })}
                                                    />
                                                </div>
                                                <div className="flex-1">
                                                    <label className="block text-xs font-semibold mb-1" style={{ color: BRAND_BLUE }}>שעת סיום</label>
                                                    <input
                                                        type="time"
                                                        className={inputClass}
                                                        style={{ backgroundColor: INPUT_BG, color: BRAND_BLUE }}
                                                        value={editForm.endTime}
                                                        onChange={e => setEditForm({ ...editForm, endTime: e.target.value })}
                                                    />
                                                </div>
                                            </div>

                                            {/* Notes */}
                                            <div>
                                                <label className="block text-xs font-semibold mb-1" style={{ color: BRAND_BLUE }}>הערות</label>
                                                <textarea
                                                    rows={2}
                                                    className="w-full px-3 py-2 rounded-lg text-right font-semibold outline-none focus:ring-2 focus:ring-[#0284C7] resize-none text-sm"
                                                    style={{ backgroundColor: INPUT_BG, color: BRAND_BLUE }}
                                                    value={editForm.notes}
                                                    onChange={e => setEditForm({ ...editForm, notes: e.target.value })}
                                                />
                                            </div>

                                            {/* Actions */}
                                            <div className="flex gap-2 mt-1">
                                                <button
                                                    onClick={() => saveEdit(shift.ID)}
                                                    disabled={saving}
                                                    className="flex-1 h-10 flex items-center justify-center gap-1 rounded-lg text-white font-bold text-sm transition hover:opacity-90 disabled:opacity-50"
                                                    style={{ backgroundColor: BRAND_BLUE }}
                                                >
                                                    <Check size={16} />
                                                    {saving ? 'שומר...' : 'שמור'}
                                                </button>
                                                <button
                                                    onClick={cancelEdit}
                                                    className="flex-1 h-10 flex items-center justify-center gap-1 rounded-lg font-bold text-sm border-2 transition hover:bg-gray-50"
                                                    style={{ borderColor: BRAND_BLUE, color: BRAND_BLUE }}
                                                >
                                                    <X size={16} />
                                                    ביטול
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        /* ---- VIEW MODE ---- */
                                        <>
                                            <div className="flex justify-between items-center">
                                                <span className="font-bold text-lg" style={{ color: BRAND_BLUE }}>{shift.date}</span>
                                                <span className="font-semibold text-gray-600 bg-gray-100 px-3 py-1 rounded-full text-sm">
                                                    {shift.startTime} — {shift.endTime || "פעילה"}
                                                </span>
                                            </div>

                                            {shift.notes && (
                                                <div className="text-sm text-gray-500 bg-gray-50 p-3 rounded-lg border border-gray-100">
                                                    <span className="font-bold">הערות: </span>{shift.notes}
                                                </div>
                                            )}

                                            {/* Type badge */}
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                                                        shift.type === 'reported'
                                                            ? 'bg-green-100 text-green-700'
                                                            : 'bg-blue-100 text-blue-700'
                                                    }`}>
                                                        {shift.type === 'reported' ? 'דיווח עצמי' : 'מתוכנן'}
                                                    </span>
                                                    {shift.type === 'reported' && (
                                                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                                                            shift.status === 'approved'
                                                                ? 'bg-emerald-100 text-emerald-700'
                                                                : shift.status === 'rejected'
                                                                ? 'bg-red-100 text-red-700'
                                                                : 'bg-amber-100 text-amber-700'
                                                        }`}>
                                                            {shift.status === 'approved' ? 'מאושר' : shift.status === 'rejected' ? 'נדחה' : 'ממתין לאישור'}
                                                        </span>
                                                    )}
                                                </div>

                                                {/* Edit / Delete / Calendar */}
                                                <div className="flex gap-2">
                                                    {shift.status !== 'rejected' && (
                                                        <>
                                                            <button
                                                                onClick={() => addToGoogleCalendar(shift)}
                                                                className="flex items-center gap-1 text-sm font-bold px-3 py-1.5 rounded-lg border-2 transition hover:bg-blue-50 text-blue-700"
                                                                style={{ borderColor: BRAND_BLUE }}
                                                            >
                                                                <CalendarPlus size={14} />
                                                                ליומן
                                                            </button>
                                                            <button
                                                                onClick={() => startEdit(shift)}
                                                                className="flex items-center gap-1 text-sm font-bold px-3 py-1.5 rounded-lg border-2 transition hover:bg-gray-50"
                                                                style={{ borderColor: BRAND_BLUE, color: BRAND_BLUE }}
                                                            >
                                                                <Pencil size={14} />
                                                                עריכה
                                                            </button>
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                        </>
                                    )}
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ReportedShiftsPage;
