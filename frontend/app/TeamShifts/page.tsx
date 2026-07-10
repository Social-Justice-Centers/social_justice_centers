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

const isShiftPast = (dateStr: string, timeStr: string): boolean => {
    try {
        const [day, month, year] = dateStr.split('/').map(Number);
        const [hours, minutes] = (timeStr || '23:59').split(':').map(Number);
        const shiftDate = new Date(year, month - 1, day, hours, minutes);
        return shiftDate < new Date();
    } catch {
        return false;
    }
};

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
    status?: string;
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

    // Sorting and Date Range states
    const [sortBy, setSortBy] = useState<'date' | 'date_asc' | 'employee'>('date');
    const [dateRangeType, setDateRangeType] = useState<'past_week' | 'past_month' | 'all' | 'custom'>('past_week');
    const [customStartDate, setCustomStartDate] = useState('');
    const [customEndDate, setCustomEndDate] = useState('');

    // Assign state
    const [showAssignModal, setShowAssignModal] = useState(false);
    const [assignForm, setAssignForm] = useState({ assignedTo: '', date: '', startTime: '', endTime: '', notes: '' });
    const [assigning, setAssigning] = useState(false);
    const [assignError, setAssignError] = useState('');
    const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);

    const [activeTab, setActiveTab] = useState<'reported' | 'planned' | 'rejected'>('reported');

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
        if (assignForm.startTime && assignForm.endTime) {
            const [sh, sm] = assignForm.startTime.split(':').map(Number);
            const [eh, em] = assignForm.endTime.split(':').map(Number);
            if (eh < sh || (eh === sh && em <= sm)) {
                setAssignError('שעת סיום חייבת להיות אחרי שעת התחלה');
                return;
            }
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

    const approveShift = async (id: number) => {
        try {
            const res = await fetch(`${API_BASE_URL}/manager/shifts/${id}/approve`, {
                method: 'PUT',
                credentials: 'include'
            });
            if (res.ok) await fetchShifts();
        } catch { alert('שגיאה באישור המשמרת') }
    };

    const rejectShift = async (id: number) => {
        if (!confirm('האם אתה בטוח שברצונך לדחות משמרת זו?')) return;
        try {
            const res = await fetch(`${API_BASE_URL}/manager/shifts/${id}/reject`, {
                method: 'PUT',
                credentials: 'include'
            });
            if (res.ok) await fetchShifts();
        } catch { alert('שגיאה בדחיית המשמרת') }
    };

    const deletePlannedShift = async (id: number) => {
        if (!confirm('האם אתה בטוח שברצונך למחוק משמרת מתוכננת זו? המחיקה תעלים אותה גם למנהל וגם לעובד.')) return;
        try {
            const res = await fetch(`${API_BASE_URL}/shifts/${id}`, {
                method: 'DELETE',
                credentials: 'include'
            });
            if (res.ok) await fetchShifts();
        } catch { alert('שגיאה במחיקת המשמרת') }
    };

    const inputClass = "w-full h-10 px-3 rounded-lg text-right font-semibold outline-none focus:ring-2 focus:ring-[#0284C7] text-sm";

    const parseShiftDate = (dateStr: string): Date => {
        const [day, month, year] = dateStr.split('/').map(Number);
        return new Date(year, month - 1, day);
    };

    const displayed = shifts.filter(s => {
        const isPast = isShiftPast(s.date, s.endTime || s.startTime);
        const matchesTab = 
            activeTab === 'planned' 
                ? s.type === 'planned' && s.status !== 'rejected' && !isPast
                : activeTab === 'rejected'
                ? s.status === 'rejected'
                : (s.type !== 'planned' || isPast) && s.status !== 'rejected';
        const matchesFilter = !filter || (s.employeeName || '').toLowerCase().includes(filter.toLowerCase());
        
        let matchesDate = true;
        if (dateRangeType !== 'all') {
            const sDate = parseShiftDate(s.date);
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            if (activeTab === 'planned') {
                if (dateRangeType === 'past_week') {
                    const nextWeek = new Date();
                    nextWeek.setDate(nextWeek.getDate() + 7);
                    nextWeek.setHours(23, 59, 59, 999);
                    matchesDate = sDate >= today && sDate <= nextWeek;
                } else if (dateRangeType === 'past_month') {
                    const nextMonth = new Date();
                    nextMonth.setMonth(nextMonth.getMonth() + 1);
                    nextMonth.setHours(23, 59, 59, 999);
                    matchesDate = sDate >= today && sDate <= nextMonth;
                } else if (dateRangeType === 'custom') {
                    if (customStartDate) {
                        const cStart = new Date(customStartDate);
                        cStart.setHours(0, 0, 0, 0);
                        matchesDate = matchesDate && sDate >= cStart;
                    }
                    if (customEndDate) {
                        const cEnd = new Date(customEndDate);
                        cEnd.setHours(23, 59, 59, 999);
                        matchesDate = matchesDate && sDate <= cEnd;
                    }
                }
            } else {
                if (dateRangeType === 'past_week') {
                    const pastWeek = new Date();
                    pastWeek.setDate(pastWeek.getDate() - 7);
                    pastWeek.setHours(0, 0, 0, 0);
                    matchesDate = sDate >= pastWeek && sDate <= new Date();
                } else if (dateRangeType === 'past_month') {
                    const pastMonth = new Date();
                    pastMonth.setMonth(pastMonth.getMonth() - 1);
                    pastMonth.setHours(0, 0, 0, 0);
                    matchesDate = sDate >= pastMonth && sDate <= new Date();
                } else if (dateRangeType === 'custom') {
                    if (customStartDate) {
                        const cStart = new Date(customStartDate);
                        cStart.setHours(0, 0, 0, 0);
                        matchesDate = matchesDate && sDate >= cStart;
                    }
                    if (customEndDate) {
                        const cEnd = new Date(customEndDate);
                        cEnd.setHours(23, 59, 59, 999);
                        matchesDate = matchesDate && sDate <= cEnd;
                    }
                }
            }
        }

        return matchesTab && matchesFilter && matchesDate;
    });

    displayed.sort((a, b) => {
        const dateA = parseShiftDate(a.date).getTime();
        const dateB = parseShiftDate(b.date).getTime();
        const nameA = (a.employeeName || '').toLowerCase();
        const nameB = (b.employeeName || '').toLowerCase();
        
        if (sortBy === 'date') {
            return dateB - dateA;
        } else if (sortBy === 'date_asc') {
            return dateA - dateB;
        } else if (sortBy === 'employee') {
            return nameA.localeCompare(nameB);
        }
        return 0;
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
                <div className="mb-4 flex gap-3">
                    <button
                        onClick={() => setShowAssignModal(true)}
                        className="h-11 px-4 flex items-center justify-center gap-2 rounded-xl text-white font-bold shadow-md transition hover:opacity-90 whitespace-nowrap"
                        style={{ backgroundColor: BRAND_BLUE }}
                    >
                        <Plus size={20} />
                        שיבוץ משמרת
                    </button>
                </div>

                {/* Filter & Sort Controls */}
                <div className="mb-6 bg-white p-4 rounded-2xl shadow-sm border-2 flex flex-col gap-4" style={{ borderColor: INPUT_BG }}>
                    <div className="flex flex-col md:flex-row gap-3">
                        <div className="flex-1">
                            <label className="block text-xs font-semibold mb-1 text-[#0284C7]">סינון לפי עובד</label>
                            <input
                                type="text"
                                placeholder="שם עובד..."
                                className="w-full h-10 px-3 rounded-lg border-2 text-right outline-none focus:ring-2 focus:ring-[#0284C7] text-sm"
                                style={{ borderColor: INPUT_BG, color: BRAND_BLUE }}
                                value={filter}
                                onChange={e => setFilter(e.target.value)}
                            />
                        </div>
                        <div className="flex-1">
                            <label className="block text-xs font-semibold mb-1 text-[#0284C7]">מיון לפי</label>
                            <select
                                className="w-full h-10 px-3 rounded-lg border-2 text-right outline-none focus:ring-2 focus:ring-[#0284C7] text-sm"
                                style={{ borderColor: INPUT_BG, color: BRAND_BLUE }}
                                value={sortBy}
                                onChange={e => setSortBy(e.target.value as 'date' | 'date_asc' | 'employee')}
                            >
                                <option value="date">תאריך (מהחדש לישן)</option>
                                <option value="date_asc">תאריך (מהישן לחדש)</option>
                                <option value="employee">שם עובד</option>
                            </select>
                        </div>
                        <div className="flex-1">
                            <label className="block text-xs font-semibold mb-1 text-[#0284C7]">טווח תאריכים</label>
                            <select
                                className="w-full h-10 px-3 rounded-lg border-2 text-right outline-none focus:ring-2 focus:ring-[#0284C7] text-sm"
                                style={{ borderColor: INPUT_BG, color: BRAND_BLUE }}
                                value={dateRangeType}
                                onChange={e => setDateRangeType(e.target.value as 'past_week' | 'past_month' | 'all' | 'custom')}
                            >
                                <option value="past_week">
                                    {activeTab === 'planned' ? 'השבוע הקרוב (ברירת מחדל)' : 'השבוע האחרון (ברירת מחדל)'}
                                </option>
                                <option value="past_month">
                                    {activeTab === 'planned' ? 'החודש הקרוב' : 'החודש האחרון'}
                                </option>
                                <option value="all">כל התאריכים</option>
                                <option value="custom">טווח מותאם אישית</option>
                            </select>
                        </div>
                    </div>

                    {dateRangeType === 'custom' && (
                        <div className="flex gap-3 justify-end items-center border-t pt-3" style={{ borderColor: INPUT_BG }}>
                            <div className="flex items-center gap-2">
                                <label className="text-xs font-semibold text-[#0284C7]">מ-:</label>
                                <input
                                    type="date"
                                    className="h-10 px-3 rounded-lg border-2 outline-none focus:ring-2 focus:ring-[#0284C7] text-sm text-right"
                                    style={{ borderColor: INPUT_BG, color: BRAND_BLUE }}
                                    value={customStartDate}
                                    onChange={e => setCustomStartDate(e.target.value)}
                                />
                            </div>
                            <div className="flex items-center gap-2">
                                <label className="text-xs font-semibold text-[#0284C7]">עד:</label>
                                <input
                                    type="date"
                                    className="h-10 px-3 rounded-lg border-2 outline-none focus:ring-2 focus:ring-[#0284C7] text-sm text-right"
                                    style={{ borderColor: INPUT_BG, color: BRAND_BLUE }}
                                    value={customEndDate}
                                    onChange={e => setCustomEndDate(e.target.value)}
                                />
                            </div>
                        </div>
                    )}
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
                    <button
                        onClick={() => setActiveTab('rejected')}
                        className={`flex-1 py-2 text-sm font-bold rounded-lg transition ${activeTab === 'rejected' ? 'bg-[#0284C7] text-white' : 'text-[#0284C7] hover:bg-sky-50'}`}
                    >
                        משמרות שנדחו
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
                                        {shift.type === 'planned' && isShiftPast(shift.date, shift.endTime || shift.startTime) && (
                                            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-800">
                                                לא דווחה
                                            </span>
                                        )}
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
                                                    onChange={e => setEditForm({ ...editForm, date: formatDateInput(e.target.value) })}
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
                                                <div className="flex items-center gap-2">
                                                    <span className="font-bold text-lg" style={{ color: BRAND_BLUE }}>{shift.date}</span>
                                                    {shift.status === 'pending' && shift.type === 'reported' && (
                                                        <span className="bg-amber-100 text-amber-700 text-xs font-bold px-2 py-1 rounded-full">
                                                            ממתין לאישור
                                                        </span>
                                                    )}
                                                    {shift.status === 'rejected' && (
                                                        <span className="bg-red-100 text-red-700 text-xs font-bold px-2 py-1 rounded-full">
                                                            נדחתה
                                                        </span>
                                                    )}
                                                    {shift.status === 'approved' && shift.type === 'reported' && (
                                                        <span className="bg-green-100 text-green-700 text-xs font-bold px-2 py-1 rounded-full">
                                                            מאושרת
                                                        </span>
                                                    )}
                                                </div>
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
                                                {shift.status === 'pending' && shift.type === 'reported' ? (
                                                    <>
                                                        <button
                                                            onClick={() => approveShift(shift.ID)}
                                                            className="flex items-center gap-1 text-sm font-bold px-3 py-1.5 rounded-lg bg-green-50 text-green-700 border-2 border-green-200 transition hover:bg-green-100"
                                                        >
                                                            <Check size={16} /> אישור
                                                        </button>
                                                        <button
                                                            onClick={() => rejectShift(shift.ID)}
                                                            className="flex items-center gap-1 text-sm font-bold px-3 py-1.5 rounded-lg bg-red-50 text-red-700 border-2 border-red-200 transition hover:bg-red-100"
                                                        >
                                                            <X size={16} /> דחייה
                                                        </button>
                                                    </>
                                                ) : shift.status === 'rejected' ? (
                                                    <span className="bg-red-50 text-red-700 text-xs font-bold px-3 py-1.5 rounded-lg border border-red-200">
                                                        משמרת זו נדחתה
                                                    </span>
                                                ) : (
                                                    <>
                                                        {shift.type === 'planned' && (
                                                            <button
                                                                onClick={() => deletePlannedShift(shift.ID)}
                                                                className="flex items-center gap-1 text-sm font-bold px-3 py-1.5 rounded-lg border-2 transition hover:bg-red-50 text-red-600 border-red-600"
                                                            >
                                                                <X size={14} />
                                                                מחיקה
                                                            </button>
                                                        )}
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
                                    onChange={e => setAssignForm({ ...assignForm, date: formatDateInput(e.target.value) })}
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
