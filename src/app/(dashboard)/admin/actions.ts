'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

export async function markAsPaid(billingId: string) {
    try {
        await prisma.monthlyBilling.update({
            where: { id: billingId },
            data: { isPaid: true, paidAt: new Date() }
        });
        revalidatePath('/admin');
        revalidatePath('/admin/billing');
        return { success: true };
    } catch (error) {
        console.error('Error marking as paid', error);
        return { success: false, error: 'Failed to mark as paid' };
    }
}
