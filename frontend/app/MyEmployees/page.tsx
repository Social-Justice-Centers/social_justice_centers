'use client';

import { API_BASE_URL } from '../config';
import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Users, ArrowRight, Search, Clock, Layers } from 'lucide-react';

const BRAND_GREEN = '#446F41';
const BG_CREAM = '#FFFFFF';

interface TeamMember {
    id: number;
    fullName: string;
    username: string;
    phone: string;
    email: string;
    role: string;
    isFlexibleModel: boolean;
    isRegularModel: boolean;
}

const MyEmployeesPage = () => {
    const router = useRouter();
    const [team, setTeam] = useState<TeamMember[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        const fetchTeam = async () => {
            try {
                const res = await fetch(`${API_BASE_URL}/users/team`, { credentials: 'include' });
                if (!res.ok) {
                    if (res.status === 401 || res.status === 403) router.push('/');
                    return;
                }
                const data = await res.json();
                setTeam(Array.isArray(data) ? data : []);
            } catch (err) {
                console.error("Error fetching team", err);
            } finally {
                setLoading(false);
            }
        };

        fetchTeam();
    }, []);

    const filteredTeam = team.filter(member => 
        (member.fullName || '').toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (loading) return (
        <div style={{ backgroundColor: BG_CREAM }} className="flex min-h-screen items-center justify-center">
            <p style={{ color: BRAND_GREEN }} className="text-xl font-bold">טוען עובדים...</p>
        </div>
    );

    return (
        <div style={{ backgroundColor: BG_CREAM }} className="min-h-screen p-6 relative" dir="rtl">
            <button
                onClick={() => router.push('/Manager')}
                className="absolute top-6 right-6 flex items-center gap-2 font-bold hover:opacity-70 transition z-10"
                style={{ color: BRAND_GREEN }}
            >
                <ArrowRight size={22} />
                <span>חזרה לפאנל מנהל</span>
            </button>

            <div className="max-w-6xl mx-auto pt-14">
                {/* Header */}
                <div className="flex flex-col md:flex-row items-center justify-center mb-8 gap-4">
                    <div className="flex items-center gap-3">
                        <h1 className="text-3xl font-bold" style={{ color: BRAND_GREEN }}>העובדים שלי</h1>
                        <Users size={32} style={{ color: BRAND_GREEN }} />
                    </div>
                </div>

                <div className="bg-white rounded-2xl shadow-xl overflow-hidden border-2" style={{ borderColor: BRAND_GREEN }}>
                    {/* Search Bar */}
                    <div className="p-6 border-b border-gray-100 bg-gray-50 flex items-center gap-3">
                        <div className="relative w-full max-w-md">
                            <input 
                                type="text"
                                placeholder="חיפוש לפי שם..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full h-12 pr-12 pl-4 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#446F41] text-right font-medium"
                            />
                            <Search className="absolute right-4 top-3 text-gray-400" size={24} />
                        </div>
                    </div>

                    {/* Desktop Table */}
                    <div className="overflow-x-auto hidden md:block">
                        <table className="w-full text-right">
                            <thead className="bg-gray-100 text-gray-600 font-bold">
                                <tr>
                                    <th className="p-4">שם מלא</th>
                                    <th className="p-4">טלפון</th>
                                    <th className="p-4">אימייל</th>
                                    <th className="p-4">מודלים</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {filteredTeam.length === 0 ? (
                                    <tr>
                                        <td colSpan={4} className="text-center p-8 text-gray-500 font-medium">לא נמצאו עובדים מתאימים</td>
                                    </tr>
                                ) : (
                                    filteredTeam.map(member => (
                                        <tr key={member.id} className="hover:bg-gray-50 transition">
                                            <td className="p-4 font-bold text-gray-800">{member.fullName || '-'}</td>
                                            <td className="p-4 text-gray-600" dir="ltr" style={{ textAlign: 'right' }}>{member.phone}</td>
                                            <td className="p-4 text-gray-600">{member.email || '-'}</td>
                                            <td className="p-4">
                                                <div className="flex gap-2">
                                                    {member.isRegularModel && <span className="flex items-center gap-1 bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs font-bold"><Clock size={14}/>קבוע</span>}
                                                    {member.isFlexibleModel && <span className="flex items-center gap-1 bg-green-100 text-green-800 px-2 py-1 rounded text-xs font-bold"><Layers size={14}/>גמיש</span>}
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Mobile Cards */}
                    <div className="md:hidden divide-y divide-gray-100">
                         {filteredTeam.length === 0 ? (
                            <p className="text-center p-8 text-gray-500 font-medium">לא נמצאו עובדים מתאימים</p>
                        ) : (
                            filteredTeam.map(member => (
                                <div key={member.id} className="p-5 flex flex-col gap-2">
                                    <div className="flex justify-between items-center">
                                        <span className="font-bold text-lg text-gray-800">{member.fullName || '-'}</span>
                                        <div className="flex gap-1">
                                            {member.isRegularModel && <span className="bg-blue-100 text-blue-800 px-2 py-0.5 rounded text-xs font-bold">קבוע</span>}
                                            {member.isFlexibleModel && <span className="bg-green-100 text-green-800 px-2 py-0.5 rounded text-xs font-bold">גמיש</span>}
                                        </div>
                                    </div>
                                    <span className="text-gray-500 text-sm">טלפון: <span dir="ltr">{member.phone}</span></span>
                                    {member.email && <span className="text-gray-500 text-sm">אימייל: {member.email}</span>}
                                </div>
                            ))
                        )}
                    </div>

                </div>
            </div>
        </div>
    );
};

export default MyEmployeesPage;
