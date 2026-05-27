'use client';

import { API_BASE_URL } from '../config';
import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Calendar, ArrowRight } from 'lucide-react';

const BRAND_GREEN = '#446F41';
const BG_CREAM = '#FFFFFF';
const INPUT_BG = '#B2C6AE';

interface Shift {
    ID: number;
    assignedTo: string;
    assignedBy: string;
    type: string;
    date: string;
    startTime: string;
    endTime: string;
    notes: string;
}

const MyShiftsPage = () => {
    const router = useRouter();
    const [shifts, setShifts] = useState<Shift[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchShifts = async () => {
            try {
                const res = await fetch(`${API_BASE_URL}/shifts`, { credentials: 'include' });
                if (!res.ok) {
                    if (res.status === 401) router.push('/');
                    return;
                }
                const data = await res.json();
                const filtered = Array.isArray(data) ? data.filter((s: Shift) => s.type === 'planned') : [];
                setShifts(filtered);
            } catch (err) {
                console.error("Error fetching shifts", err);
            } finally {
                setLoading(false);
            }
        };

        fetchShifts();
    }, [router]);

    if (loading) return (
        <div style={{ backgroundColor: BG_CREAM }} className="flex min-h-screen items-center justify-center">
            <p style={{ color: BRAND_GREEN }} className="text-xl font-bold">טוען משמרות...</p>
        </div>
    );

    return (
        <div style={{ backgroundColor: BG_CREAM }} className="min-h-screen p-6 relative" dir="rtl">
            <button
                onClick={() => router.push('/Browser')}
                className="absolute top-6 right-6 flex items-center gap-2 font-bold hover:opacity-70 transition z-10"
                style={{ color: BRAND_GREEN }}
            >
                <ArrowRight size={22} />
                <span>חזרה לפאנל</span>
            </button>

            <div className="max-w-3xl mx-auto pt-14">
                {/* Header */}
                <div className="flex items-center justify-center mb-8">
                    <div className="flex items-center gap-3">
                        <h1 className="text-2xl font-bold" style={{ color: BRAND_GREEN }}>המשמרות המתוכננות שלי</h1>
                        <Calendar size={28} style={{ color: BRAND_GREEN }} />
                    </div>
                </div>

                {/* Shifts List */}
                <div className="bg-white rounded-2xl shadow-lg p-6" style={{ border: `2px solid ${BRAND_GREEN}` }}>
                    {shifts.length === 0 ? (
                        <p className="text-center text-gray-400 py-10 font-bold text-lg">אין משמרות מוקצות עדיין</p>
                    ) : (
                        <ul className="space-y-4">
                            {shifts.map((shift) => (
                                <li key={shift.ID} className="border-2 rounded-xl p-4 flex flex-col gap-2 hover:bg-gray-50 transition"
                                    style={{ borderColor: INPUT_BG }}>
                                    <div className="flex justify-between items-center">
                                        <span className="font-bold text-lg" style={{ color: BRAND_GREEN }}>{shift.date}</span>
                                        <span className="font-semibold text-gray-600 bg-gray-100 px-3 py-1 rounded-full">
                                            {shift.startTime} — {shift.endTime || "פעילה"}
                                        </span>
                                    </div>
                                    {shift.notes && (
                                        <div className="mt-2 text-sm text-gray-500 bg-gray-50 p-3 rounded-lg border border-gray-100">
                                            <span className="font-bold">הערות: </span>{shift.notes}
                                        </div>
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

export default MyShiftsPage;
