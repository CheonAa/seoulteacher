import { PrismaClient } from '@prisma/client';
import { syncBillings } from '../lib/billingSync';

const prisma = new PrismaClient();

async function cleanFakePayments() {
    console.log("Cleaning fake payments from past MonthlyBillings...");
    
    const enrollments = await prisma.enrollment.findMany({ select: { id: true, targetSessionsMonth: true } });
    let fixedCount = 0;

    for (const e of enrollments) {
        await prisma.$transaction(async (tx: any) => {
            const billings = await tx.monthlyBilling.findMany({
                where: { enrollmentId: e.id },
                orderBy: [{ year: 'asc' }, { month: 'asc' }]
            });

            if (billings.length <= 1) return; // Need at least 2 months to have a "fake" subsequent payment

            let runningLeftover = billings[0].carryOverSessions; // Assume first month is real

            for (let i = 1; i < billings.length; i++) {
                const b = billings[i];
                
                // If this month was marked paid, but the previous leftover was enough to cover the attendance so far
                // Assume it was a fake payment clicked by the admin to clear the UI
                if (b.isPaid && b.targetSessions > 0) {
                    if (runningLeftover >= 0) {
                        // It was probably fake. 
                        console.log(`Fixing fake payment for enrollment ${e.id} in ${b.year}-${b.month}. Had ${runningLeftover} leftover.`);
                        await tx.monthlyBilling.update({
                            where: { id: b.id },
                            data: {
                                isPaid: false,
                                targetSessions: 0,
                                paidAt: null
                            }
                        });
                        fixedCount++;
                        // We set target to 0, so the new running leftover for next iteration is just runningLeftover - attended
                        runningLeftover = runningLeftover - b.attendedSessions;
                    } else {
                        // It was a real payment because they ran out
                        runningLeftover = runningLeftover + b.targetSessions - b.attendedSessions;
                    }
                } else {
                    runningLeftover = runningLeftover + b.targetSessions - b.attendedSessions;
                }
            }
            
            // Re-sync this enrollment to fix the carryOver numbers
            await syncBillings(tx, e.id, billings[0].year, billings[0].month);
        });
    }

    console.log(`Successfully unset isPaid on ${fixedCount} fake billing records.`);
}

cleanFakePayments()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(() => prisma.$disconnect());
