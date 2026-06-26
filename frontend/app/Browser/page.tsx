'use client';

import { API_BASE_URL } from '../config';
import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Layers, Clock, ArrowRight, LogOut, Car } from 'lucide-react';

const BRAND_BLUE = '#0284C7';
const BG_CREAM = '#FFFFFF';

interface UserProfile {
    username: string;
    phone: string;
    role: string;
    isFlexibleModel: boolean;
    isRegularModel: boolean;
}

const EmployeePanelPage = () => {
    const router = useRouter();

    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(true);

    // ---- Session Guard ----
    useEffect(() => {
        const verify = async () => {
            try {
                const res = await fetch(`${API_BASE_URL}/me`, { credentials: 'include' });
                if (!res.ok) { router.push('/'); return; }
                const data = await res.json();
                setProfile(data);
            } catch {
                router.push('/');
            } finally {
                setLoading(false);
            }
        };
        verify();
    }, [router]);

    // ---- Logout ----
    const handleLogout = async () => {
        await fetch(`${API_BASE_URL}/logout`, { method: 'POST', credentials: 'include' });
        router.push('/');
    };

    // ---- Shared Button Styles ----
    const primaryBtn = "w-full h-20 flex items-center justify-between px-6 rounded-xl shadow-md text-white transition-all hover:opacity-90 active:scale-95";
    const outlineBtn = "w-full h-20 flex items-center justify-between px-6 rounded-xl shadow-md border-2 transition-all hover:opacity-80 active:scale-95";

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
                    onClick={() => {
                        if (profile?.role === 'manager') router.push('/ManagerMenu');
                        else handleLogout();
                    }}
                    className="flex items-center gap-2 font-bold hover:opacity-70 transition"
                    style={{ color: BRAND_BLUE }}
                >
                    <ArrowRight size={22} />
                    <span>חזרה</span>
                </button>
                <div className="text-right">
                    <h1 className="text-2xl font-bold" style={{ color: BRAND_BLUE }}>פאנל עובד</h1>
                    {profile?.username && (
                        <p className="text-sm opacity-60" style={{ color: BRAND_BLUE }}>שלום, {profile.username}</p>
                    )}
                </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col gap-4 max-w-md mx-auto">

                {/* Reported Shifts — view & edit all shifts */}
                <button
                    id="reportedShiftsBtn"
                    onClick={() => router.push('/ReportedShifts')}
                    className={outlineBtn}
                    style={{ borderColor: BRAND_BLUE, color: BRAND_BLUE, backgroundColor: 'white' }}
                >
                    <span className="text-xl font-bold">המשמרות שלי</span>
                    <Clock size={26} />
                </button>

                {/* Flexible Model — only if isFlexibleModel is true */}
                {profile?.isFlexibleModel && (
                    <button
                        id="flexibleModelBtn"
                        onClick={() => router.push('/FlexibleModel')}
                        className={primaryBtn}
                        style={{ backgroundColor: BRAND_BLUE }}
                    >
                        <span className="text-xl font-bold">מודל גמיש</span>
                        <Layers size={28} className="opacity-80" />
                    </button>
                )}

                {/* Regular Model — only if isRegularModel is true */}
                {profile?.isRegularModel && (
                    <button
                        id="regularModelBtn"
                        onClick={() => router.push('/RegularShift')}
                        className={primaryBtn}
                        style={{ backgroundColor: BRAND_BLUE }}
                    >
                        <span className="text-xl font-bold">מודל קבוע</span>
                        <Clock size={28} className="opacity-80" />
                    </button>
                )}

                {/* Driving Reports */}
                <button
                    id="drivingReportsBtn"
                    onClick={() => router.push('/DrivingReports')}
                    className={outlineBtn}
                    style={{ borderColor: BRAND_BLUE, color: BRAND_BLUE, backgroundColor: 'white' }}
                >
                    <span className="text-xl font-bold">דוחות נסיעות</span>
                    <Car size={26} />
                </button>

                {/* Logout */}
                <button
                    id="logoutBtn"
                    onClick={handleLogout}
                    className={outlineBtn}
                    style={{ borderColor: '#dc2626', color: '#dc2626', backgroundColor: 'white' }}
                >
                    <span className="text-xl font-bold">התנתקות</span>
                    <LogOut size={26} />
                </button>

            </div>
        </div>
    );
};

export default EmployeePanelPage;