import firebase_admin
from firebase_admin import credentials, firestore
import os
from dotenv import load_dotenv
from datetime import datetime

load_dotenv()

# Initialize Firebase
FIREBASE_KEY_PATH = os.getenv('FIREBASE_KEY_PATH', 'firebase-key.json')

if not os.path.exists(FIREBASE_KEY_PATH):
    print(f"❌ ERROR: Firebase key file not found at {FIREBASE_KEY_PATH}")
    exit(1)

try:
    cred = credentials.Certificate(FIREBASE_KEY_PATH)
    firebase_admin.initialize_app(cred)
    db = firestore.client()
    print("✅ Successfully connected to Firebase!")
except Exception as e:
    print(f"❌ Firebase initialization failed: {e}")
    exit(1)

# Collections
tickets_collection = db.collection('tickets')
meetings_collection = db.collection('meetings')

# ============================================
# TICKET FUNCTIONS
# ============================================

def save_ticket(ticket_data):
    """Save ticket to Firestore"""
    try:
        # Firestore auto-generates document ID
        doc_ref = tickets_collection.document()
        doc_ref.set(ticket_data)
        print(f"✅ Ticket saved to Firestore: {doc_ref.id}")
        return doc_ref.id
    except Exception as e:
        print(f"❌ Error saving ticket: {e}")
        return None

def get_ticket_by_id(ticket_id):
    """Get ticket from Firestore by ticket ID"""
    try:
        # Search for ticket with matching ticket_id field
        docs = tickets_collection.where('ticket_id', '==', ticket_id).limit(1).stream()
        
        for doc in docs:
            ticket = doc.to_dict()
            ticket['_id'] = doc.id
            print(f"✅ Ticket found: {ticket_id}")
            return ticket
        
        print(f"⚠️ Ticket not found: {ticket_id}")
        return None
    except Exception as e:
        print(f"❌ Error getting ticket: {e}")
        return None

def get_all_tickets():
    """Get all tickets, sorted by creation date"""
    try:
        # Get all tickets ordered by created_at descending
        docs = tickets_collection.order_by('created_at', direction=firestore.Query.DESCENDING).stream()
        
        tickets = []
        for doc in docs:
            ticket = doc.to_dict()
            ticket['_id'] = doc.id
            tickets.append(ticket)
        
        print(f"✅ Retrieved {len(tickets)} tickets")
        return tickets
    except Exception as e:
        print(f"❌ Error getting tickets: {e}")
        return []

def update_ticket(ticket_id, update_data):
    """Update ticket (for HR to add response)"""
    try:
        # Find the document first
        docs = tickets_collection.where('ticket_id', '==', ticket_id).limit(1).stream()
        
        for doc in docs:
            update_data['updated_at'] = datetime.now()
            doc.reference.update(update_data)
            print(f"✅ Ticket updated: {ticket_id}")
            return True
        
        print(f"⚠️ Ticket not found for update: {ticket_id}")
        return False
    except Exception as e:
        print(f"❌ Error updating ticket: {e}")
        return False

# ============================================
# MEETING FUNCTIONS
# ============================================

def save_meeting(meeting_data):
    """Save meeting request to Firestore"""
    try:
        doc_ref = meetings_collection.document()
        doc_ref.set(meeting_data)
        print(f"✅ Meeting saved to Firestore: {doc_ref.id}")
        return doc_ref.id
    except Exception as e:
        print(f"❌ Error saving meeting: {e}")
        return None

def get_meeting_by_id(meeting_id):
    """Get meeting from Firestore"""
    try:
        docs = meetings_collection.where('meeting_id', '==', meeting_id).limit(1).stream()
        
        for doc in docs:
            meeting = doc.to_dict()
            meeting['_id'] = doc.id
            print(f"✅ Meeting found: {meeting_id}")
            return meeting
        
        return None
    except Exception as e:
        print(f"❌ Error getting meeting: {e}")
        return None

def get_all_meetings():
    """Get all meetings"""
    try:
        docs = meetings_collection.order_by('created_at', direction=firestore.Query.DESCENDING).stream()
        
        meetings = []
        for doc in docs:
            meeting = doc.to_dict()
            meeting['_id'] = doc.id
            meetings.append(meeting)
        
        print(f"✅ Retrieved {len(meetings)} meetings")
        return meetings
    except Exception as e:
        print(f"❌ Error getting meetings: {e}")
        return []

# ============================================
# STATISTICS
# ============================================

def get_statistics():
    """Get dashboard statistics"""
    try:
        # Count documents (Firestore doesn't have native count, so we stream)
        all_tickets = list(tickets_collection.stream())
        total_tickets = len(all_tickets)
        
        pending_tickets = len([t for t in all_tickets if t.to_dict().get('status') == 'Pending'])
        resolved_tickets = len([t for t in all_tickets if t.to_dict().get('status') == 'Resolved'])
        
        all_meetings = list(meetings_collection.stream())
        total_meetings = len(all_meetings)
        
        return {
            'total_tickets': total_tickets,
            'pending_tickets': pending_tickets,
            'resolved_tickets': resolved_tickets,
            'total_meetings': total_meetings
        }
    except Exception as e:
        print(f"❌ Error getting statistics: {e}")
        return {
            'total_tickets': 0,
            'pending_tickets': 0,
            'resolved_tickets': 0,
            'total_meetings': 0
        }

# Test connection
if __name__ == "__main__":
    print("\n" + "="*50)
    print("Testing Firebase connection...")
    print("="*50)
    stats = get_statistics()
    print(f"Current statistics: {stats}")
    print("="*50 + "\n")