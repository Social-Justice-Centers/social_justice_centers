'use client';

import { API_BASE_URL } from '../config';
import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Users, ArrowRight, Search, Clock, Layers, Pencil, X, Check, Lock, Trash2 } from 'lucide-react';

const BRAND_BLUE = '#0284C7';
const BG_CREAM = '#FFFFFF';
const INPUT_BG = '#E0F2FE';

interface TeamMember {
    ID: number;
    fullName: string;
    username: string;
    phone: string;
    email: string;
    role: string;
    isFlexibleModel: boolean;
    isRegularModel: boolean;
}

interface EditForm {
    fullName: string;
    username: string;
    phone: string;
    email: string;
    password?: string;
    isFlexibleModel: boolean;
    isRegularModel: boolean;
}

const MyEmployeesPage = () => {
    const router = useRouter();
    const [team, setTeam] = useState<TeamMember[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

    // Edit Modal State
    const [editingMember, setEditingMember] = useState<TeamMember | null>(null);
    const [editForm, setEditForm] = useState<EditForm>({
        fullName: '',
        username: '',
        phone: '',
        email: '',
        password: '',
        isFlexibleModel: false,
        isRegularModel: false,
    });
    const [saving, setSaving] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [editError, setEditError] = useState('');

    const fetchTeam = React.useCallback(async () => {
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
    }, [router]);

    useEffect(() => {
        fetchTeam();
    }, [fetchTeam]);

    const handleOpenEdit = (member: TeamMember) => {
        setEditingMember(member);
        setEditForm({
            fullName: member.fullName || '',
            username: member.username || '',
            phone: member.phone || '',
            email: member.email || '',
            password: '',
            isFlexibleModel: member.isFlexibleModel,
            isRegularModel: member.isRegularModel,
        });
        setEditError('');
    };

    const handleCloseEdit = () => {
        setEditingMember(null);
        setEditError('');
    };

    const handleSaveEdit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingMember) return;
        setSaving(true);
        setEditError('');

        try {
            const res = await fetch(`${API_BASE_URL}/users/${editingMember.ID}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({
                    fullName: editForm.fullName,
                    username: editForm.username,
                    phone: editForm.phone,
                    email: editForm.email,
                    password: editForm.password || undefined,
                    isFlexibleModel: editForm.isFlexibleModel,
                    isRegularModel: editForm.isRegularModel,
                    role: editingMember.role,
                }),
            });

            if (!res.ok) {
                const data = await res.json();
                setEditError(data.error || 'שגיאה בעדכון פרטי העובד');
                return;
            }

            handleCloseEdit();
            await fetchTeam();
        } catch {
            setEditError('שגיאת תקשורת עם השרת');
        } finally {
            setSaving(false);
        }
    };

    const handleDeleteEmployee = async () => {
        if (!editingMember) return;
        if (!confirm("האם אתה בטוח שברצונך למחוק עובד זה?")) return;
        setDeleting(true);
        setEditError('');

        try {
            const res = await fetch(`${API_BASE_URL}/users/${editingMember.ID}`, {
                method: 'DELETE',
                credentials: 'include',
            });

            if (!res.ok) {
                const data = await res.json();
                setEditError(data.error || 'שגיאה במחיקת העובד');
                return;
            }

            handleCloseEdit();
            await fetchTeam();
        } catch {
            setEditError('שגיאת תקשורת עם השרת');
        } finally {
            setDeleting(false);
        }
    };

    const filteredTeam = team.filter(member => 
        (member.fullName || '').toLowerCase().includes(searchQuery.toLowerCase())
    );

    const inputClasses = "w-full h-11 px-4 rounded-xl border-2 text-right outline-none focus:ring-2 focus:ring-[#0284C7] font-semibold text-sm";

    if (loading) return (
        <div style={{ backgroundColor: BG_CREAM }} className="flex min-h-screen items-center justify-center">
            <p style={{ color: BRAND_BLUE }} className="text-xl font-bold">טוען עובדים...</p>
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

            <div className="max-w-6xl mx-auto pt-14">
                {/* Header */}
                <div className="flex flex-col md:flex-row items-center justify-center mb-8 gap-4">
                    <div className="flex items-center gap-3">
                        <h1 className="text-3xl font-bold" style={{ color: BRAND_BLUE }}>העובדים שלי</h1>
                        <Users size={32} style={{ color: BRAND_BLUE }} />
                    </div>
                </div>

                <div className="bg-white rounded-2xl shadow-xl overflow-hidden border-2" style={{ borderColor: BRAND_BLUE }}>
                    {/* Search Bar */}
                    <div className="p-6 border-b border-gray-100 bg-gray-50 flex items-center gap-3">
                        <div className="relative w-full max-w-md">
                            <input 
                                type="text"
                                placeholder="חיפוש לפי שם..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full h-12 pr-12 pl-4 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#0284C7] text-right font-medium"
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
                                    <th className="p-4" style={{ width: '100px' }}>פעולות</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {filteredTeam.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="text-center p-8 text-gray-500 font-medium">לא נמצאו עובדים מתאימים</td>
                                    </tr>
                                ) : (
                                    filteredTeam.map(member => (
                                        <tr key={member.ID} className="hover:bg-gray-50 transition">
                                            <td className="p-4 font-bold text-gray-800">{member.fullName || '-'}</td>
                                            <td className="p-4 text-gray-600" dir="ltr" style={{ textAlign: 'right' }}>{member.phone}</td>
                                            <td className="p-4 text-gray-600">{member.email || '-'}</td>
                                            <td className="p-4">
                                                <div className="flex gap-2">
                                                    {member.isRegularModel && <span className="flex items-center gap-1 bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs font-bold"><Clock size={14}/>קבוע</span>}
                                                    {member.isFlexibleModel && <span className="flex items-center gap-1 bg-green-100 text-green-800 px-2 py-1 rounded text-xs font-bold"><Layers size={14}/>גמיש</span>}
                                                </div>
                                            </td>
                                            <td className="p-4">
                                                <button
                                                    onClick={() => handleOpenEdit(member)}
                                                    className="flex items-center gap-1 text-xs font-bold px-3 py-1.5 rounded-lg border-2 transition hover:bg-gray-100"
                                                    style={{ borderColor: BRAND_BLUE, color: BRAND_BLUE }}
                                                >
                                                    <Pencil size={14} />
                                                    עריכה
                                                </button>
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
                                <div key={member.ID} className="p-5 flex flex-col gap-2 relative">
                                    <div className="flex justify-between items-center">
                                        <span className="font-bold text-lg text-gray-800">{member.fullName || '-'}</span>
                                        <div className="flex gap-1">
                                            {member.isRegularModel && <span className="bg-blue-100 text-blue-800 px-2 py-0.5 rounded text-xs font-bold">קבוע</span>}
                                            {member.isFlexibleModel && <span className="bg-green-100 text-green-800 px-2 py-0.5 rounded text-xs font-bold">גמיש</span>}
                                        </div>
                                    </div>
                                    <span className="text-gray-500 text-sm">טלפון: <span dir="ltr">{member.phone}</span></span>
                                    {member.email && <span className="text-gray-500 text-sm">אימייל: {member.email}</span>}
                                    <div className="flex justify-end mt-2">
                                        <button
                                            onClick={() => handleOpenEdit(member)}
                                            className="flex items-center gap-1 text-xs font-bold px-3 py-1.5 rounded-lg border-2 transition hover:bg-gray-50"
                                            style={{ borderColor: BRAND_BLUE, color: BRAND_BLUE }}
                                        >
                                            <Pencil size={14} />
                                            עריכה
                                        </button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>

            {/* Edit Modal Backdrop */}
            {editingMember && (
                <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50 overflow-y-auto">
                    {/* Modal Content */}
                    <div className="bg-white rounded-2xl w-full max-w-lg p-6 shadow-2xl relative" dir="rtl">
                        <button
                            onClick={handleCloseEdit}
                            className="absolute top-4 left-4 p-1 rounded-full hover:bg-gray-100 transition"
                            style={{ color: BRAND_BLUE }}
                        >
                            <X size={24} />
                        </button>

                        <div className="flex items-center gap-2 mb-6">
                            <Pencil size={24} style={{ color: BRAND_BLUE }} />
                            <h2 className="text-xl font-bold" style={{ color: BRAND_BLUE }}>עריכת פרטי עובד</h2>
                        </div>

                        <form onSubmit={handleSaveEdit} className="space-y-4">
                            {/* Full Name */}
                            <div>
                                <label className="block text-sm font-semibold mb-1" style={{ color: BRAND_BLUE }}>שם מלא</label>
                                <input
                                    type="text"
                                    required
                                    className={inputClasses}
                                    style={{ borderColor: INPUT_BG, color: BRAND_BLUE }}
                                    value={editForm.fullName}
                                    onChange={e => setEditForm({ ...editForm, fullName: e.target.value })}
                                />
                            </div>

                            {/* Username */}
                            <div>
                                <label className="block text-sm font-semibold mb-1" style={{ color: BRAND_BLUE }}>שם משתמש</label>
                                <input
                                    type="text"
                                    required
                                    className={inputClasses}
                                    style={{ borderColor: INPUT_BG, color: BRAND_BLUE }}
                                    value={editForm.username}
                                    onChange={e => setEditForm({ ...editForm, username: e.target.value })}
                                />
                            </div>

                            {/* Phone */}
                            <div>
                                <label className="block text-sm font-semibold mb-1" style={{ color: BRAND_BLUE }}>מספר טלפון (10 ספרות)</label>
                                <input
                                    type="tel"
                                    required
                                    maxLength={10}
                                    className={inputClasses}
                                    style={{ borderColor: INPUT_BG, color: BRAND_BLUE }}
                                    value={editForm.phone}
                                    onChange={e => setEditForm({ ...editForm, phone: e.target.value.replace(/\D/g, '') })}
                                />
                            </div>

                            {/* Email */}
                            <div>
                                <label className="block text-sm font-semibold mb-1" style={{ color: BRAND_BLUE }}>אימייל לקבלת קוד כניסה</label>
                                <input
                                    type="email"
                                    required
                                    className={inputClasses}
                                    style={{ borderColor: INPUT_BG, color: BRAND_BLUE }}
                                    value={editForm.email}
                                    onChange={e => setEditForm({ ...editForm, email: e.target.value })}
                                />
                            </div>

                            {/* New Password (Optional) */}
                            <div>
                                <label className="block text-sm font-semibold mb-1" style={{ color: BRAND_BLUE }}>סיסמה חדשה (אופציונלי - השאר ריק ללא שינוי)</label>
                                <div className="relative">
                                    <input
                                        type="text"
                                        placeholder="סיסמה חדשה..."
                                        className={inputClasses}
                                        style={{ borderColor: INPUT_BG, color: BRAND_BLUE }}
                                        value={editForm.password}
                                        onChange={e => setEditForm({ ...editForm, password: e.target.value })}
                                    />
                                    <Lock className="absolute left-3 top-3 opacity-40" size={18} style={{ color: BRAND_BLUE }} />
                                </div>
                            </div>

                            {/* Working Models */}
                            <div>
                                <label className="block text-sm font-semibold mb-2" style={{ color: BRAND_BLUE }}>מודלי עבודה</label>
                                <div className="flex gap-4">
                                    <label className="flex items-center gap-2 cursor-pointer font-bold" style={{ color: BRAND_BLUE }}>
                                        <input
                                            type="checkbox"
                                            className="w-4 h-4 accent-[#0284C7]"
                                            checked={editForm.isRegularModel}
                                            onChange={e => setEditForm({ ...editForm, isRegularModel: e.target.checked })}
                                        />
                                        <span>מודל קבוע (שעון נוכחות)</span>
                                    </label>
                                    <label className="flex items-center gap-2 cursor-pointer font-bold" style={{ color: BRAND_BLUE }}>
                                        <input
                                            type="checkbox"
                                            className="w-4 h-4 accent-[#0284C7]"
                                            checked={editForm.isFlexibleModel}
                                            onChange={e => setEditForm({ ...editForm, isFlexibleModel: e.target.checked })}
                                        />
                                        <span>מודל גמיש</span>
                                    </label>
                                </div>
                            </div>

                            {editError && (
                                <div className="bg-red-50 text-red-600 p-3 rounded-lg text-center font-semibold text-xs border border-red-200">
                                    {editError}
                                </div>
                            )}

                            {/* Actions */}
                            <div className="flex gap-3 pt-3">
                                <button
                                    type="submit"
                                    disabled={saving || deleting}
                                    className="flex-1 h-12 flex items-center justify-center gap-2 text-white font-bold rounded-xl transition hover:opacity-90 disabled:opacity-50"
                                    style={{ backgroundColor: BRAND_BLUE }}
                                >
                                    <Check size={18} />
                                    {saving ? 'שומר...' : 'שמור'}
                                </button>
                                <button
                                    type="button"
                                    onClick={handleDeleteEmployee}
                                    disabled={saving || deleting}
                                    className="flex-1 h-12 flex items-center justify-center gap-2 text-white font-bold rounded-xl transition bg-red-600 hover:bg-red-700 disabled:opacity-50"
                                >
                                    <Trash2 size={18} />
                                    {deleting ? 'מוחק...' : 'מחק עובד'}
                                </button>
                                <button
                                    type="button"
                                    onClick={handleCloseEdit}
                                    disabled={saving || deleting}
                                    className="flex-1 h-12 flex items-center justify-center gap-2 font-bold rounded-xl border-2 transition hover:bg-gray-50"
                                    style={{ borderColor: BRAND_BLUE, color: BRAND_BLUE }}
                                >
                                    <X size={18} />
                                    ביטול
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default MyEmployeesPage;
