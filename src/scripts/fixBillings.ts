import { PrismaClient } from '@prisma/client';
import { syncBillings } from '../lib/billingSync';

const prisma = new PrismaClient();

async function fixAllBillings() {
    console.log("Starting billing recalculation...");
    const enrollments = await prisma.enrollment.findMany({ select: { id: true } });
    let count = 0;

    for (const e of enrollments) {
        await prisma.$transaction(async (tx: any) => {
            const earliest = await tx.monthlyBilling.findFirst({
                where: { enrollmentId: e.id },
                orderBy: [{ year: 'asc' }, { month: 'asc' }]
            });

            if (earliest) {
                await syncBillings(tx, e.id, earliest.year, earliest.month);
                count++;
            }
        });
    }

    console.log(`Successfully recalculated billings for ${count} enrollments.`);
}

fixAllBillings()
    .catch(e => {
        console.error("Error running script:", e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
