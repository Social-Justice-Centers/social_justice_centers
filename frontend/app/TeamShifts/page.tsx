'use client';

import { API_BASE_URL } from '../config';
import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, Users, Pencil, Check, X, CalendarPlus, Plus } from 'lucide-react';

interface TeamMember {
    phone: string;
    fullName: string;
}

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

    // Assign state
    const [showAssignModal, setShowAssignModal] = useState(false);
    const [assignForm, setAssignForm] = useState({ assignedTo: '', date: '', startTime: '', endTime: '', notes: '' });
    const [assigning, setAssigning] = useState(false);
    const [assignError, setAssignError] = useState('');
    const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);

    const [activeTab, setActiveTab] = useState<'reported' | 'planned'>('reported');

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

                const teamRes = await fetch(`${API_BASE_URL}/users/team`, { credentials: 'include' });
                if (teamRes.ok) {
                    const teamData = await teamRes.json();
                    setTeamMembers(Array.isArray(teamData) ? teamData : []);
                }
            } catch {
                setError('שגיאת תקשורת עם השרת');
            } finally {
                setLoading(false);
            }
        };
        verify();
    }, [router]);

    const handleAssignShift = async () => {
        if (!assignForm.assignedTo || !assignForm.date || !assignForm.startTime) {
            setAssignError('נא למלא עובד, תאריך ושעת התחלה');
            return;
        }
        setAssigning(true);
        setAssignError('');
        try {
            const res = await fetch(`${API_BASE_URL}/manager/team/shifts`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify(assignForm),
            });
            if (!res.ok) {
                const d = await res.json();
                setAssignError(d.error || 'שגיאה בשיבוץ המשמרת');
                return;
            }
            setShowAssignModal(false);
            setAssignForm({ assignedTo: '', date: '', startTime: '', endTime: '', notes: '' });
            await fetchShifts();
        } catch {
            setAssignError('שגיאת תקשורת');
        } finally {
            setAssigning(false);
        }
    };

    const addToGoogleCalendar = (shift: TeamShift) => {
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

    const displayed = shifts.filter(s => {
        const matchesTab = activeTab === 'planned' ? s.type === 'planned' : s.type !== 'planned';
        const matchesFilter = !filter || (s.employeeName || '').toLowerCase().includes(filter.toLowerCase());
        return matchesTab && matchesFilter;
    });

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

                {/* Filter & Assign Action */}
                <div className="mb-4 flex flex-col sm:flex-row gap-3">
                    <button
                        onClick={() => setShowAssignModal(true)}
                        className="h-11 px-4 flex items-center justify-center gap-2 rounded-xl text-white font-bold shadow-md transition hover:opacity-90 whitespace-nowrap"
                        style={{ backgroundColor: BRAND_BLUE }}
                    >
                        <Plus size={20} />
                        שיבוץ משמרת
                    </button>
                    <input
                        type="text"
                        placeholder="סינון לפי שם עובד..."
                        className="flex-1 h-11 px-4 rounded-xl border-2 text-right outline-none focus:ring-2 focus:ring-[#0284C7]"
                        style={{ borderColor: INPUT_BG, color: BRAND_BLUE }}
                        value={filter}
                        onChange={e => setFilter(e.target.value)}
                    />
                </div>

                {error && (
                    <div className="mb-4 bg-red-100 text-red-700 p-3 rounded-lg text-center font-bold text-sm">{error}</div>
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
                </div>

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
                                            <div className="flex justify-end gap-2">
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

            {/* Assign Modal */}
            {showAssignModal && (
                <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50 overflow-y-auto">
                    <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl relative" dir="rtl">
                        <button
                            onClick={() => {
                                setShowAssignModal(false);
                                setAssignError('');
                            }}
                            className="absolute top-4 left-4 p-1 rounded-full hover:bg-gray-100 transition"
                            style={{ color: BRAND_BLUE }}
                            disabled={assigning}
                        >
                            <X size={24} />
                        </button>
                        <h2 className="text-xl font-bold mb-6 text-center" style={{ color: BRAND_BLUE }}>שיבוץ משמרת לעובד</h2>
                        
                        <div className="flex flex-col gap-4">
                            <div>
                                <label className="block text-sm font-semibold mb-1" style={{ color: BRAND_BLUE }}>בחר עובד</label>
                                <select
                                    className="w-full h-11 px-3 rounded-xl border-2 text-right outline-none focus:ring-2 focus:ring-[#0284C7] bg-white"
                                    style={{ borderColor: INPUT_BG, color: BRAND_BLUE }}
                                    value={assignForm.assignedTo}
                                    onChange={e => setAssignForm({ ...assignForm, assignedTo: e.target.value })}
                                >
                                    <option value="">-- בחר עובד --</option>
                                    {teamMembers.map(m => (
                                        <option key={m.phone} value={m.phone}>{m.fullName} ({m.phone})</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-semibold mb-1" style={{ color: BRAND_BLUE }}>תאריך (DD/MM/YYYY)</label>
                                <input
                                    type="text"
                                    placeholder="לדוגמה 15/06/2026"
                                    className="w-full h-11 px-3 rounded-xl border-2 text-right outline-none focus:ring-2 focus:ring-[#0284C7]"
                                    style={{ borderColor: INPUT_BG, color: BRAND_BLUE }}
                                    value={assignForm.date}
                                    onChange={e => setAssignForm({ ...assignForm, date: e.target.value })}
                                />
                            </div>
                            <div className="flex gap-3">
                                <div className="flex-1">
                                    <label className="block text-sm font-semibold mb-1" style={{ color: BRAND_BLUE }}>שעת התחלה</label>
                                    <input
                                        type="time"
                                        className="w-full h-11 px-3 rounded-xl border-2 text-right outline-none focus:ring-2 focus:ring-[#0284C7]"
                                        style={{ borderColor: INPUT_BG, color: BRAND_BLUE }}
                                        value={assignForm.startTime}
                                        onChange={e => setAssignForm({ ...assignForm, startTime: e.target.value })}
                                    />
                                </div>
                                <div className="flex-1">
                                    <label className="block text-sm font-semibold mb-1" style={{ color: BRAND_BLUE }}>שעת סיום</label>
                                    <input
                                        type="time"
                                        className="w-full h-11 px-3 rounded-xl border-2 text-right outline-none focus:ring-2 focus:ring-[#0284C7]"
                                        style={{ borderColor: INPUT_BG, color: BRAND_BLUE }}
                                        value={assignForm.endTime}
                                        onChange={e => setAssignForm({ ...assignForm, endTime: e.target.value })}
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-semibold mb-1" style={{ color: BRAND_BLUE }}>הערות (אופציונלי)</label>
                                <textarea
                                    rows={2}
                                    className="w-full px-3 py-2 rounded-xl border-2 text-right outline-none focus:ring-2 focus:ring-[#0284C7] resize-none"
                                    style={{ borderColor: INPUT_BG, color: BRAND_BLUE }}
                                    value={assignForm.notes}
                                    onChange={e => setAssignForm({ ...assignForm, notes: e.target.value })}
                                />
                            </div>
                            
                            {assignError && <div className="text-red-600 text-sm font-bold text-center mt-2">{assignError}</div>}
                            
                            <button
                                onClick={handleAssignShift}
                                disabled={assigning}
                                className="w-full h-12 mt-2 flex items-center justify-center gap-2 text-white font-bold rounded-xl transition hover:opacity-90 disabled:opacity-50"
                                style={{ backgroundColor: BRAND_BLUE }}
                            >
                                <Check size={20} />
                                {assigning ? 'שומר...' : 'שמור משמרת'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default TeamShiftsPage;
