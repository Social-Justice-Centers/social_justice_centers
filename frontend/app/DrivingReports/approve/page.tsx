'use client';

import { API_BASE_URL } from '../../config';
import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, FileText, CheckCircle, Pencil, Check, X } from 'lucide-react';

const BRAND_BLUE = '#0284C7';
const BG_CREAM = '#FFFFFF';
const INPUT_BG = '#E0F2FE';

interface TeamReport {
    ID: number;
    date: string;
    description: string;
    totalCost: number;
    fileName: string;
    filePath: string;
    approved: boolean;
    approvedBy: string;
    userPhone: string;
    fullName: string;
}

interface EditForm {
    description: string;
    totalCost: string;
}

const ApproveDrivingReportsPage = () => {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [reports, setReports] = useState<TeamReport[]>([]);
    const [approving, setApproving] = useState<number | null>(null);

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
                const data = await res.json();
                if (data.role !== 'manager') { router.push('/Browser'); return; }
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
            const res = await fetch(`${API_BASE_URL}/manager/driving-reports`, { credentials: 'include' });
            if (res.ok) setReports(await res.json());
        } catch { /* ignore */ }
    };

    const approve = async (id: number) => {
        setApproving(id);
        try {
            const res = await fetch(`${API_BASE_URL}/manager/driving-reports/${id}/approve`, {
                method: 'PUT',
                credentials: 'include',
            });
            if (res.ok) {
                setReports(prev => prev.map(r => r.ID === id ? { ...r, approved: true } : r));
            }
        } catch { /* ignore */ }
        finally { setApproving(null); }
    };

    const downloadFile = (id: number) => {
        window.open(`${API_BASE_URL}/driving-reports/${id}/file`, '_blank');
    };

    // ---- Edit handlers ----
    const startEdit = (r: TeamReport) => {
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

    const pending = reports.filter(r => !r.approved);
    const approved = reports.filter(r => r.approved);

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
                <h1 className="text-2xl font-bold" style={{ color: BRAND_BLUE }}>אישור דוחות נסיעות</h1>
            </div>

            <div className="max-w-lg mx-auto">

                {/* Pending */}
                <h2 className="text-lg font-bold mb-3" style={{ color: BRAND_BLUE }}>
                    ממתינים לאישור ({pending.length})
                </h2>
                {pending.length === 0 ? (
                    <p className="text-center opacity-50 mb-8" style={{ color: BRAND_BLUE }}>אין דוחות הממתינים לאישור</p>
                ) : (
                    <div className="flex flex-col gap-3 mb-8">
                        {pending.map(r => (
                            <ReportCard
                                key={r.ID}
                                report={r}
                                onApprove={() => approve(r.ID)}
                                onDownload={() => downloadFile(r.ID)}
                                approving={approving === r.ID}
                                editingId={editingId}
                                editForm={editForm}
                                editSaving={editSaving}
                                editError={editError}
                                onStartEdit={startEdit}
                                onCancelEdit={cancelEdit}
                                onSaveEdit={saveEdit}
                                onEditFormChange={setEditForm}
                            />
                        ))}
                    </div>
                )}

                {/* Approved */}
                {approved.length > 0 && (
                    <>
                        <h2 className="text-lg font-bold mb-3" style={{ color: BRAND_BLUE }}>
                            אושרו ({approved.length})
                        </h2>
                        <div className="flex flex-col gap-3">
                            {approved.map(r => (
                                <ReportCard
                                    key={r.ID}
                                    report={r}
                                    onApprove={() => { }}
                                    onDownload={() => downloadFile(r.ID)}
                                    approving={false}
                                    editingId={editingId}
                                    editForm={editForm}
                                    editSaving={editSaving}
                                    editError={editError}
                                    onStartEdit={startEdit}
                                    onCancelEdit={cancelEdit}
                                    onSaveEdit={saveEdit}
                                    onEditFormChange={setEditForm}
                                />
                            ))}
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

interface ReportCardProps {
    report: TeamReport;
    onApprove: () => void;
    onDownload: () => void;
    approving: boolean;
    editingId: number | null;
    editForm: EditForm;
    editSaving: boolean;
    editError: string;
    onStartEdit: (r: TeamReport) => void;
    onCancelEdit: () => void;
    onSaveEdit: (id: number) => void;
    onEditFormChange: (f: EditForm) => void;
}

const ReportCard = ({
    report: r, onApprove, onDownload, approving,
    editingId, editForm, editSaving, editError,
    onStartEdit, onCancelEdit, onSaveEdit, onEditFormChange,
}: ReportCardProps) => {
    const isEditing = editingId === r.ID;

    return (
        <div
            className="rounded-xl shadow-sm p-4 border"
            style={{ borderColor: isEditing ? BRAND_BLUE : INPUT_BG, backgroundColor: r.approved ? '#f0f7f0' : '#fff' }}
        >
            {/* Employee info always shown */}
            <div className="flex items-center justify-between mb-2">
                <div>
                    <p className="font-bold text-base" style={{ color: BRAND_BLUE }}>{r.fullName}</p>
                    <p className="text-sm opacity-60" style={{ color: BRAND_BLUE }}>{r.userPhone}</p>
                </div>
                {r.approved ? (
                    <span className="flex items-center gap-1 text-xs font-bold text-green-700 bg-green-100 px-3 py-1 rounded-full">
                        <CheckCircle size={14} /> אושר
                    </span>
                ) : (
                    <span className="text-xs font-bold text-orange-600 bg-orange-100 px-3 py-1 rounded-full">ממתין</span>
                )}
            </div>

            {isEditing ? (
                /* ---- EDIT MODE ---- */
                <div className="flex flex-col gap-3 mt-2">
                    <div>
                        <label className="block text-xs font-semibold mb-1" style={{ color: BRAND_BLUE }}>תיאור</label>
                        <textarea
                            rows={2}
                            className="w-full rounded-lg px-3 py-2 resize-none outline-none text-sm"
                            style={{ backgroundColor: INPUT_BG, color: BRAND_BLUE }}
                            value={editForm.description}
                            onChange={e => onEditFormChange({ ...editForm, description: e.target.value })}
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
                            onChange={e => onEditFormChange({ ...editForm, totalCost: e.target.value })}
                        />
                    </div>
                    {editError && <p className="text-red-600 text-xs font-semibold">{editError}</p>}
                    <div className="flex gap-2">
                        <button
                            onClick={() => onSaveEdit(r.ID)}
                            disabled={editSaving}
                            className="flex-1 h-9 flex items-center justify-center gap-1 rounded-lg text-white font-bold text-sm transition hover:opacity-90 disabled:opacity-50"
                            style={{ backgroundColor: BRAND_BLUE }}
                        >
                            <Check size={14} />
                            {editSaving ? 'שומר...' : 'שמור'}
                        </button>
                        <button
                            onClick={onCancelEdit}
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
                <div className="flex items-start justify-between">
                    <div>
                        <p className="text-sm" style={{ color: BRAND_BLUE }}>{r.date}</p>
                        {r.description && (
                            <p className="text-sm opacity-70" style={{ color: BRAND_BLUE }}>{r.description}</p>
                        )}
                        <p className="font-bold mt-1" style={{ color: BRAND_BLUE }}>₪{r.totalCost.toFixed(2)}</p>
                        {r.fileName && (
                            <button
                                onClick={onDownload}
                                className="mt-1 flex items-center gap-1 text-xs underline opacity-70 hover:opacity-100"
                                style={{ color: BRAND_BLUE }}
                            >
                                <FileText size={14} />
                                {r.fileName}
                            </button>
                        )}
                    </div>

                    <div className="flex flex-col gap-2 items-end">
                        {/* Edit button — always available for managers */}
                        <button
                            onClick={() => onStartEdit(r)}
                            className="flex items-center gap-1 text-xs font-bold px-3 py-1.5 rounded-lg border-2 transition hover:bg-gray-50"
                            style={{ borderColor: BRAND_BLUE, color: BRAND_BLUE }}
                        >
                            <Pencil size={12} />
                            עריכה
                        </button>

                        {!r.approved && (
                            <button
                                onClick={onApprove}
                                disabled={approving}
                                className="h-10 px-5 rounded-xl text-white font-bold text-sm transition hover:opacity-90 active:scale-95 disabled:opacity-50"
                                style={{ backgroundColor: BRAND_BLUE }}
                            >
                                {approving ? '...' : 'אשר'}
                            </button>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default ApproveDrivingReportsPage;
