'use client';

import { API_BASE_URL } from '../../config';
import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, FileText, CheckCircle } from 'lucide-react';

const BRAND_GREEN = '#446F41';
const BG_CREAM = '#FFFFFF';
const INPUT_BG = '#B2C6AE';

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

const ApproveDrivingReportsPage = () => {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [reports, setReports] = useState<TeamReport[]>([]);
    const [approving, setApproving] = useState<number | null>(null);

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
    }, []);

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

    if (loading) return (
        <div style={{ backgroundColor: BG_CREAM }} className="flex min-h-screen items-center justify-center">
            <p style={{ color: BRAND_GREEN }} className="text-xl font-bold">טוען...</p>
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
                    style={{ color: BRAND_GREEN }}
                >
                    <ArrowRight size={22} />
                    <span>חזרה</span>
                </button>
                <h1 className="text-2xl font-bold" style={{ color: BRAND_GREEN }}>אישור דוחות נסיעות</h1>
            </div>

            <div className="max-w-lg mx-auto">

                {/* Pending */}
                <h2 className="text-lg font-bold mb-3" style={{ color: BRAND_GREEN }}>
                    ממתינים לאישור ({pending.length})
                </h2>
                {pending.length === 0 ? (
                    <p className="text-center opacity-50 mb-8" style={{ color: BRAND_GREEN }}>אין דוחות הממתינים לאישור</p>
                ) : (
                    <div className="flex flex-col gap-3 mb-8">
                        {pending.map(r => (
                            <ReportCard
                                key={r.ID}
                                report={r}
                                onApprove={() => approve(r.ID)}
                                onDownload={() => downloadFile(r.ID)}
                                approving={approving === r.ID}
                            />
                        ))}
                    </div>
                )}

                {/* Approved */}
                {approved.length > 0 && (
                    <>
                        <h2 className="text-lg font-bold mb-3" style={{ color: BRAND_GREEN }}>
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
}

const ReportCard = ({ report: r, onApprove, onDownload, approving }: ReportCardProps) => {
    const BRAND_GREEN = '#446F41';
    const INPUT_BG = '#B2C6AE';
    return (
        <div
            className="rounded-xl shadow-sm p-4 border"
            style={{ borderColor: INPUT_BG, backgroundColor: r.approved ? '#f0f7f0' : '#fff' }}
        >
            <div className="flex items-center justify-between mb-2">
                <div>
                    <p className="font-bold text-base" style={{ color: BRAND_GREEN }}>{r.fullName}</p>
                    <p className="text-sm opacity-60" style={{ color: BRAND_GREEN }}>{r.userPhone}</p>
                </div>
                {r.approved ? (
                    <span className="flex items-center gap-1 text-xs font-bold text-green-700 bg-green-100 px-3 py-1 rounded-full">
                        <CheckCircle size={14} /> אושר
                    </span>
                ) : (
                    <span className="text-xs font-bold text-orange-600 bg-orange-100 px-3 py-1 rounded-full">ממתין</span>
                )}
            </div>

            <div className="flex items-center justify-between">
                <div>
                    <p className="text-sm" style={{ color: BRAND_GREEN }}>{r.date}</p>
                    {r.description && (
                        <p className="text-sm opacity-70" style={{ color: BRAND_GREEN }}>{r.description}</p>
                    )}
                    <p className="font-bold mt-1" style={{ color: BRAND_GREEN }}>₪{r.totalCost.toFixed(2)}</p>
                    {r.fileName && (
                        <button
                            onClick={onDownload}
                            className="mt-1 flex items-center gap-1 text-xs underline opacity-70 hover:opacity-100"
                            style={{ color: BRAND_GREEN }}
                        >
                            <FileText size={14} />
                            {r.fileName}
                        </button>
                    )}
                </div>

                {!r.approved && (
                    <button
                        onClick={onApprove}
                        disabled={approving}
                        className="h-12 px-5 rounded-xl text-white font-bold text-sm transition hover:opacity-90 active:scale-95 disabled:opacity-50"
                        style={{ backgroundColor: BRAND_GREEN }}
                    >
                        {approving ? '...' : 'אשר'}
                    </button>
                )}
            </div>
        </div>
    );
};

export default ApproveDrivingReportsPage;
