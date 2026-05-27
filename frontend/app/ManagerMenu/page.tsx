"use client";

import { API_BASE_URL } from '../config';
import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { ArrowRight } from 'lucide-react';

const LOGO_SRC = '/images/logo.png';
const BRAND_GREEN = '#446F41';
const BG_CREAM = '#FFFFFF';

const ManagerMenuPage = () => {
    const router = useRouter();
    const [username, setUsername] = useState('');
    const [loading, setLoading] = useState(true);

    // Guard: verify the session is valid and the user is a manager
    useEffect(() => {
        const verifySession = async () => {
            try {
                const res = await fetch(`${API_BASE_URL}/me`, {
                    credentials: 'include',
                });

                if (!res.ok) {
                    router.push('/');
                    return;
                }

                const data = await res.json();

                if (data.role !== 'manager') {
                    // Regular employee should not be on this screen
                    router.push('/Browser');
                    return;
                }

                setUsername(data.username);
            } catch {
                router.push('/');
            } finally {
                setLoading(false);
            }
        };

        verifySession();
    }, []);

    const handleLogout = async () => {
        await fetch(`${API_BASE_URL}/logout`, {
            method: 'POST',
            credentials: 'include',
        });
        router.push('/');
    };

    if (loading) {
        return (
            <div style={{ backgroundColor: BG_CREAM }} className="flex min-h-screen items-center justify-center">
                <p style={{ color: BRAND_GREEN }} className="text-xl font-bold">טוען...</p>
            </div>
        );
    }

    return (
        <div style={{ backgroundColor: BG_CREAM }} className="min-h-screen p-6 relative flex flex-col items-center justify-center" dir="rtl">

            {/* Back Button (Logout) */}
            <div className="absolute top-6 right-6">
                <button
                    onClick={handleLogout}
                    className="flex items-center gap-2 font-bold hover:opacity-70 transition"
                    style={{ color: BRAND_GREEN }}
                >
                    <ArrowRight size={22} />
                    <span>חזרה</span>
                </button>
            </div>

            {/* Logo */}
            <div className="mb-10">
                <Image
                    src={LOGO_SRC}
                    alt="לוגו מרכזים לצדק חברתי"
                    width={180}
                    height={180}
                    priority
                />
            </div>

            {/* Greeting */}
            <h1 style={{ color: BRAND_GREEN }} className="text-2xl font-bold mb-2">
                שלום, {username}
            </h1>
            <p style={{ color: BRAND_GREEN }} className="text-md mb-12 opacity-70">
                בחר את הפאנל אליו תרצה להיכנס
            </p>

            {/* Choice Buttons */}
            <div className="flex flex-col gap-5 w-full max-w-xs">

                <button
                    id="managerPanelBtn"
                    onClick={() => router.push('/Manager')}
                    className="w-full h-20 text-xl font-bold text-white rounded-xl shadow-lg transition duration-150 ease-in-out hover:opacity-90 active:scale-95"
                    style={{ backgroundColor: BRAND_GREEN }}
                >
                    פאנל מנהל
                </button>

                <button
                    id="employeePanelBtn"
                    onClick={() => router.push('/Browser')}
                    className="w-full h-20 text-xl font-bold rounded-xl shadow-md border-2 transition duration-150 ease-in-out hover:opacity-80 active:scale-95"
                    style={{ borderColor: BRAND_GREEN, color: BRAND_GREEN, backgroundColor: 'transparent' }}
                >
                    פאנל עובד
                </button>


            </div>

            {/* Logout */}
            <button
                id="logoutBtn"
                onClick={handleLogout}
                className="mt-16 text-sm font-semibold underline opacity-60 hover:opacity-100 transition"
                style={{ color: BRAND_GREEN }}
            >
                התנתק
            </button>

        </div>
    );
};

export default ManagerMenuPage;
