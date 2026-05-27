"use client";

import { API_BASE_URL } from '../config';
import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { UserPlus, CalendarPlus, ArrowRight, Car } from 'lucide-react';

const BRAND_GREEN = '#446F41';
const BG_CREAM = '#FFFFFF';
const INPUT_BG = '#B2C6AE';

// ---- Types ----
interface TeamMember {
    id: number;
    username: string;
    phone: string;
    email: string;
    role: string;
    isFlexibleModel: boolean;
    isRegularModel: boolean;
}

interface ShiftForm {
    assignedTo: string;
    date: string;
    startTime: string;
    endTime: string;
    notes: string;
}

const today = () => new Date().toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\./g, '/');

// ---- Component ----
const ManagerPage = () => {
    const router = useRouter();

    const [myPhone, setMyPhone] = useState('');
    const [loading, setLoading] = useState(true);

    // Team list state
    const [team, setTeam] = useState<TeamMember[]>([]);
    const [teamLoading, setTeamLoading] = useState(false);

    // Assign shift modal state
    const [showShiftModal, setShowShiftModal] = useState(false);
    const [shiftForm, setShiftForm] = useState<ShiftForm>({
        assignedTo: '', date: today(), startTime: '', endTime: '', notes: '',
    });
    const [shiftLoading, setShiftLoading] = useState(false);
    const [shiftError, setShiftError] = useState('');
    const [shiftSuccess, setShiftSuccess] = useState('');

    // ---- Session Guard ----
    useEffect(() => {
        const verify = async () => {
            try {
                const res = await fetch(`${API_BASE_URL}/me`, { credentials: 'include' });
                if (!res.ok) { router.push('/'); return; }
                const data = await res.json();
                if (data.role !== 'manager') { router.push('/Browser'); return; }
                setMyPhone(data.phone);
            } catch {
                router.push('/');
            } finally {
                setLoading(false);
            }
        };
        verify();
    }, [router]);

    // ---- Fetch Team (For Modal) ----
    // We only need this when opening the shift modal now
    const fetchTeamForModal = async () => {
        setTeamLoading(true);
        try {
            const res = await fetch(`${API_BASE_URL}/users/team`, { credentials: 'include' });
            const data = await res.json();
            setTeam(Array.isArray(data) ? data : []);
        } finally {
            setTeamLoading(false);
        }
    };

    // ---- Assign Shift ----
    const handleAssignShift = async (e: React.FormEvent) => {
        e.preventDefault();
        setShiftError('');
        setShiftSuccess('');
        if (!shiftForm.assignedTo) { setShiftError('נא לבחור עובד'); return; }
        if (!shiftForm.startTime || !shiftForm.endTime) { setShiftError('נא למלא שעת התחלה וסיום'); return; }

        setShiftLoading(true);
        try {
            const res = await fetch(`${API_BASE_URL}/shifts`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify(shiftForm),
            });
            const data = await res.json();
            if (!res.ok) { setShiftError(data.error || 'שגיאה בהקצאת המשמרת'); return; }
            setShiftSuccess('משמרת הוקצתה בהצלחה!');
            setShiftForm({ assignedTo: '', date: today(), startTime: '', endTime: '', notes: '' });
        } catch {
            setShiftError('שגיאת תקשורת עם השרת');
        } finally {
            setShiftLoading(false);
        }
    };

    // ---- Open shift modal and ensure team is loaded ----
    const openShiftModal = async () => {
        setShiftError('');
        setShiftSuccess('');
        setShowShiftModal(true);
        if (team.length === 0) {
            await fetchTeamForModal();
        }
    };

    // ---- Shared Input Style ----
    const inputClass = "w-full h-12 px-4 rounded-lg text-right font-semibold outline-none focus:ring-2 focus:ring-[#446F41]";

    if (loading) return (
        <div style={{ backgroundColor: BG_CREAM }} className="flex min-h-screen items-center justify-center">
            <p style={{ color: BRAND_GREEN }} className="text-xl font-bold">טוען...</p>
        </div>
    );

    return (
        <div style={{ backgroundColor: BG_CREAM }} className="min-h-screen p-6" dir="rtl">

            {/* Header */}
            <div className="flex items-center justify-between mb-8">
                <button
                    id="backBtn"
                    onClick={() => router.push('/ManagerMenu')}
                    className="flex items-center gap-2 font-bold hover:opacity-70 transition"
                    style={{ color: BRAND_GREEN }}
                >
                    <ArrowRight size={22} />
                    <span>חזרה</span>
                </button>
                <h1 className="text-2xl font-bold" style={{ color: BRAND_GREEN }}>פאנל מנהל</h1>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col gap-4 max-w-md mx-auto">

                {/* Add Employee */}
                <button
                    id="addEmployeeBtn"
                    onClick={() => router.push('/AddUserPage')}
                    className="w-full h-20 flex items-center justify-between px-6 rounded-xl shadow-md text-white transition-all hover:opacity-90 active:scale-95"
                    style={{ backgroundColor: BRAND_GREEN }}
                >
                    <span className="text-xl font-bold">הוספת עובד</span>
                    <UserPlus size={28} className="opacity-80" />
                </button>

                {/* View Team */}
                <button
                    id="viewTeamBtn"
                    onClick={() => router.push('/MyEmployees')}
                    className="w-full h-20 flex items-center justify-between px-6 rounded-xl shadow-md border-2 transition-all hover:opacity-80 active:scale-95"
                    style={{ borderColor: BRAND_GREEN, color: BRAND_GREEN, backgroundColor: 'white' }}
                >
                    <span className="text-xl font-bold">העובדים שלי</span>
                    <ArrowRight size={24} className="rotate-180" />
                </button>

                {/* Assign Shift */}
                <button
                    id="assignShiftBtn"
                    onClick={openShiftModal}
                    className="w-full h-20 flex items-center justify-between px-6 rounded-xl shadow-md text-white transition-all hover:opacity-90 active:scale-95"
                    style={{ backgroundColor: BRAND_GREEN }}
                >
                    <span className="text-xl font-bold">הקצאת משמרת</span>
                    <CalendarPlus size={28} className="opacity-80" />
                </button>

                {/* Approve Driving Reports */}
                <button
                    id="approveDrivingReportsBtn"
                    onClick={() => router.push('/DrivingReports/approve')}
                    className="w-full h-20 flex items-center justify-between px-6 rounded-xl shadow-md border-2 transition-all hover:opacity-80 active:scale-95"
                    style={{ borderColor: BRAND_GREEN, color: BRAND_GREEN, backgroundColor: 'white' }}
                >
                    <span className="text-xl font-bold">אישור דוחות נסיעות</span>
                    <Car size={28} />
                </button>

            </div>


            {/* ---- Assign Shift Modal (Full Screen) ---- */}
            {showShiftModal && (
                <div className="fixed inset-0 bg-white flex flex-col p-6 z-50 overflow-y-auto" dir="rtl">
                    <button
                        onClick={() => setShowShiftModal(false)}
                        className="absolute top-6 right-6 flex items-center gap-2 font-bold hover:opacity-70 transition z-10"
                        style={{ color: BRAND_GREEN }}
                    >
                        <ArrowRight size={22} />
                        <span>חזרה לפאנל מנהל</span>
                    </button>
                    
                    <div className="max-w-md mx-auto w-full pt-14">
                        <div className="flex justify-center items-center mb-8">
                            <h2 className="text-3xl font-bold" style={{ color: BRAND_GREEN }}>הקצאת משמרת</h2>
                        </div>

                        {shiftSuccess ? (
                            <div className="text-center py-6">
                                <p className="text-green-600 text-lg font-bold mb-4">{shiftSuccess}</p>
                                <button
                                    onClick={() => setShowShiftModal(false)}
                                    className="px-6 py-2 rounded-lg text-white font-bold"
                                    style={{ backgroundColor: BRAND_GREEN }}
                                >סגור</button>
                            </div>
                        ) : (
                            <form onSubmit={handleAssignShift} className="space-y-4">

                                {/* Employee Selector */}
                                <div>
                                    <label className="block text-sm font-semibold mb-1" style={{ color: BRAND_GREEN }}>עובד</label>
                                    <select
                                        id="assignedToSelect"
                                        className={inputClass}
                                        style={{ backgroundColor: INPUT_BG, color: BRAND_GREEN }}
                                        value={shiftForm.assignedTo}
                                        onChange={(e) => setShiftForm({ ...shiftForm, assignedTo: e.target.value })}
                                    >
                                        <option value="">— בחר עובד —</option>
                                        {/* Manager can also assign to themselves */}
                                        <option value={myPhone}>אני (המנהל)</option>
                                        {teamLoading ? (
                                            <option disabled>טוען עובדים...</option>
                                        ) : (
                                            team.map((m) => (
                                                <option key={m.id} value={m.phone}>{m.username} ({m.phone})</option>
                                            ))
                                        )}
                                    </select>
                                </div>

                                {/* Date */}
                                <div>
                                    <label className="block text-sm font-semibold mb-1" style={{ color: BRAND_GREEN }}>תאריך</label>
                                    <input
                                        id="shiftDate"
                                        type="text"
                                        placeholder="DD/MM/YYYY"
                                        className={inputClass}
                                        style={{ backgroundColor: INPUT_BG, color: BRAND_GREEN }}
                                        value={shiftForm.date}
                                        onChange={(e) => setShiftForm({ ...shiftForm, date: e.target.value })}
                                    />
                                </div>

                                {/* Start / End Time */}
                                <div className="flex gap-3">
                                    <div className="flex-1">
                                        <label className="block text-sm font-semibold mb-1" style={{ color: BRAND_GREEN }}>שעת התחלה</label>
                                        <input
                                            id="startTime"
                                            type="time"
                                            className={inputClass}
                                            style={{ backgroundColor: INPUT_BG, color: BRAND_GREEN }}
                                            value={shiftForm.startTime}
                                            onChange={(e) => setShiftForm({ ...shiftForm, startTime: e.target.value })}
                                        />
                                    </div>
                                    <div className="flex-1">
                                        <label className="block text-sm font-semibold mb-1" style={{ color: BRAND_GREEN }}>שעת סיום</label>
                                        <input
                                            id="endTime"
                                            type="time"
                                            className={inputClass}
                                            style={{ backgroundColor: INPUT_BG, color: BRAND_GREEN }}
                                            value={shiftForm.endTime}
                                            onChange={(e) => setShiftForm({ ...shiftForm, endTime: e.target.value })}
                                        />
                                    </div>
                                </div>

                                {/* Notes */}
                                <div>
                                    <label className="block text-sm font-semibold mb-1" style={{ color: BRAND_GREEN }}>הערות</label>
                                    <textarea
                                        id="shiftNotes"
                                        rows={3}
                                        placeholder="הערות אופציונליות..."
                                        className="w-full px-4 py-3 rounded-lg text-right font-semibold outline-none focus:ring-2 focus:ring-[#446F41] resize-none"
                                        style={{ backgroundColor: INPUT_BG, color: BRAND_GREEN }}
                                        value={shiftForm.notes}
                                        onChange={(e) => setShiftForm({ ...shiftForm, notes: e.target.value })}
                                    />
                                </div>

                                {shiftError && <p className="text-red-600 text-center font-bold text-sm">{shiftError}</p>}

                                <button
                                    id="submitShiftBtn"
                                    type="submit"
                                    disabled={shiftLoading}
                                    className="w-full h-14 text-white text-lg font-bold rounded-xl transition hover:opacity-90 disabled:opacity-50"
                                    style={{ backgroundColor: BRAND_GREEN }}
                                >
                                    {shiftLoading ? 'שומר...' : 'הקצה משמרת'}
                                </button>

                            </form>
                        )}
                    </div>
                </div>
            )}

        </div>
    );
};

export default ManagerPage;