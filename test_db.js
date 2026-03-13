const admin = require('firebase-admin');
const serviceAccount = require('./service_account.json');

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();
const doctorId = 'mtlUtszDdJMYof7e6pRyPkSJrb12';

async function test() {
    const docSnap = await db.collection('Users').doc(doctorId).get();
    if (docSnap.exists) {
        console.log("Doctor exists:", docSnap.data().name, docSnap.data().specialization);
    } else {
        console.log("Doctor does not exist");
    }

    const slotsRef = db.collection('Users').doc(doctorId).collection('Available Slots');
    const snap = await slotsRef.get();

    if (snap.empty) {
        console.log("No documents found in 'Available Slots'");
        const collections = await db.collection('Users').doc(doctorId).listCollections();
        for (const col of collections) {
            console.log('Found subcollection:', col.id);
        }
    } else {
        snap.forEach(doc => {
            console.log(doc.id, '=>', JSON.stringify(doc.data(), null, 2));
        });
    }
}

test().catch(console.error);
