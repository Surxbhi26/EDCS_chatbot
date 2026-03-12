import firebase_admin
from firebase_admin import credentials, firestore
import os
from dotenv import load_dotenv
from datetime import datetime, timezone
from zoneinfo import ZoneInfo

# Timezone for India Standard Time
IST = ZoneInfo('Asia/Kolkata')

def get_ist_now():
    """Get current time in IST as ISO format string"""
    return datetime.now(IST).isoformat()

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
            update_data['updated_at'] = get_ist_now()
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


def get_email_config():
    docs = db.collection('email_config').stream()
    config = {}
    for doc in docs:
        data = doc.to_dict()
        config[data['department_name']] = data['email_id']
    return config


def save_email_config(department_name, email_id):
    db.collection('email_config').document(department_name).set({
        'department_name': department_name,
        'email_id': email_id
    })


def initialize_email_config():
    docs = list(db.collection('email_config').limit(1).stream())
    if len(docs) == 0:
        save_email_config('HR Department', 'blessysharon.work@gmail.com')
        save_email_config('Accounts', 'blessysharon.work@gmail.com')
        save_email_config('Oracle DBA', 'blessysharon.work@gmail.com')
        save_email_config('SAP', 'blessysharon.work@gmail.com')


initialize_email_config()


def create_session(session_id):
    """Create a new chat session document."""
    sessions_ref = db.collection('sessions')
    now = get_ist_now()
    sessions_ref.document(session_id).set({
        'session_id': session_id,
        'status': 'active',
        'last_active': now,
        'created_at': now,
        'query_history': [],
        'terminated_reason': None,
    })


def ping_session(session_id):
    try:
        sessions_ref = db.collection('sessions')
        docs = list(sessions_ref.where(
            filter=firestore.FieldFilter('session_id', '==', session_id)
        ).limit(1).stream())

        if not docs:
            return False

        doc = docs[0]
        data = doc.to_dict()

        if data.get('status') != 'active':
            return False

        doc.reference.update({'last_active': get_ist_now()})
        return True
    except Exception as e:
        print(f"Error in ping_session: {e}")
        return False


def end_session(session_id, reason):
    """Mark a session as inactive with a termination reason."""
    try:
        sessions_ref = db.collection('sessions')
        docs = sessions_ref.where('session_id', '==', session_id).limit(1).stream()
        doc = next(docs, None)
        if not doc:
            return
        doc.reference.update({
            'status': 'inactive',
            'terminated_reason': reason,
            'last_active': get_ist_now(),
        })
    except Exception as e:
        print(f"❌ Error in end_session for {session_id}: {e}")


def cleanup_stale_sessions():
    try:
        sessions_ref = db.collection('sessions')
        active_docs = list(sessions_ref.where(
            filter=firestore.FieldFilter('status', '==', 'active')
        ).stream())

        terminated = []
        now = datetime.now(timezone.utc)

        for doc in active_docs:
            data = doc.to_dict()
            last_active = data.get('last_active')
            if not last_active:
                continue
            if isinstance(last_active, str):
                try:
                    last_active = datetime.fromisoformat(last_active)
                    if last_active.tzinfo is None:
                        last_active = last_active.replace(tzinfo=timezone.utc)
                except:
                    continue
            elif hasattr(last_active, 'timestamp'):
                last_active = datetime.fromtimestamp(
                    last_active.timestamp(), tz=timezone.utc
                )

            if (now - last_active).total_seconds() > 60:
                session_id = data.get('session_id')
                end_session(session_id, "timeout")
                terminated.append(session_id)
                # admit next from queue
                try:
                    admit_next_from_queue()
                except Exception as e:
                    print(f"Error admitting from queue after timeout: {e}")

        return terminated
    except Exception as e:
        print(f"Error in cleanup_stale_sessions: {e}")
        return []


def log_event(event_type, session_id, details):
    """Write an event log document."""
    try:
        logs_ref = db.collection('logs')
        logs_ref.add({
            'event_type': event_type,
            'session_id': session_id,
            'details': details or {},
            'timestamp': get_ist_now(),
        })
    except Exception as e:
        print(f"❌ Error in log_event ({event_type}, {session_id}): {e}")


def get_active_session_count():
    docs = list(db.collection('sessions').where(
        filter=firestore.FieldFilter('status', '==', 'active')
    ).stream())
    return len(docs)


def get_max_sessions():
    doc = db.collection('chatbot_config').document('settings').get()
    if doc.exists:
        return doc.to_dict().get('max_sessions', 50)
    else:
        db.collection('chatbot_config').document('settings').set({'max_sessions': 50})
        return 50


def add_to_queue(queue_id):
    db.collection('queue').document(queue_id).set({
        'queue_id': queue_id,
        'status': 'waiting',
        'joined_at': get_ist_now()
    })


def get_queue_position(queue_id):
    try:
        this_doc = db.collection('queue').document(queue_id).get()
        if not this_doc.exists:
            return 0
        this_joined = this_doc.to_dict().get('joined_at')
        all_waiting = list(db.collection('queue').where(
            filter=firestore.FieldFilter('status', '==', 'waiting')
        ).stream())
        position = sum(
            1 for d in all_waiting
            if d.to_dict().get('joined_at') <= this_joined
        )
        return position
    except Exception as e:
        print(f"Error getting queue position: {e}")
        return 0


def admit_next_from_queue():
    try:
        docs = list(db.collection('queue').where(
            filter=firestore.FieldFilter('status', '==', 'waiting')
        ).order_by('joined_at').limit(1).stream())
        if not docs:
            return None
        doc = docs[0]
        doc.reference.update({'status': 'admitted'})
        return doc.to_dict().get('queue_id')
    except Exception as e:
        print(f"Error admitting from queue: {e}")
        return None


def remove_from_queue(queue_id):
    try:
        db.collection('queue').document(queue_id).delete()
    except Exception as e:
        print(f"Error removing from queue: {e}")


def check_and_record_query(session_id, query):
    try:
        sessions_ref = db.collection('sessions')
        docs = list(sessions_ref.where(
            filter=firestore.FieldFilter('session_id', '==', session_id)
        ).limit(1).stream())
        
        if not docs:
            return {"terminated": False}
        
        doc_ref = docs[0].reference
        
        @firestore.transactional
        def update_in_transaction(transaction, doc_ref, query):
            snapshot = doc_ref.get(transaction=transaction)
            data = snapshot.to_dict()
            query_history = data.get('query_history', [])
            
            count = sum(1 for q in query_history if q.lower() == query.lower())
            print(f"Transaction: query={query}, count={count}, history={query_history}")
            
            if count >= 3:
                transaction.update(doc_ref, {
                    'status': 'inactive',
                    'terminated_reason': 'repetition'
                })
                return True
            
            query_history.append(query)
            transaction.update(doc_ref, {'query_history': query_history})
            return False
        
        transaction = db.transaction()
        terminated = update_in_transaction(transaction, doc_ref, query)
        return {"terminated": terminated}
        
    except Exception as e:
        print(f"Error in check_and_record_query: {e}")
        return {"terminated": False}
