'use client';

import { API_BASE_URL } from '../config';
import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, Layers } from 'lucide-react';

const BRAND_GREEN = '#446F41';
const BG_CREAM = '#FFFFFF';

const FlexibleModelPage = () => {
    const router = useRouter();
    const [loading, setLoading] = useState(true);

    // ---- Session Guard ----
    useEffect(() => {
        const verify = async () => {
            try {
                const res = await fetch(`${API_BASE_URL}/me`, { credentials: 'include' });
                if (!res.ok) router.push('/');
            } catch {
                router.push('/');
            } finally {
                setLoading(false);
            }
        };
        verify();
    }, []);

    if (loading) return (
        <div style={{ backgroundColor: BG_CREAM }} className="flex min-h-screen items-center justify-center">
            <p style={{ color: BRAND_GREEN }} className="text-xl font-bold">טוען...</p>
        </div>
    );

    return (
        <div style={{ backgroundColor: BG_CREAM }} className="min-h-screen p-6" dir="rtl">
            {/* Header */}
            <div className="flex items-center justify-between mb-12">
                <button
                    id="backBtn"
                    onClick={() => router.push('/Browser')}
                    className="flex items-center gap-2 font-bold hover:opacity-70 transition"
                    style={{ color: BRAND_GREEN }}
                >
                    <ArrowRight size={22} />
                    <span>חזרה</span>
                </button>
                <h1 className="text-2xl font-bold" style={{ color: BRAND_GREEN }}>מודל גמיש</h1>
            </div>

            {/* Blank State Content */}
            <div className="flex flex-col items-center justify-center mt-20 opacity-50">
                <Layers size={80} style={{ color: BRAND_GREEN }} className="mb-6" />
                <h2 className="text-2xl font-bold text-center" style={{ color: BRAND_GREEN }}>מסך מודל גמיש</h2>
                <p className="text-gray-500 mt-4 text-center">כאן יופיע בעתיד התוכן למודל גמיש.</p>
            </div>
        </div>
    );
};

export default FlexibleModelPage;
