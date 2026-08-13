import { NextResponse } from 'next/server';
import { getAdminFirestore } from '@/lib/firebase-admin';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    // This diagnostic exposes private doctor and schedule fields, so it must
    // never be callable on a production deployment.
    if (process.env.NODE_ENV === 'production') {
        return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    try {
        const { searchParams } = new URL(request.url);
        const doctorId = searchParams.get('doctorId')?.trim();
        if (!doctorId) {
            return NextResponse.json({ error: 'doctorId is required' }, { status: 400 });
        }

        const db = getAdminFirestore();
        const doctorRef = db.collection('Users').doc(doctorId);
        const [doctorSnap, slotsSnap] = await Promise.all([
            doctorRef.get(),
            doctorRef.collection('Available Slots').get(),
        ]);

        const slotsData: Record<string, unknown> = {};
        slotsSnap.forEach((slotDoc) => {
            slotsData[slotDoc.id] = slotDoc.data();
        });

        return NextResponse.json({
            doctorId,
            doctorData: doctorSnap.data(),
            slotsData
        });
    } catch (err: unknown) {
        const error = err as { message?: string };
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
