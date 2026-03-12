import { Suspense } from 'react';
import PrintScheduleClient from './PrintScheduleClient';

export default function PrintSchedulePage() {
    return (
        <Suspense fallback={<div className="p-12 text-center">Loading Print View...</div>}>
            <PrintScheduleClient />
        </Suspense>
    );
}
