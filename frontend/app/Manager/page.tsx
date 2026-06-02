"use client";

import { API_BASE_URL } from '../config';
import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { UserPlus, ArrowRight, Car, Users } from 'lucide-react';

const BRAND_BLUE = '#0284C7';
const BG_CREAM = '#FFFFFF';

// ---- Component ----
const ManagerPage = () => {
    const router = useRouter();
    const [loading, setLoading] = useState(true);

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

            </div>
        </div>
    );
};

export default ManagerPage;