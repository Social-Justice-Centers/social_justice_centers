'use client';

import { API_BASE_URL } from '../config';
import React, { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, Upload, CheckCircle, FileText, Pencil, Check, X } from 'lucide-react';

const BRAND_BLUE = '#0284C7';
const BG_CREAM = '#FFFFFF';
const INPUT_BG = '#E0F2FE';

interface DrivingReport {
    ID: number;
    date: string;
    description: string;
    totalCost: number;
    fileName: string;
    approved: boolean;
    approvedBy: string;
}

interface EditForm {
    description: string;
    totalCost: string;
}

const today = () => {
    const str = new Date().toLocaleString("en-US", { timeZone: "Asia/Jerusalem" });
    const d = new Date(str);
    return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
};

const DrivingReportsPage = () => {
    const router = useRouter();
    const fileRef = useRef<HTMLInputElement>(null);

    const [loading, setLoading] = useState(true);
    const [reports, setReports] = useState<DrivingReport[]>([]);

    // Submit form state
    const [description, setDescription] = useState('');
    const [totalCost, setTotalCost] = useState('');
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);

    // Edit state
    const [editingId, setEditingId] = useState<number | null>(null);
    const [editForm, setEditForm] = useState<EditForm>({ description: '', totalCost: '' });
    const [editSaving, setEditSaving] = useState(false);
    const [editError, setEditError] = useState('');

    useEffect(() => {
        const init = async () => {
            try {
                const res = await fetch(`${API_BASE_URL}/me`, { credentials: 'include' });
                if (!res.ok) { router.push('/'); return; }
            } catch {
                router.push('/');
                return;
            }
            await loadReports();
            setLoading(false);
        };
        init();
    }, [router]);

    const loadReports = async () => {
        try {
            const res = await fetch(`${API_BASE_URL}/driving-reports`, { credentials: 'include' });
            if (res.ok) setReports(await res.json());
        } catch { /* ignore */ }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        if (!totalCost || isNaN(parseFloat(totalCost))) {
            setError('נא להזין עלות תקינה');
            return;
        }
        setSubmitting(true);
        try {
            const form = new FormData();
            form.append('description', description);
            form.append('totalCost', totalCost);
            if (selectedFile) form.append('file', selectedFile);

            const res = await fetch(`${API_BASE_URL}/driving-reports`, {
                method: 'POST',
                credentials: 'include',
                body: form,
            });
            if (!res.ok) {
                try {
                    const d = await res.json();
                    setError(d.error || `שגיאת שרת (${res.status})`);
                } catch {
                    setError(`שגיאת שרת (${res.status})`);
                }
            } else {
                setSuccess(true);
                setDescription('');
                setTotalCost('');
                setSelectedFile(null);
                if (fileRef.current) fileRef.current.value = '';
                await loadReports();
                setTimeout(() => setSuccess(false), 3000);
            }
        } catch {
            setError('שגיאת חיבור');
        } finally {
            setSubmitting(false);
        }
    };

    const downloadFile = (id: number) => {
        window.open(`${API_BASE_URL}/driving-reports/${id}/file`, '_blank');
    };

    // ---- Edit handlers ----
    const startEdit = (r: DrivingReport) => {
        setEditingId(r.ID);
        setEditForm({ description: r.description, totalCost: String(r.totalCost) });
        setEditError('');
    };

    const cancelEdit = () => {
        setEditingId(null);
        setEditError('');
    };

    const saveEdit = async (id: number) => {
        if (!editForm.totalCost || isNaN(parseFloat(editForm.totalCost))) {
            setEditError('נא להזין עלות תקינה');
            return;
        }
        setEditSaving(true);
        setEditError('');
        try {
            const res = await fetch(`${API_BASE_URL}/driving-reports/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({
                    description: editForm.description,
                    totalCost: parseFloat(editForm.totalCost),
                }),
            });
            if (!res.ok) {
                const d = await res.json();
                setEditError(d.error || 'שגיאה בשמירה');
                return;
            }
            setEditingId(null);
            await loadReports();
        } catch {
            setEditError('שגיאת תקשורת');
        } finally {
            setEditSaving(false);
        }
    };

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
                    onClick={() => router.back()}
                    className="flex items-center gap-2 font-bold hover:opacity-70 transition"
                    style={{ color: BRAND_BLUE }}
                >
                    <ArrowRight size={22} />
                    <span>חזרה</span>
                </button>
                <h1 className="text-2xl font-bold" style={{ color: BRAND_BLUE }}>דוחות נסיעות</h1>
            </div>

            {/* Upload Form */}
            <div className="max-w-md mx-auto mb-10 rounded-2xl shadow-md p-6" style={{ backgroundColor: INPUT_BG }}>
                <h2 className="text-lg font-bold mb-4" style={{ color: BRAND_BLUE }}>הגשת דוח חדש</h2>
                <form onSubmit={handleSubmit} className="flex flex-col gap-4">

                    {/* Date (auto, read-only) */}
                    <div>
                        <label className="block text-sm font-semibold mb-1" style={{ color: BRAND_BLUE }}>תאריך</label>
                        <div className="w-full rounded-lg px-4 py-3 bg-white font-medium" style={{ color: BRAND_BLUE }}>
                            {today()}
                        </div>
                    </div>

                    {/* Description */}
                    <div>
                        <label className="block text-sm font-semibold mb-1" style={{ color: BRAND_BLUE }}>תיאור (אופציונלי)</label>
                        <textarea
                            value={description}
                            onChange={e => setDescription(e.target.value)}
                            rows={3}
                            placeholder="לדוגמה: כביש 6, מנהרת הכרמל..."
                            className="w-full rounded-lg px-4 py-3 bg-white resize-none outline-none"
                            style={{ color: BRAND_BLUE }}
                        />
                    </div>

                    {/* Total Cost */}
                    <div>
                        <label className="block text-sm font-semibold mb-1" style={{ color: BRAND_BLUE }}>עלות כוללת (₪) *</label>
                        <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={totalCost}
                            onChange={e => setTotalCost(e.target.value)}
                            required
                            placeholder="0.00"
                            className="w-full rounded-lg px-4 py-3 bg-white outline-none"
                            style={{ color: BRAND_BLUE }}
                        />
                    </div>

                    {/* File */}
                    <div>
                        <label className="block text-sm font-semibold mb-1" style={{ color: BRAND_BLUE }}>צירוף קבלה / מסמך (אופציונלי)</label>
                        <div
                            className="w-full rounded-lg bg-white px-4 py-3 flex items-center justify-between cursor-pointer"
                            onClick={() => fileRef.current?.click()}
                        >
                            <span className="text-sm opacity-60" style={{ color: BRAND_BLUE }}>
                                {selectedFile ? selectedFile.name : 'לחץ לבחירת קובץ'}
                            </span>
                            <Upload size={20} style={{ color: BRAND_BLUE }} />
                        </div>
                        <input
                            ref={fileRef}
                            type="file"
                            accept=".pdf"
                            className="hidden"
                            onChange={e => {
                                const f = e.target.files?.[0] ?? null;
                                if (f && !f.name.toLowerCase().endsWith('.pdf')) {
                                    setError('ניתן לצרף קבצי PDF בלבד');
                                    e.target.value = '';
                                    return;
                                }
                                setError('');
                                setSelectedFile(f);
                            }}
                        />
                    </div>

                    {error && <p className="text-red-600 text-sm font-semibold">{error}</p>}
                    {success && (
                        <div className="flex items-center gap-2 text-green-700 font-bold">
                            <CheckCircle size={20} />
                            <span>הדוח נשלח בהצלחה</span>
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={submitting}
                        className="w-full h-14 rounded-xl text-white font-bold text-lg transition hover:opacity-90 active:scale-95 disabled:opacity-50"
                        style={{ backgroundColor: BRAND_BLUE }}
                    >
                        {submitting ? 'שולח...' : 'שלח דוח'}
                    </button>
                </form>
            </div>

            {/* Past Reports */}
            <div className="max-w-md mx-auto">
                <h2 className="text-lg font-bold mb-4" style={{ color: BRAND_BLUE }}>הדוחות שלי</h2>
                {reports.length === 0 ? (
                    <p className="text-center opacity-50" style={{ color: BRAND_BLUE }}>אין דוחות עדיין</p>
                ) : (
                    <div className="flex flex-col gap-3">
                        {reports.map(r => (
                            <div
                                key={r.ID}
                                className="rounded-xl shadow-sm p-4 border"
                                style={{ borderColor: editingId === r.ID ? BRAND_BLUE : INPUT_BG, backgroundColor: '#f9faf9' }}
                            >
                                {editingId === r.ID ? (
                                    /* ---- EDIT MODE ---- */
                                    <div className="flex flex-col gap-3">
                                        <p className="text-xs font-bold opacity-50 uppercase" style={{ color: BRAND_BLUE }}>עריכת דוח</p>

                                        <div>
                                            <label className="block text-xs font-semibold mb-1" style={{ color: BRAND_BLUE }}>תיאור</label>
                                            <textarea
                                                rows={2}
                                                className="w-full rounded-lg px-3 py-2 resize-none outline-none text-sm"
                                                style={{ backgroundColor: INPUT_BG, color: BRAND_BLUE }}
                                                value={editForm.description}
                                                onChange={e => setEditForm({ ...editForm, description: e.target.value })}
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-xs font-semibold mb-1" style={{ color: BRAND_BLUE }}>עלות (₪)</label>
                                            <input
                                                type="number"
                                                step="0.01"
                                                min="0"
                                                className="w-full rounded-lg px-3 py-2 outline-none text-sm"
                                                style={{ backgroundColor: INPUT_BG, color: BRAND_BLUE }}
                                                value={editForm.totalCost}
                                                onChange={e => setEditForm({ ...editForm, totalCost: e.target.value })}
                                            />
                                        </div>

                                        {editError && <p className="text-red-600 text-xs font-semibold">{editError}</p>}

                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => saveEdit(r.ID)}
                                                disabled={editSaving}
                                                className="flex-1 h-9 flex items-center justify-center gap-1 rounded-lg text-white font-bold text-sm transition hover:opacity-90 disabled:opacity-50"
                                                style={{ backgroundColor: BRAND_BLUE }}
                                            >
                                                <Check size={14} />
                                                {editSaving ? 'שומר...' : 'שמור'}
                                            </button>
                                            <button
                                                onClick={cancelEdit}
                                                className="flex-1 h-9 flex items-center justify-center gap-1 rounded-lg font-bold text-sm border-2 transition hover:bg-gray-50"
                                                style={{ borderColor: BRAND_BLUE, color: BRAND_BLUE }}
                                            >
                                                <X size={14} />
                                                ביטול
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    /* ---- VIEW MODE ---- */
                                    <>
                                        <div className="flex items-center justify-between mb-1">
                                            <span className="font-bold" style={{ color: BRAND_BLUE }}>{r.date}</span>
                                            <div className="flex items-center gap-2">
                                                {r.approved ? (
                                                    <span className="text-xs font-bold text-green-700 bg-green-100 px-2 py-0.5 rounded-full">אושר</span>
                                                ) : (
                                                    <span className="text-xs font-bold text-orange-600 bg-orange-100 px-2 py-0.5 rounded-full">ממתין לאישור</span>
                                                )}
                                                {!r.approved && (
                                                    <button
                                                        onClick={() => startEdit(r)}
                                                        className="flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-lg border transition hover:bg-gray-100"
                                                        style={{ borderColor: BRAND_BLUE, color: BRAND_BLUE }}
                                                    >
                                                        <Pencil size={12} />
                                                        עריכה
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                        {r.description && (
                                            <p className="text-sm opacity-70 mb-1" style={{ color: BRAND_BLUE }}>{r.description}</p>
                                        )}
                                        <p className="font-semibold" style={{ color: BRAND_BLUE }}>₪{r.totalCost.toFixed(2)}</p>
                                        {r.fileName && (
                                            <button
                                                onClick={() => downloadFile(r.ID)}
                                                className="mt-2 flex items-center gap-1 text-sm underline opacity-70 hover:opacity-100"
                                                style={{ color: BRAND_BLUE }}
                                            >
                                                <FileText size={16} />
                                                {r.fileName}
                                            </button>
                                        )}
                                    </>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default DrivingReportsPage;
