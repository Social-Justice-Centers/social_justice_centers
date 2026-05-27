'use client';

import { API_BASE_URL } from '../config';
import React, { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, Upload, CheckCircle, FileText } from 'lucide-react';

const BRAND_GREEN = '#446F41';
const BG_CREAM = '#FFFFFF';
const INPUT_BG = '#B2C6AE';

interface DrivingReport {
    ID: number;
    date: string;
    description: string;
    totalCost: number;
    fileName: string;
    approved: boolean;
    approvedBy: string;
}

const today = () => {
    const d = new Date();
    return d.toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\./g, '/');
};

const DrivingReportsPage = () => {
    const router = useRouter();
    const fileRef = useRef<HTMLInputElement>(null);

    const [loading, setLoading] = useState(true);
    const [reports, setReports] = useState<DrivingReport[]>([]);
    const [description, setDescription] = useState('');
    const [totalCost, setTotalCost] = useState('');
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);

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

    if (loading) return (
        <div style={{ backgroundColor: BG_CREAM }} className="flex min-h-screen items-center justify-center">
            <p style={{ color: BRAND_GREEN }} className="text-xl font-bold">טוען...</p>
        </div>
    );

    return (
        <div style={{ backgroundColor: BG_CREAM }} className="min-h-screen p-6" dir="rtl">

            {/* Header */}
            <div className="flex items-center justify-between mb-8">
                <button
                    onClick={() => router.back()}
                    className="flex items-center gap-2 font-bold hover:opacity-70 transition"
                    style={{ color: BRAND_GREEN }}
                >
                    <ArrowRight size={22} />
                    <span>חזרה</span>
                </button>
                <h1 className="text-2xl font-bold" style={{ color: BRAND_GREEN }}>דוחות נסיעות</h1>
            </div>

            {/* Upload Form */}
            <div className="max-w-md mx-auto mb-10 rounded-2xl shadow-md p-6" style={{ backgroundColor: INPUT_BG }}>
                <h2 className="text-lg font-bold mb-4" style={{ color: BRAND_GREEN }}>הגשת דוח חדש</h2>
                <form onSubmit={handleSubmit} className="flex flex-col gap-4">

                    {/* Date (auto, read-only) */}
                    <div>
                        <label className="block text-sm font-semibold mb-1" style={{ color: BRAND_GREEN }}>תאריך</label>
                        <div className="w-full rounded-lg px-4 py-3 bg-white font-medium" style={{ color: BRAND_GREEN }}>
                            {today()}
                        </div>
                    </div>

                    {/* Description */}
                    <div>
                        <label className="block text-sm font-semibold mb-1" style={{ color: BRAND_GREEN }}>תיאור (אופציונלי)</label>
                        <textarea
                            value={description}
                            onChange={e => setDescription(e.target.value)}
                            rows={3}
                            placeholder="לדוגמה: כביש 6, מנהרת הכרמל..."
                            className="w-full rounded-lg px-4 py-3 bg-white resize-none outline-none"
                            style={{ color: BRAND_GREEN }}
                        />
                    </div>

                    {/* Total Cost */}
                    <div>
                        <label className="block text-sm font-semibold mb-1" style={{ color: BRAND_GREEN }}>עלות כוללת (₪) *</label>
                        <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={totalCost}
                            onChange={e => setTotalCost(e.target.value)}
                            required
                            placeholder="0.00"
                            className="w-full rounded-lg px-4 py-3 bg-white outline-none"
                            style={{ color: BRAND_GREEN }}
                        />
                    </div>

                    {/* File */}
                    <div>
                        <label className="block text-sm font-semibold mb-1" style={{ color: BRAND_GREEN }}>צירוף קבלה / מסמך (אופציונלי)</label>
                        <div
                            className="w-full rounded-lg bg-white px-4 py-3 flex items-center justify-between cursor-pointer"
                            onClick={() => fileRef.current?.click()}
                        >
                            <span className="text-sm opacity-60" style={{ color: BRAND_GREEN }}>
                                {selectedFile ? selectedFile.name : 'לחץ לבחירת קובץ'}
                            </span>
                            <Upload size={20} style={{ color: BRAND_GREEN }} />
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
                        style={{ backgroundColor: BRAND_GREEN }}
                    >
                        {submitting ? 'שולח...' : 'שלח דוח'}
                    </button>
                </form>
            </div>

            {/* Past Reports */}
            <div className="max-w-md mx-auto">
                <h2 className="text-lg font-bold mb-4" style={{ color: BRAND_GREEN }}>הדוחות שלי</h2>
                {reports.length === 0 ? (
                    <p className="text-center opacity-50" style={{ color: BRAND_GREEN }}>אין דוחות עדיין</p>
                ) : (
                    <div className="flex flex-col gap-3">
                        {reports.map(r => (
                            <div
                                key={r.ID}
                                className="rounded-xl shadow-sm p-4 border"
                                style={{ borderColor: INPUT_BG, backgroundColor: '#f9faf9' }}
                            >
                                <div className="flex items-center justify-between mb-1">
                                    <span className="font-bold" style={{ color: BRAND_GREEN }}>{r.date}</span>
                                    {r.approved ? (
                                        <span className="text-xs font-bold text-green-700 bg-green-100 px-2 py-0.5 rounded-full">אושר</span>
                                    ) : (
                                        <span className="text-xs font-bold text-orange-600 bg-orange-100 px-2 py-0.5 rounded-full">ממתין לאישור</span>
                                    )}
                                </div>
                                {r.description && (
                                    <p className="text-sm opacity-70 mb-1" style={{ color: BRAND_GREEN }}>{r.description}</p>
                                )}
                                <p className="font-semibold" style={{ color: BRAND_GREEN }}>₪{r.totalCost.toFixed(2)}</p>
                                {r.fileName && (
                                    <button
                                        onClick={() => downloadFile(r.ID)}
                                        className="mt-2 flex items-center gap-1 text-sm underline opacity-70 hover:opacity-100"
                                        style={{ color: BRAND_GREEN }}
                                    >
                                        <FileText size={16} />
                                        {r.fileName}
                                    </button>
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
