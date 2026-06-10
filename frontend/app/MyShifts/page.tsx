'use client';

// MyShifts (planned/manager-assigned shifts) has been removed.
// Redirect to the unified ReportedShifts page which now shows all shifts.

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

const MyShiftsPage = () => {
    const router = useRouter();
    useEffect(() => {
        router.replace('/ReportedShifts');
    }, [router]);
    return null;
};

export default MyShiftsPage;
