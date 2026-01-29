from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import datetime
import random
import os
from zoneinfo import ZoneInfo

# Timezone for India Standard Time
IST = ZoneInfo('Asia/Kolkata')

def get_ist_now():
    """Get current time in IST as ISO format string"""
    return datetime.datetime.now(IST).isoformat()

# Import our services
from database import (
    save_ticket,
    save_meeting,
    get_ticket_by_id,
    get_all_tickets,
    update_ticket,
    get_all_meetings,
    get_meeting_by_id,
    meetings_collection,
    tickets_collection,
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
            "name": data.get("name"),
            "email": data.get("email"),
            "phone": data.get("phone", ""),
            "category": data.get("category"),
            "priority": data.get("priority", "Normal"),
            "description": data.get("description"),
            "status": "Pending",
            "created_at": get_ist_now(),
            "response": None,
        }

        db_id = save_ticket(ticket_data)

        if db_id:
            send_ticket_notification(ticket_data)

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
            "name": data.get("name"),
            "email": data.get("email"),
            "phone": data.get("phone"),
            "purpose": data.get("purpose"),
            "date": data.get("date"),
            "time": data.get("time"),
            "notes": data.get("notes", ""),
            "status": "Pending",
            "created_at": get_ist_now(),
        }

        db_id = save_meeting(meeting_data)

        if db_id:
            send_meeting_notification(meeting_data)

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


if __name__ == "__main__":
    print("\n" + "=" * 60)
    print("🚀 EDCS CHATBOT BACKEND STARTING...")
    print("=" * 60)
    print("Backend API: http://localhost:5000")
    print("Health Check: http://localhost:5000/api/health")
    print("HR Dashboard: http://localhost:5000/hr")
    print("=" * 60 + "\n")
    app.run(debug=True, port=5000, host="0.0.0.0")
