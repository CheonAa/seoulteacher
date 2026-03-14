import { Prisma } from '@prisma/client';

export async function syncBillings(
    tx: Prisma.TransactionClient, 
    enrollmentId: string, 
    startYear: number, 
    startMonth: number
) {
    const enrollment = await tx.enrollment.findUnique({
        where: { id: enrollmentId }
    });
    if (!enrollment) return;

    // Get all billings from startYear/startMonth onwards
    const forwardBillings = await tx.monthlyBilling.findMany({
        where: {
            enrollmentId,
            OR: [
                { year: { gt: startYear } },
                { year: startYear, month: { gte: startMonth } }
            ]
        },
        orderBy: [{ year: 'asc' }, { month: 'asc' }]
    });

    if (forwardBillings.length === 0) return;

    // Get the billing immediately before startYear/startMonth
    const prevBilling = await tx.monthlyBilling.findFirst({
        where: {
            enrollmentId,
            OR: [
                { year: { lt: startYear } },
                { year: startYear, month: { lt: startMonth } }
            ]
        },
        orderBy: [{ year: 'desc' }, { month: 'desc' }]
    });

    let runningLeftover = prevBilling ? prevBilling.carryOverSessions : 0;

    for (const billing of forwardBillings) {
        let currentTarget = billing.targetSessions;
        
        // Optimize target: reduce unpaid target sessions if we have enough leftover
        let newCarryOver = runningLeftover + currentTarget - billing.attendedSessions;
        
        while (
            !billing.isPaid && 
            currentTarget >= enrollment.targetSessionsMonth && 
            enrollment.targetSessionsMonth > 0 &&
            (runningLeftover + currentTarget - enrollment.targetSessionsMonth - billing.attendedSessions) >= 0
        ) {
            currentTarget -= enrollment.targetSessionsMonth;
            newCarryOver = runningLeftover + currentTarget - billing.attendedSessions;
        }

        // Increase target if we run negative
        while (newCarryOver < 0 && enrollment.targetSessionsMonth > 0) {
            currentTarget += enrollment.targetSessionsMonth;
            newCarryOver = runningLeftover + currentTarget - billing.attendedSessions;
        }
        
        // If target is somehow 0, and no leftovers, and isPaid is false, but they attended 0? 
        // We probably shouldn't do anything else.

        if (currentTarget !== billing.targetSessions || newCarryOver !== billing.carryOverSessions) {
            await tx.monthlyBilling.update({
                where: { id: billing.id },
                data: {
                    targetSessions: currentTarget,
                    carryOverSessions: newCarryOver
                }
            });
        }

        runningLeftover = newCarryOver;
    }
}
