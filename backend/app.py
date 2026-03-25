#app.py
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import datetime
import random
import os
import threading
import time
import uuid
from zoneinfo import ZoneInfo
from google.cloud import firestore

# Timezone for India Standard Time
try:
    IST = ZoneInfo('Asia/Kolkata')
except Exception:
    IST = datetime.timezone(datetime.timedelta(hours=5, minutes=30))

def get_ist_now():
    """Get current time in IST as ISO format string"""
    return datetime.datetime.now(IST).isoformat()

# Import our services
from database import (
    db,
    save_ticket,
    save_meeting,
    get_ticket_by_id,
    get_all_tickets,
    update_ticket,
    get_all_meetings,
    get_meeting_by_id,
    meetings_collection,
    tickets_collection,
    get_email_config,
    create_session,
    ping_session,
    end_session,
    cleanup_stale_sessions,
    log_event,
    check_and_record_query,
    record_tab_click,
    increment_session_action,
    get_active_session_count,
    get_max_sessions,
    add_to_queue,
    get_queue_position,
    admit_next_from_queue,
    remove_from_queue,
)
from email_service import (
    send_ticket_notification,
    send_meeting_notification,
    send_status_update_to_customer,
    send_custom_email,
)

app = Flask(__name__)
CORS(app)


def generate_ticket_id():
    date_str = datetime.datetime.now().strftime("%Y%m%d")
    random_num = random.randint(1000, 9999)
    return f"EDCS-{date_str}-{random_num}"


def generate_meeting_id():
    date_str = datetime.datetime.now().strftime("%Y%m%d")
    random_num = random.randint(1000, 9999)
    return f"MEET-{date_str}-{random_num}"


# ============================================
# ENDPOINT 1: Submit Ticket
# ============================================
@app.route("/api/ticket", methods=["POST"])
def create_ticket():
    try:
        data = request.json
        ticket_id = generate_ticket_id()

        ticket_data = {
            "ticket_id": ticket_id,
            "session_id": data.get("session_id"),
            "name": data.get("name"),
            "email": data.get("email"),
            "phone": data.get("phone", ""),
            "category": data.get("category"),
            "priority": data.get("priority", "Normal"),
            "description": data.get("description"),
            "preferred_date": data.get("preferred_date"),
            "preferred_time": data.get("preferred_time"),
            "context": data.get("context", {}),
            "status": "Pending",
            "created_at": get_ist_now(),
            "response": None,
            "department": data.get("department", ""),
        }

        db_id = save_ticket(ticket_data)

        if db_id:
            if ticket_data.get("session_id"):
                try:
                    increment_session_action(ticket_data["session_id"], "query")
                except Exception as e:
                    print(f"Error incrementing session query count: {e}")
            send_ticket_notification(ticket_data)
            if ticket_data.get("session_id"):
                log_event("query_submitted", ticket_data["session_id"], {
                    "ticket_id": ticket_id,
                    "category": ticket_data.get("category"),
                    "department": ticket_data.get("department"),
                })

            print("\n" + "=" * 50)
            print("🎫 NEW TICKET CREATED")
            print("=" * 50)
            print(f"Ticket ID: {ticket_id}")
            print(f"Name: {ticket_data['name']}")
            print(f"Email: {ticket_data['email']}")
            print(f"Priority: {ticket_data['priority']}")
            print("=" * 50 + "\n")

            return jsonify(
                {
                    "success": True,
                    "ticket_id": ticket_id,
                    "message": "Ticket created successfully",
                }
            )
        else:
            return (
                jsonify({"success": False, "message": "Failed to save ticket"}),
                500,
            )

    except Exception as e:
        print(f"❌ Error creating ticket: {e}")
        return jsonify({"success": False, "message": str(e)}), 500


# ============================================
# ENDPOINT 2: Request Meeting
# ============================================
@app.route("/api/meeting", methods=["POST"])
def create_meeting():
    try:
        data = request.json
        meeting_id = generate_meeting_id()

        meeting_data = {
            "meeting_id": meeting_id,
            "session_id": data.get("session_id"),
            "name": data.get("name"),
            "email": data.get("email"),
            "phone": data.get("phone"),
            "purpose": data.get("purpose"),
            "date": data.get("date"),
            "time": data.get("time"),
            "notes": data.get("notes", ""),
            "context": data.get("context", {}),
            "status": "Pending",
            "created_at": get_ist_now(),
            "department": data.get("department", ""),
        }

        db_id = save_meeting(meeting_data)

        if db_id:
            if meeting_data.get("session_id"):
                try:
                    increment_session_action(meeting_data["session_id"], "meeting")
                except Exception as e:
                    print(f"Error incrementing session meeting count: {e}")
            send_meeting_notification(meeting_data)
            if meeting_data.get("session_id"):
                log_event("meeting_requested", meeting_data["session_id"], {
                    "meeting_id": meeting_id,
                    "purpose": meeting_data.get("purpose"),
                    "department": meeting_data.get("department"),
                })

            print("\n" + "=" * 50)
            print("📅 NEW MEETING REQUESTED")
            print("=" * 50)
            print(f"Meeting ID: {meeting_id}")
            print(f"Name: {meeting_data['name']}")
            print(f"Purpose: {meeting_data['purpose']}")
            print("=" * 50 + "\n")

            return jsonify(
                {
                    "success": True,
                    "meeting_id": meeting_id,
                    "message": "Meeting request sent",
                }
            )
        else:
            return (
                jsonify({"success": False, "message": "Failed to save meeting"}),
                500,
            )

    except Exception as e:
        print(f"❌ Error creating meeting: {e}")
        return jsonify({"success": False, "message": str(e)}), 500


# ============================================
# ENDPOINT 3: Check Ticket Status (chatbot)
# ============================================
@app.route("/api/ticket/<ticket_id>", methods=["GET"])
def get_ticket_status(ticket_id):
    ticket = get_ticket_by_id(ticket_id)

    if not ticket:
        return jsonify({"success": False, "message": "Ticket not found"}), 404

    created_at = ticket["created_at"]
    if hasattr(created_at, "isoformat"):
        created_at_str = created_at.isoformat()
    else:
        created_at_str = str(created_at)

    return jsonify(
        {
            "success": True,
            "ticket": {
                "ticket_id": ticket["ticket_id"],
                "name": ticket["name"],
                "email": ticket["email"],
                "category": ticket["category"],
                "priority": ticket["priority"],
                "description": ticket["description"],
                "status": ticket["status"],
                "response": ticket.get(
                    "response", "Our team is reviewing your query."
                ),
                "created_at": created_at_str,
            },
        }
    )


# ============================================
# HR: Get all tickets
# ============================================
@app.route("/api/tickets", methods=["GET"])
def list_tickets():
    tickets = get_all_tickets()
    for t in tickets:
        created = t.get("created_at")
        if hasattr(created, "isoformat"):
            t["created_at"] = created.isoformat()
        else:
            t["created_at"] = str(created)
    return jsonify({"success": True, "tickets": tickets})


# ============================================
# HR: Update ticket (status/response) – NO email here
# ============================================
@app.route("/api/ticket/<ticket_id>/update", methods=["POST"])
def hr_update_ticket(ticket_id):
    data = request.json or {}
    status = data.get("status")
    response_text = data.get("response")

    update_data = {}
    if status:
        update_data["status"] = status
    if response_text is not None:
        update_data["response"] = response_text

    if not update_data:
        return jsonify({"success": False, "message": "Nothing to update"}), 400

    ok = update_ticket(ticket_id, update_data)
    if not ok:
        return jsonify({"success": False, "message": "Ticket not found"}), 404

    # Save only; email is handled by separate endpoint
    return jsonify({"success": True})


# ============================================
# HR: Send status email manually
# ============================================
@app.route("/api/ticket/<ticket_id>/send-email", methods=["POST"])
def hr_send_ticket_email(ticket_id):
    try:
        ticket = get_ticket_by_id(ticket_id)
        if not ticket:
            return jsonify({"success": False, "message": "Ticket not found"}), 404

        data = request.json or {}
        
        print("\n" + "=" * 60)
        print("📧 SENDING TICKET EMAIL")
        print("=" * 60)
        print(f"Ticket ID: {ticket_id}")
        print(f"To: {data.get('to')}")
        print(f"CC: {data.get('cc')}")
        print(f"Subject: {data.get('subject')}")
        print("=" * 60 + "\n")
        
        # Use send_custom_email with CC support
        success = send_custom_email(
            to_email=data.get('to'),
            cc_emails=data.get('cc'),
            subject=data.get('subject'),
            body=data.get('body')
        )
        
        if success:
            return jsonify({
                "success": True,
                "message": "Email sent successfully"
            })
        else:
            return jsonify({
                "success": False,
                "message": "Failed to send email. Check email configuration."
            }), 500
    except Exception as e:
        print(f"❌ Error sending manual status email: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({"success": False, "message": str(e)}), 500


# ============================================
# HR: Delete ticket
# ============================================
@app.route("/api/ticket/<ticket_id>/delete", methods=["DELETE"])
def hr_delete_ticket(ticket_id):
    try:
        print(f"\n🗑️ Deleting ticket: {ticket_id}")
        
        docs = (
            tickets_collection.where("ticket_id", "==", ticket_id)
            .limit(1)
            .stream()
        )

        deleted = False
        for doc in docs:
            print(f"Found document: {doc.id}")
            doc.reference.delete()
            deleted = True
            print(f"✅ Ticket {ticket_id} deleted from Firestore")

        if not deleted:
            print(f"❌ Ticket {ticket_id} not found")
            return jsonify({"success": False, "message": "Ticket not found"}), 404

        return jsonify({"success": True, "message": "Ticket deleted successfully"})
        
    except Exception as e:
        print(f"❌ Error deleting ticket: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({"success": False, "message": str(e)}), 500


# ============================================
# HR: Get all meetings
# ============================================
@app.route("/api/meetings", methods=["GET"])
def list_meetings():
    print("\n📋 Fetching all meetings...")
    meetings = get_all_meetings()

    for m in meetings:
        created = m.get("created_at")
        if hasattr(created, "isoformat"):
            m["created_at"] = created.isoformat()
        else:
            m["created_at"] = str(created)

    print(f"✅ Returning {len(meetings)} meetings")        
    return jsonify({"success": True, "meetings": meetings})


# ============================================
# HR: Create meeting (from dashboard)
# ============================================
@app.route("/api/meeting/create", methods=["POST"])
def hr_create_meeting():
    """Create a new meeting from HR dashboard"""
    try:
        data = request.json
        print("\n➕ Creating new meeting from HR dashboard")
        print(f"Data: {data}")
        
        meeting_id = generate_meeting_id()

        meeting_data = {
            "meeting_id": meeting_id,
            "title": data.get("title"),
            "datetime": data.get("datetime"),
            "duration": data.get("duration", 60),
            "attendees": data.get("attendees", ""),
            "link": data.get("link", ""),
            "agenda": data.get("agenda", ""),
            "status": data.get("status", "Scheduled"),
            "ticket_id": data.get("ticket_id"),
            "created_at": get_ist_now(),
        }

        db_id = save_meeting(meeting_data)

        if db_id:
            print(f"✅ Meeting created: {meeting_id}")
            return jsonify(
                {
                    "success": True,
                    "meeting_id": meeting_id,
                    "message": "Meeting created successfully",
                }
            )
        else:
            print("❌ Failed to save meeting to database")
            return (
                jsonify({"success": False, "message": "Failed to save meeting"}),
                500,
            )

    except Exception as e:
        print(f"❌ Error creating meeting: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({"success": False, "message": str(e)}), 500


# ============================================
# HR: Update meeting
# ============================================
@app.route("/api/meeting/<meeting_id>/update", methods=["POST"])
def hr_update_meeting(meeting_id):
    try:
        data = request.json or {}
        print(f"\n💾 Updating meeting: {meeting_id}")
        print(f"Update data: {data}")
        
        docs = (
            meetings_collection.where("meeting_id", "==", meeting_id)
            .limit(1)
            .stream()
        )

        updated = False
        for doc in docs:
            update_data = {}
            
            # Update all possible fields
            if data.get("status") is not None:
                update_data["status"] = data["status"]
            if data.get("notes") is not None:
                update_data["notes"] = data["notes"]
            if data.get("agenda") is not None:
                update_data["agenda"] = data["agenda"]
            if data.get("attendees") is not None:
                update_data["attendees"] = data["attendees"]
            if data.get("link") is not None:
                update_data["link"] = data["link"]
                
            update_data["updated_at"] = get_ist_now()
            
            print(f"Firestore update_data: {update_data}")
            doc.reference.update(update_data)
            updated = True
            print(f"✅ Meeting {meeting_id} updated successfully")

        if not updated:
            print(f"❌ Meeting {meeting_id} not found")
            return jsonify({"success": False, "message": "Meeting not found"}), 404

        return jsonify({"success": True})
        
    except Exception as e:
        print(f"❌ Error updating meeting: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({"success": False, "message": str(e)}), 500


# ============================================
# HR: Delete meeting
# ============================================
@app.route("/api/meeting/<meeting_id>/delete", methods=["DELETE"])
def hr_delete_meeting(meeting_id):
    try:
        print(f"\n🗑️ Deleting meeting: {meeting_id}")
        
        docs = (
            meetings_collection.where("meeting_id", "==", meeting_id)
            .limit(1)
            .stream()
        )

        deleted = False
        for doc in docs:
            print(f"Found document: {doc.id}")
            doc.reference.delete()
            deleted = True
            print(f"✅ Meeting {meeting_id} deleted from Firestore")

        if not deleted:
            print(f"❌ Meeting {meeting_id} not found")
            return jsonify({"success": False, "message": "Meeting not found"}), 404

        return jsonify({"success": True, "message": "Meeting deleted successfully"})
        
    except Exception as e:
        print(f"❌ Error deleting meeting: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({"success": False, "message": str(e)}), 500


# ============================================
# HR: Send meeting email
# ============================================
@app.route("/api/meeting/<meeting_id>/send-email", methods=["POST"])
def hr_send_meeting_email(meeting_id):
    try:
        data = request.json or {}
        
        print("\n" + "=" * 60)
        print("📧 SENDING MEETING INVITATION EMAIL")
        print("=" * 60)
        print(f"Meeting ID: {meeting_id}")
        print(f"To: {data.get('to')}")
        print(f"Subject: {data.get('subject')}")
        print("=" * 60 + "\n")
        
        # ✅ USE EMAIL SERVICE (same as tickets)
        success = send_custom_email(
            to_email=data.get('to'),
            cc_emails=data.get('cc'),
            subject=data.get('subject'),
            body=data.get('body')
        )
        
        if success:
            return jsonify({
                "success": True, 
                "message": "Meeting invitation sent successfully"
            })
        else:
            return jsonify({
                "success": False, 
                "message": "Failed to send email. Check email configuration."
            }), 500
        
    except Exception as e:
        print(f"❌ Error sending meeting email: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({"success": False, "message": str(e)}), 500




# ============================================
# HR Dashboard page
# ============================================
@app.route("/hr")
def hr_dashboard():
    base_dir = os.path.dirname(os.path.abspath(__file__))
    return send_from_directory(base_dir, "hr_dashboard.html")


# ============================================
# Health Check
# ============================================
@app.route("/api/health", methods=["GET"])
def health_check():
    return jsonify(
        {
            "status": "ok",
            "message": "EDCS Chatbot Backend is running!",
            "timestamp": get_ist_now(),
        }
    )


@app.route("/api/department-email", methods=["POST"])
def send_department_email():
    try:
        data = request.json
        department = data.get("department")
        sender_name = data.get("sender_name")
        sender_email = data.get("sender_email")
        subject = data.get("subject")
        message = data.get("message")

        email_config = get_email_config()
        dept_email = email_config.get(department)

        if not dept_email:
            return jsonify({"success": False, "message": "Department not found"}), 404

        body = f"From: {sender_name} ({sender_email})\n\n{message}"
        success = send_custom_email(
            to_email=dept_email,
            cc_emails=None,
            subject=subject,
            body=body
        )

        if success:
            return jsonify({"success": True})
        else:
            return jsonify({"success": False, "message": "Failed to send email"}), 500
    except Exception as e:
        print(f"Error sending department email: {e}")
        return jsonify({"success": False, "message": str(e)}), 500


@app.route("/api/session/start", methods=["POST"])
def session_start():
    """Start a new chatbot session."""
    data = request.json or {}
    session_id = str(uuid.uuid4())
    user = data.get("user") if isinstance(data.get("user"), dict) else {}
    create_session(session_id, user=user)
    log_event("session_started", session_id, {})
    return jsonify({"success": True, "session_id": session_id})


@app.route("/api/session/ping", methods=["POST"])
def session_ping():
    """Ping an existing session to keep it active."""
    data = request.json or {}
    session_id = data.get("session_id")
    if not session_id:
        return jsonify({"success": False, "message": "session_id is required"}), 400

    active = ping_session(session_id)
    if not active:
        return jsonify({"success": False, "terminated": True})

    return jsonify({"success": True, "terminated": False})


@app.route("/api/session/end", methods=["POST"])
def end_session_route():
    try:
        if request.content_type and 'application/json' in request.content_type:
            data = request.json or {}
        else:
            import json
            data = json.loads(request.data) if request.data else {}

        session_id = data.get("session_id")
        reason = data.get("reason", "ended_by_user")

        if not session_id:
            return jsonify({"success": False, "message": "session_id required"}), 400

        end_session(session_id, reason)
        log_event("session_ended", session_id, {"reason": reason})

        # Automatically admit next person from queue
        try:
            admitted_id = admit_next_from_queue()
            if admitted_id:
                print(f"Auto-admitted from queue: {admitted_id}")
        except Exception as qe:
            print(f"Queue admit error: {qe}")

        return jsonify({"success": True})
    except Exception as e:
        print(f"Error ending session: {e}")
        return jsonify({"success": False, "message": str(e)})


@app.route("/api/session/cleanup", methods=["POST"])
def session_cleanup():
    """Cleanup stale sessions and log timeouts."""
    terminated_ids = cleanup_stale_sessions()
    for sid in terminated_ids:
        log_event("session_timeout", sid, {})
    return jsonify({"success": True, "terminated": terminated_ids})


@app.route("/api/session/check-repeat", methods=["POST"])
def check_repeat():
    try:
        data = request.json
        session_id = data.get("session_id")
        query = data.get("query")
        if not session_id or not query:
            return jsonify({"terminated": False})
        result = check_and_record_query(session_id, query)
        if result.get("terminated"):
            log_event("session_repeat_abuse", session_id, {"query": query})
        return jsonify(result)
    except Exception as e:
        print(f"Error checking repeat: {e}")
        return jsonify({"terminated": False})


@app.route("/api/session/event", methods=["POST"])
def session_event():
    try:
        data = request.json or {}
        session_id = data.get("session_id")
        if not session_id:
            return jsonify({"success": False, "message": "session_id required"}), 400

        menu_id = data.get("menu_id")
        option_text = data.get("option_text")
        action = data.get("action")

        record_tab_click(session_id, menu_id=menu_id, option_id=None, option_text=option_text, action=action)
        log_event("tab_clicked", session_id, {
            "menu_id": menu_id,
            "option_text": option_text,
            "action": action,
        })

        return jsonify({"success": True})
    except Exception as e:
        print(f"Error in session_event: {e}")
        return jsonify({"success": False, "message": str(e)}), 500


@app.route("/api/queue/check", methods=["POST"])
def queue_check():
    try:
        data = request.json
        queue_id = data.get("queue_id")

        # Run cleanup first to remove stale sessions
        cleanup_stale_sessions()

        active_count = get_active_session_count()
        max_sessions = get_max_sessions()

        print(f"Queue check: active={active_count}, max={max_sessions}")

        # If slot available, no need to queue
        if active_count < max_sessions:
            return jsonify({"queued": False})

        # Otherwise add to queue
        add_to_queue(queue_id)
        position = get_queue_position(queue_id)
        return jsonify({"queued": True, "position": position})
    except Exception as e:
        print(f"Error in queue check: {e}")
        return jsonify({"queued": False})


@app.route("/api/queue/status/<queue_id>", methods=["GET"])
def queue_status(queue_id):
    try:
        # First run cleanup to remove any stale sessions
        cleanup_stale_sessions()

        # Check active session count
        active_count = get_active_session_count()
        max_sessions = get_max_sessions()

        # If there is a free slot, admit this user immediately
        if active_count < max_sessions:
            # Remove from queue
            remove_from_queue(queue_id)
            return jsonify({"admitted": True, "position": 0})

        # Otherwise check their queue status
        doc = db.collection('queue').document(queue_id).get()
        if not doc.exists:
            return jsonify({"admitted": True, "position": 0})

        data = doc.to_dict()
        if data.get('status') == 'admitted':
            return jsonify({"admitted": True, "position": 0})

        position = get_queue_position(queue_id)
        return jsonify({"admitted": False, "position": position})
    except Exception as e:
        print(f"Error in queue status: {e}")
        return jsonify({"admitted": True, "position": 0})


@app.route("/api/queue/admit", methods=["POST"])
def queue_admit():
    try:
        admitted_id = admit_next_from_queue()
        return jsonify({"success": True, "admitted_queue_id": admitted_id})
    except Exception as e:
        print(f"Error in queue admit: {e}")
        return jsonify({"success": False})


@app.route("/api/tickets/department/<dept>", methods=["GET"])
def get_tickets_by_department(dept):
    try:
        from urllib.parse import unquote
        dept = unquote(dept)
        docs = tickets_collection.where(
            filter=firestore.FieldFilter('department', '==', dept)
        ).stream()
        tickets = []
        for doc in docs:
            t = doc.to_dict()
            created = t.get('created_at')
            if hasattr(created, 'isoformat'):
                t['created_at'] = created.isoformat()
            else:
                t['created_at'] = str(created)
            tickets.append(t)
        return jsonify({"success": True, "tickets": tickets})
    except Exception as e:
        print(f"Error fetching tickets by dept: {e}")
        return jsonify({"success": False, "tickets": []}), 500


@app.route("/api/meetings/department/<dept>", methods=["GET"])
def get_meetings_by_department(dept):
    try:
        from urllib.parse import unquote
        dept = unquote(dept)
        docs = meetings_collection.where(
            filter=firestore.FieldFilter('department', '==', dept)
        ).stream()
        meetings = []
        for doc in docs:
            m = doc.to_dict()
            created = m.get('created_at')
            if hasattr(created, 'isoformat'):
                m['created_at'] = created.isoformat()
            else:
                m['created_at'] = str(created)
            meetings.append(m)
        return jsonify({"success": True, "meetings": meetings})
    except Exception as e:
        print(f"Error fetching meetings by dept: {e}")
        return jsonify({"success": False, "meetings": []}), 500


@app.route("/api/chatbot-content", methods=["GET"])
def get_chatbot_content():
    try:
        doc = db.collection('chatbot_content').document('main').get()
        if doc.exists:
            return jsonify({"success": True, "content": doc.to_dict()})
        else:
            return jsonify({"success": False, "content": {}})
    except Exception as e:
        print(f"Error getting chatbot content: {e}")
        return jsonify({"success": False, "content": {}})


@app.route("/api/chatbot-content", methods=["POST"])
def save_chatbot_content():
    try:
        data = request.json
        db.collection('chatbot_content').document('main').set(data)
        return jsonify({"success": True})
    except Exception as e:
        print(f"Error saving chatbot content: {e}")
        return jsonify({"success": False, "message": str(e)})


@app.route("/api/service-status", methods=["GET"])
def service_status():
    try:
        doc = db.collection('chatbot_config').document('settings').get()
        if doc.exists:
            available = doc.to_dict().get('service_available', True)
            return jsonify({"available": available})
        return jsonify({"available": True})
    except Exception as e:
        print(f"Error checking service status: {e}")
        return jsonify({"available": True})


def background_cleanup():
    while True:
        try:
            time.sleep(60)
            terminated = cleanup_stale_sessions()
            if terminated:
                for session_id in terminated:
                    log_event("session_timeout", session_id, {})
                print(f"Background cleanup: terminated {len(terminated)} stale sessions")
        except Exception as e:
            print(f"Background cleanup error: {e}")


@app.route("/api/admin/cleanup-all", methods=["POST"])
def admin_cleanup_all():
    try:
        data = request.json or {}
        clear_queue = data.get("clear_queue", False)

        terminated = cleanup_stale_sessions()
        for session_id in (terminated or []):
            log_event("session_timeout_admin", session_id, {})

        queue_cleared = 0
        if clear_queue:
            queue_docs = list(db.collection('queue').stream())
            for doc_item in queue_docs:
                doc_item.reference.delete()
            queue_cleared = len(queue_docs)

        return jsonify({
            "success": True,
            "sessions_terminated": len(terminated or []),
            "queue_cleared": queue_cleared
        })
    except Exception as e:
        print(f"Error in admin cleanup: {e}")
        return jsonify({"success": False, "message": str(e)})


@app.route("/api/admin/force-cleanup", methods=["POST"])
def force_cleanup_all():
    try:
        sessions_ref = db.collection('sessions')
        active_docs = list(sessions_ref.where(
            filter=firestore.FieldFilter('status', '==', 'active')
        ).stream())

        count = 0
        for doc_item in active_docs:
            doc_item.reference.update({
                'status': 'inactive',
                'terminated_reason': 'force_cleared_by_admin'
            })
            count += 1

        queue_docs = list(db.collection('queue').stream())
        for doc_item in queue_docs:
            doc_item.reference.delete()

        log_event("admin_force_clear", "system", {
            "sessions_cleared": count,
            "queue_cleared": len(queue_docs)
        })

        return jsonify({
            "success": True,
            "sessions_cleared": count,
            "queue_cleared": len(queue_docs)
        })
    except Exception as e:
        print(f"Error in force cleanup: {e}")
        return jsonify({"success": False, "message": str(e)})


cleanup_thread = threading.Thread(target=background_cleanup, daemon=True)
cleanup_thread.start()


if __name__ == "__main__":
    print("\n" + "=" * 60)
    print("🚀 EDCS CHATBOT BACKEND STARTING...")
    print("=" * 60)
    print("Backend API: http://localhost:5000")
    print("Health Check: http://localhost:5000/api/health")
    print("HR Dashboard: http://localhost:5000/hr")
    print("=" * 60 + "\n")
    app.run(debug=True, port=5000, host="0.0.0.0")
