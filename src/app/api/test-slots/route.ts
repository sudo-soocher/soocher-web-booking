import { NextResponse } from 'next/server';
import { db } from '../../../lib/firebase';
import { collection, getDocs, doc, getDoc } from 'firebase/firestore';

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const doctorId = searchParams.get('doctorId') || 'mtlUtszDdJMYof7e6pRyPkSJrb12';

        const docRef = doc(db, 'Users', doctorId);
        const docSnap = await getDoc(docRef);

        const slotsRef = collection(db, 'Users', doctorId, 'Available Slots');
        const slotsSnap = await getDocs(slotsRef);

        const slotsData: Record<string, unknown> = {};
        slotsSnap.forEach((doc) => {
            slotsData[doc.id] = doc.data();
        });

        return NextResponse.json({
            doctorId,
            doctorData: docSnap.data(),
            slotsData
        });
    } catch (err: unknown) {
        const error = err as { message?: string };
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
