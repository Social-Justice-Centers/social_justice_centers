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
                            onClick={() => setShowExportModal(false)}
                            className="absolute top-4 left-4 p-1 rounded-full hover:bg-gray-100 transition"
                            style={{ color: BRAND_BLUE }}
                        >
                            <X size={24} />
                        </button>

                        <div className="flex flex-col items-center gap-4 mt-4">
                            <div className="p-3 bg-sky-100 rounded-full text-[#0284C7] mb-2">
                                <Download size={40} />
                            </div>
                            <h2 className="text-2xl font-bold" style={{ color: BRAND_BLUE }}>ייצוא נתונים למיכפל</h2>
                            <p className="text-gray-600 font-medium text-base leading-relaxed px-2">
                                כאן תוכלו לייצא נתוני נוכחות ושכר של עובדים בפורמט התואם לתוכנת השכר "מיכפל".
                                <br />
                                <span className="font-semibold text-sm text-[#0284C7] mt-2 block">
                                    אפשרות זו נמצאת כעת בפיתוח ותהיה זמינה בקרוב!
                                </span>
                            </p>
                        </div>

                        <div className="mt-8 flex gap-3">
                            <button
                                id="confirmExportModalBtn"
                                onClick={() => setShowExportModal(false)}
                                className="w-full h-12 flex items-center justify-center gap-2 text-white font-bold rounded-xl transition hover:opacity-90"
                                style={{ backgroundColor: BRAND_BLUE }}
                            >
                                הבנתי, תודה
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ManagerPage;