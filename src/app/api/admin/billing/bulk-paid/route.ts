import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from '@/lib/prisma';
import { syncBillings } from '@/lib/billingSync';

export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.email) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const role = session.user.role;
        // Only OWNER can bulk approve excel payments
        if (role !== 'OWNER') {
            return NextResponse.json({ error: '권한이 없습니다.' }, { status: 403 });
        }

        const body = await req.json();
        const { billingIds } = body;

        if (!billingIds || !Array.isArray(billingIds) || billingIds.length === 0) {
             return NextResponse.json({ error: '필드 누락' }, { status: 400 });
        }

        await prisma.$transaction(async (tx) => {
             for (const id of billingIds) {
                 const billing = await tx.monthlyBilling.findUnique({
                     where: { id },
                     select: { enrollmentId: true, year: true, month: true, isPaid: true }
                 });

                 if (billing && !billing.isPaid) {
                     await tx.monthlyBilling.update({
                         where: { id },
                         data: {
                             isPaid: true,
                             paidAt: new Date()
                         }
                     });
                     // Sync future billings
                     await syncBillings(tx, billing.enrollmentId, billing.year, billing.month);
                 }
             }
        });

        return NextResponse.json({ message: '일괄 승인 완료' });
    } catch (error) {
        console.error('Bulk Paid Error:', error);
        return NextResponse.json({ error: '업데이트 중 오류가 발생했습니다.' }, { status: 500 });
    }
}
