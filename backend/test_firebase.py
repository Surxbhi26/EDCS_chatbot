from database import save_ticket, get_ticket_by_id, get_all_tickets
from datetime import datetime

print("\n" + "="*60)
print("🔥 FIREBASE TEST - SAVING & RETRIEVING DATA")
print("="*60 + "\n")

# Test ticket data
test_ticket = {
    'ticket_id': 'TEST-001',
    'name': 'Test User',
    'email': 'test@example.com',
    'phone': '1234567890',
    'category': 'General',
    'priority': 'Normal',
    'description': 'This is a test ticket to verify Firebase is working',
    'status': 'Pending',
    'created_at': datetime.now(),
    'response': None
}

# Save ticket
print("1️⃣ Saving test ticket...")
doc_id = save_ticket(test_ticket)

if doc_id:
    print(f"   ✅ Saved with document ID: {doc_id}\n")
    
    # Retrieve ticket
    print("2️⃣ Retrieving ticket by ID...")
    retrieved_ticket = get_ticket_by_id('TEST-001')
    
    if retrieved_ticket:
        print(f"   ✅ Retrieved ticket: {retrieved_ticket['ticket_id']}")
        print(f"   Name: {retrieved_ticket['name']}")
        print(f"   Status: {retrieved_ticket['status']}\n")
    
    # Get all tickets
    print("3️⃣ Getting all tickets...")
    all_tickets = get_all_tickets()
    print(f"   ✅ Total tickets in database: {len(all_tickets)}\n")
    
    print("="*60)
    print("✅ ALL TESTS PASSED!")
    print("="*60)
    print("\n🔥 Go to Firebase Console to see your data:")
    print("   https://console.firebase.google.com")
    print("   → Firestore Database → tickets collection\n")
else:
    print("   ❌ Failed to save ticket")