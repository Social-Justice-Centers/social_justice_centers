'use client';

import { API_BASE_URL } from '../config';
import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, Users, Pencil, Check, X } from 'lucide-react';

const BRAND_BLUE = '#0284C7';
const BG_CREAM = '#FFFFFF';
const INPUT_BG = '#E0F2FE';

interface TeamShift {
    ID: number;
    assignedTo: string;
    date: string;
    startTime: string;
    endTime: string;
    notes: string;
    type: string;
    employeeName: string;
    employeePhone: string;
}

interface EditForm {
    date: string;
    startTime: string;
    endTime: string;
    notes: string;
}

const TeamShiftsPage = () => {
    const router = useRouter();
    const [shifts, setShifts] = useState<TeamShift[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    // Edit state
    const [editingId, setEditingId] = useState<number | null>(null);
    const [editForm, setEditForm] = useState<EditForm>({ date: '', startTime: '', endTime: '', notes: '' });
    const [saving, setSaving] = useState(false);
    const [editError, setEditError] = useState('');

    // Filter by employee name
    const [filter, setFilter] = useState('');

    const fetchShifts = async () => {
        try {
            const res = await fetch(`${API_BASE_URL}/manager/team/shifts`, { credentials: 'include' });
            if (!res.ok) {
                if (res.status === 401 || res.status === 403) router.push('/');
                return;
            }
            const data = await res.json();
            setShifts(Array.isArray(data) ? data : []);
        } catch {
            setError('שגיאת תקשורת עם השרת');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const verify = async () => {
            try {
                const res = await fetch(`${API_BASE_URL}/me`, { credentials: 'include' });
                if (!res.ok) { router.push('/'); return; }
                const data = await res.json();
                if (data.role !== 'manager') { router.push('/Browser'); return; }
            } catch {
                router.push('/');
                return;
            }
            // Fetch team shifts after auth check
            try {
                const res = await fetch(`${API_BASE_URL}/manager/team/shifts`, { credentials: 'include' });
                if (!res.ok) {
                    if (res.status === 401 || res.status === 403) router.push('/');
                    return;
                }
                const data = await res.json();
                setShifts(Array.isArray(data) ? data : []);
            } catch {
                setError('שגיאת תקשורת עם השרת');
            } finally {
                setLoading(false);
            }
        };
        verify();
    }, [router]);

    const startEdit = (shift: TeamShift) => {
        setEditingId(shift.ID);
        setEditForm({ date: shift.date, startTime: shift.startTime, endTime: shift.endTime, notes: shift.notes });
        setEditError('');
    };

    const cancelEdit = () => {
        setEditingId(null);
        setEditError('');
    };

    const saveEdit = async (id: number) => {
        setSaving(true);
        setEditError('');
        try {
            const res = await fetch(`${API_BASE_URL}/shifts/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify(editForm),
            });
            if (!res.ok) {
                const d = await res.json();
                setEditError(d.error || 'שגיאה בשמירה');
                return;
            }
            setEditingId(null);
            await fetchShifts();
        } catch {
            setEditError('שגיאת תקשורת');
        } finally {
            setSaving(false);
        }
    };

    const inputClass = "w-full h-10 px-3 rounded-lg text-right font-semibold outline-none focus:ring-2 focus:ring-[#0284C7] text-sm";

    const displayed = shifts.filter(s =>
        !filter || (s.employeeName || '').toLowerCase().includes(filter.toLowerCase())
    );

    if (loading) return (
        <div style={{ backgroundColor: BG_CREAM }} className="flex min-h-screen items-center justify-center">
            <p style={{ color: BRAND_BLUE }} className="text-xl font-bold">טוען משמרות...</p>
        </div>
    );

    return (
        <div style={{ backgroundColor: BG_CREAM }} className="min-h-screen p-6 relative" dir="rtl">
            <button
                onClick={() => router.push('/Manager')}
                className="absolute top-6 right-6 flex items-center gap-2 font-bold hover:opacity-70 transition z-10"
                style={{ color: BRAND_BLUE }}
            >
                <ArrowRight size={22} />
                <span>חזרה לפאנל מנהל</span>
            </button>

            <div className="max-w-3xl mx-auto pt-14">
                {/* Header */}
                <div className="flex items-center justify-center mb-6 gap-3">
                    <h1 className="text-2xl font-bold" style={{ color: BRAND_BLUE }}>משמרות הצוות</h1>
                    <Users size={28} style={{ color: BRAND_BLUE }} />
                </div>

                <p className="text-center text-sm opacity-60 mb-6" style={{ color: BRAND_BLUE }}>
                    מוצגות משמרות בהתאם לתקופת הניהול שלך לכל עובד
                </p>

                {/* Filter */}
                <div className="mb-4">
                    <input
                        type="text"
                        placeholder="סינון לפי שם עובד..."
                        className="w-full h-11 px-4 rounded-xl border-2 text-right outline-none focus:ring-2 focus:ring-[#0284C7]"
                        style={{ borderColor: INPUT_BG, color: BRAND_BLUE }}
                        value={filter}
                        onChange={e => setFilter(e.target.value)}
                    />
                </div>

                {error && (
                    <div className="mb-4 bg-red-100 text-red-700 p-3 rounded-lg text-center font-bold text-sm">{error}</div>
                )}

                {/* Shifts list */}
                <div className="bg-white rounded-2xl shadow-lg p-6" style={{ border: `2px solid ${BRAND_BLUE}` }}>
                    {displayed.length === 0 ? (
                        <p className="text-center text-gray-400 py-10 font-bold text-lg">
                            {filter ? 'לא נמצאו משמרות תואמות' : 'אין משמרות לצוות עדיין'}
                        </p>
                    ) : (
                        <ul className="space-y-4">
                            {displayed.map(shift => (
                                <li
                                    key={shift.ID}
                                    className="border-2 rounded-xl p-4 flex flex-col gap-3"
                                    style={{ borderColor: editingId === shift.ID ? BRAND_BLUE : INPUT_BG }}
                                >
                                    {/* Employee tag */}
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-green-100 text-green-800">
                                            {shift.employeeName || shift.employeePhone}
                                        </span>
                                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                                            shift.type === 'reported' ? 'bg-gray-100 text-gray-600' : 'bg-blue-100 text-blue-700'
                                        }`}>
                                            {shift.type === 'reported' ? 'דיווח עצמי' : 'מתוכנן'}
                                        </span>
                                    </div>

                                    {editingId === shift.ID ? (
                                        /* ---- EDIT MODE ---- */
                                        <div className="flex flex-col gap-3">
                                            <div>
                                                <label className="block text-xs font-semibold mb-1" style={{ color: BRAND_BLUE }}>תאריך (DD/MM/YYYY)</label>
                                                <input
                                                    type="text"
                                                    className={inputClass}
                                                    style={{ backgroundColor: INPUT_BG, color: BRAND_BLUE }}
                                                    value={editForm.date}
                                                    onChange={e => setEditForm({ ...editForm, date: e.target.value })}
                                                />
                                            </div>
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
                                            {editError && <p className="text-red-600 text-xs font-semibold">{editError}</p>}
                                            <div className="flex gap-2">
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
                                                    {shift.startTime} — {shift.endTime || 'פעילה'}
                                                </span>
                                            </div>
                                            {shift.notes && (
                                                <div className="text-sm text-gray-500 bg-gray-50 p-3 rounded-lg border border-gray-100">
                                                    <span className="font-bold">הערות: </span>{shift.notes}
                                                </div>
                                            )}
                                            <div className="flex justify-end">
                                                <button
                                                    onClick={() => startEdit(shift)}
                                                    className="flex items-center gap-1 text-sm font-bold px-3 py-1.5 rounded-lg border-2 transition hover:bg-gray-50"
                                                    style={{ borderColor: BRAND_BLUE, color: BRAND_BLUE }}
                                                >
                                                    <Pencil size={14} />
                                                    עריכה
                                                </button>
                                            </div>
                                        </>
                                    )}
                                </li>
                            ))}
                        </ul>
                    )}
                </div>

                <p className="text-center text-xs opacity-40 mt-4" style={{ color: BRAND_BLUE }}>
                    סה&quot;כ {displayed.length} משמרות
                </p>
            </div>
        </div>
    );
};

export default TeamShiftsPage;
