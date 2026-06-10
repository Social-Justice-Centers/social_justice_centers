"use client";

import { API_BASE_URL } from '../config';
import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { UserPlus, ArrowRight, Car, Users, Download, X } from 'lucide-react';

const BRAND_BLUE = '#0284C7';
const BG_CREAM = '#FFFFFF';

// ---- Component ----
const ManagerPage = () => {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [showExportModal, setShowExportModal] = useState(false);

    // Export Modal States
    const [exportMonth, setExportMonth] = useState(() => {
        const str = new Date().toLocaleString("en-US", { timeZone: "Asia/Jerusalem" });
        const m = new Date(str).getMonth() + 1;
        return m < 10 ? `0${m}` : `${m}`;
    });
    const [exportYear, setExportYear] = useState(() => {
        const str = new Date().toLocaleString("en-US", { timeZone: "Asia/Jerusalem" });
        return new Date(str).getFullYear().toString();
    });
    const [exportError, setExportError] = useState('');
    const [isExporting, setIsExporting] = useState(false);

    const handleExportMichpal = async () => {
        setIsExporting(true);
        setExportError('');
        try {
            const res = await fetch(`${API_BASE_URL}/manager/export/michpal?month=${exportMonth}&year=${exportYear}`, {
                credentials: 'include',
            });
            if (!res.ok) {
                const data = await res.json();
                setExportError(data.error || 'שגיאה בייצוא הנתונים');
                setIsExporting(false);
                return;
            }
            // Trigger browser download
            const blob = await res.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `michpal_export_${exportYear}_${exportMonth}.xls`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
            setShowExportModal(false);
        } catch {
            setExportError('שגיאת תקשורת עם השרת');
        } finally {
            setIsExporting(false);
        }
    };

    // ---- Session Guard ----
    useEffect(() => {
        const verify = async () => {
            try {
                const res = await fetch(`${API_BASE_URL}/me`, { credentials: 'include' });
                if (!res.ok) { router.push('/'); return; }
                const data = await res.json();
                if (data.role !== 'manager') { router.push('/Browser'); return; }
            } catch {
                router.push('/');
            } finally {
                setLoading(false);
            }
        };
        verify();
    }, [router]);

    if (loading) return (
        <div style={{ backgroundColor: BG_CREAM }} className="flex min-h-screen items-center justify-center">
            <p style={{ color: BRAND_BLUE }} className="text-xl font-bold">טוען...</p>
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
                    style={{ color: BRAND_BLUE }}
                >
                    <ArrowRight size={22} />
                    <span>חזרה</span>
                </button>
                <h1 className="text-2xl font-bold" style={{ color: BRAND_BLUE }}>פאנל מנהל</h1>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col gap-4 max-w-md mx-auto">

                {/* Add Employee */}
                <button
                    id="addEmployeeBtn"
                    onClick={() => router.push('/AddUserPage')}
                    className="w-full h-20 flex items-center justify-between px-6 rounded-xl shadow-md text-white transition-all hover:opacity-90 active:scale-95"
                    style={{ backgroundColor: BRAND_BLUE }}
                >
                    <span className="text-xl font-bold">הוספת עובד</span>
                    <UserPlus size={28} className="opacity-80" />
                </button>

                {/* View Team */}
                <button
                    id="viewTeamBtn"
                    onClick={() => router.push('/MyEmployees')}
                    className="w-full h-20 flex items-center justify-between px-6 rounded-xl shadow-md border-2 transition-all hover:opacity-80 active:scale-95"
                    style={{ borderColor: BRAND_BLUE, color: BRAND_BLUE, backgroundColor: 'white' }}
                >
                    <span className="text-xl font-bold">העובדים שלי</span>
                    <Users size={24} />
                </button>

                {/* View Team Shifts */}
                <button
                    id="teamShiftsBtn"
                    onClick={() => router.push('/TeamShifts')}
                    className="w-full h-20 flex items-center justify-between px-6 rounded-xl shadow-md border-2 transition-all hover:opacity-80 active:scale-95"
                    style={{ borderColor: BRAND_BLUE, color: BRAND_BLUE, backgroundColor: 'white' }}
                >
                    <span className="text-xl font-bold">משמרות הצוות</span>
                    <ArrowRight size={24} className="rotate-180" />
                </button>

                {/* Approve Driving Reports */}
                <button
                    id="approveDrivingReportsBtn"
                    onClick={() => router.push('/DrivingReports/approve')}
                    className="w-full h-20 flex items-center justify-between px-6 rounded-xl shadow-md border-2 transition-all hover:opacity-80 active:scale-95"
                    style={{ borderColor: BRAND_BLUE, color: BRAND_BLUE, backgroundColor: 'white' }}
                >
                    <span className="text-xl font-bold">אישור דוחות נסיעות</span>
                    <Car size={28} />
                </button>

                {/* Export Data */}
                <button
                    id="exportBtn"
                    onClick={() => setShowExportModal(true)}
                    className="w-full h-20 flex items-center justify-between px-6 rounded-xl shadow-md border-2 transition-all hover:opacity-80 active:scale-95"
                    style={{ borderColor: BRAND_BLUE, color: BRAND_BLUE, backgroundColor: 'white' }}
                >
                    <span className="text-xl font-bold">ייצוא נתונים למיכפל</span>
                    <Download size={28} />
                </button>

            </div>

            {/* Export Modal Backdrop */}
            {showExportModal && (
                <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50 overflow-y-auto">
                    {/* Modal Content */}
                    <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl relative text-center" dir="rtl">
                        <button
                            id="closeExportModalBtn"
                            onClick={() => {
                                setShowExportModal(false);
                                setExportError('');
                            }}
                            className="absolute top-4 left-4 p-1 rounded-full hover:bg-gray-100 transition"
                            style={{ color: BRAND_BLUE }}
                            disabled={isExporting}
                        >
                            <X size={24} />
                        </button>

                        <div className="flex flex-col items-center gap-4 mt-4">
                            <div className="p-3 bg-sky-100 rounded-full text-[#0284C7] mb-2">
                                <Download size={40} />
                            </div>
                            <h2 className="text-2xl font-bold" style={{ color: BRAND_BLUE }}>ייצוא נתונים למיכפל</h2>
                            <p className="text-gray-600 font-medium text-base leading-relaxed px-2">
                                כאן תוכלו לייצא נתוני נוכחות ושכר של עובדים בפורמט התואם לתוכנת השכר &quot;מיכפל&quot;.
                            </p>
                        </div>

                        {/* Selectors */}
                        <div className="mt-6 space-y-4 text-right">
                            <div className="flex gap-4">
                                <div className="flex-1">
                                    <label htmlFor="exportMonthSelect" className="block text-sm font-semibold mb-1" style={{ color: BRAND_BLUE }}>חודש דיווח</label>
                                    <select
                                        id="exportMonthSelect"
                                        className="w-full h-11 px-3 rounded-xl border-2 text-right outline-none focus:ring-2 focus:ring-[#0284C7] font-semibold text-sm bg-white"
                                        style={{ borderColor: '#E0F2FE', color: BRAND_BLUE }}
                                        value={exportMonth}
                                        onChange={(e) => setExportMonth(e.target.value)}
                                        disabled={isExporting}
                                    >
                                        <option value="01">ינואר (01)</option>
                                        <option value="02">פברואר (02)</option>
                                        <option value="03">מרץ (03)</option>
                                        <option value="04">אפריל (04)</option>
                                        <option value="05">מאי (05)</option>
                                        <option value="06">יוני (06)</option>
                                        <option value="07">יולי (07)</option>
                                        <option value="08">אוגוסט (08)</option>
                                        <option value="09">ספטמבר (09)</option>
                                        <option value="10">אוקטובר (10)</option>
                                        <option value="11">נובמבר (11)</option>
                                        <option value="12">דצמבר (12)</option>
                                    </select>
                                </div>
                                <div className="flex-1">
                                    <label htmlFor="exportYearSelect" className="block text-sm font-semibold mb-1" style={{ color: BRAND_BLUE }}>שנת מס</label>
                                    <select
                                        id="exportYearSelect"
                                        className="w-full h-11 px-3 rounded-xl border-2 text-right outline-none focus:ring-2 focus:ring-[#0284C7] font-semibold text-sm bg-white"
                                        style={{ borderColor: '#E0F2FE', color: BRAND_BLUE }}
                                        value={exportYear}
                                        onChange={(e) => setExportYear(e.target.value)}
                                        disabled={isExporting}
                                    >
                                        <option value="2025">2025</option>
                                        <option value="2026">2026</option>
                                        <option value="2027">2027</option>
                                    </select>
                                </div>
                            </div>
                        </div>

                        {exportError && (
                            <div className="mt-4 bg-red-50 text-red-600 p-3 rounded-lg text-center font-semibold text-xs border border-red-200">
                                {exportError}
                            </div>
                        )}

                        <div className="mt-8 flex gap-3">
                            <button
                                id="confirmExportModalBtn"
                                onClick={handleExportMichpal}
                                disabled={isExporting}
                                className="w-full h-12 flex items-center justify-center gap-2 text-white font-bold rounded-xl transition hover:opacity-90 disabled:opacity-50"
                                style={{ backgroundColor: BRAND_BLUE }}
                            >
                                {isExporting ? 'מייצא קובץ...' : 'הורד קובץ XLS'}
                            </button>
                            <button
                                id="cancelExportModalBtn"
                                onClick={() => {
                                    setShowExportModal(false);
                                    setExportError('');
                                }}
                                disabled={isExporting}
                                className="w-full h-12 flex items-center justify-center gap-2 font-bold rounded-xl border-2 transition hover:bg-gray-50 disabled:opacity-50"
                                style={{ borderColor: BRAND_BLUE, color: BRAND_BLUE }}
                            >
                                ביטול
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ManagerPage;