import firebase_admin
from firebase_admin import credentials
from firebase_admin import firestore

try:
    cred = credentials.Certificate('/Users/shaliqrahman/Documents/ZeeSha/SOOCHER COLLAB/soocher-web/soocher-web-booking/service_account.json')
    firebase_admin.initialize_app(cred)
    db = firestore.client()

    doctor_id = 'mtlUtszDdJMYof7e6pRyPkSJrb12'
    slots_ref = db.collection('Users').document(doctor_id).collection('Available Slots')
    docs = slots_ref.stream()
    
    found = False
    for doc in docs:
        found = True
        print(f"{doc.id} => {doc.to_dict()}")
    
    if not found:
        print("No documents found in Available Slots")
        # Let's try to list subcollections
        collections = db.collection('Users').document(doctor_id).collections()
        for col in collections:
            print(f"Found subcollection: {col.id}")

except Exception as e:
    print(f"Error: {e}")
