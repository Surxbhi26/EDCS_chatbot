import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import os
from dotenv import load_dotenv

load_dotenv()

# Email configuration
SENDER_EMAIL = os.getenv('EMAIL_USER')
SENDER_PASSWORD = os.getenv('EMAIL_PASSWORD')
HR_EMAIL = os.getenv('HR_EMAIL')
MANAGER_EMAIL = os.getenv('MANAGER_EMAIL')

def send_ticket_notification(ticket_data):
    """Send email notification when ticket is created"""
    
    if not SENDER_EMAIL or not SENDER_PASSWORD:
        print("⚠️ Email credentials not configured. Skipping email.")
        return False
    
    try:
        # Create message
        msg = MIMEMultipart()
        msg['From'] = SENDER_EMAIL
        msg['To'] = f"{HR_EMAIL}, {MANAGER_EMAIL}"
        msg['Subject'] = f"🎫 New Ticket #{ticket_data['ticket_id']} - {ticket_data['priority']} Priority"
        
        # Format created_at
        created_time = ticket_data['created_at']
        if hasattr(created_time, 'strftime'):
            created_str = created_time.strftime('%Y-%m-%d %H:%M:%S')
        else:
            created_str = str(created_time)
        
        # Email body
        body = f"""
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🎫 NEW SUPPORT TICKET RECEIVED
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Ticket Details:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Ticket ID:     {ticket_data['ticket_id']}
Priority:      {ticket_data['priority']}
Category:      {ticket_data['category']}
Status:        {ticket_data['status']}
Created:       {created_str}

Customer Information:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Name:          {ticket_data['name']}
Email:         {ticket_data['email']}
Phone:         {ticket_data.get('phone', 'Not provided')}

Customer Query:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
{ticket_data['description']}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⚡ ACTION REQUIRED
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Please respond to the customer at: {ticket_data['email']}
Expected Response Time: Within 24 hours

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
This is an automated message from EDCS Chatbot System
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        """
        
        msg.attach(MIMEText(body, 'plain'))
        
        # Send email via Gmail SMTP
        with smtplib.SMTP('smtp.gmail.com', 587) as server:
            server.starttls()
            server.login(SENDER_EMAIL, SENDER_PASSWORD)
            server.send_message(msg)
        
        print(f"✅ Ticket notification email sent to {HR_EMAIL}, {MANAGER_EMAIL}")
        return True
        
    except Exception as e:
        print(f"❌ Error sending ticket email: {e}")
        return False

def send_meeting_notification(meeting_data):
    """Send email notification when meeting is requested"""
    
    if not SENDER_EMAIL or not SENDER_PASSWORD:
        print("⚠️ Email credentials not configured. Skipping email.")
        return False
    
    try:
        msg = MIMEMultipart()
        msg['From'] = SENDER_EMAIL
        msg['To'] = f"{HR_EMAIL}, {MANAGER_EMAIL}"
        msg['Subject'] = f"📅 New Meeting Request - {meeting_data['purpose']}"
        
        # Format created_at
        created_time = meeting_data['created_at']
        if hasattr(created_time, 'strftime'):
            created_str = created_time.strftime('%Y-%m-%d %H:%M:%S')
        else:
            created_str = str(created_time)
        
        body = f"""
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📅 NEW MEETING REQUEST
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Meeting Details:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Meeting ID:    {meeting_data['meeting_id']}
Purpose:       {meeting_data['purpose']}
Status:        {meeting_data['status']}
Requested:     {created_str}

Requester Information:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Name:          {meeting_data['name']}
Email:         {meeting_data['email']}
Phone:         {meeting_data['phone']}

Preferred Schedule:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Date:          {meeting_data['date']}
Time:          {meeting_data['time']}

Additional Notes:
{meeting_data.get('notes', 'No additional notes provided')}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⚡ ACTION REQUIRED
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Please send a calendar invite to: {meeting_data['email']}
Include meeting link and agenda

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
This is an automated message from EDCS Chatbot System
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        """
        
        msg.attach(MIMEText(body, 'plain'))
        
        with smtplib.SMTP('smtp.gmail.com', 587) as server:
            server.starttls()
            server.login(SENDER_EMAIL, SENDER_PASSWORD)
            server.send_message(msg)
        
        print(f"✅ Meeting notification email sent to {HR_EMAIL}, {MANAGER_EMAIL}")
        return True
        
    except Exception as e:
        print(f"❌ Error sending meeting email: {e}")
        return False

def send_status_update_to_customer(ticket_data, customer_email):
    """Send email to customer when HR updates ticket status"""
    
    if not SENDER_EMAIL or not SENDER_PASSWORD:
        print("⚠️ Email credentials not configured. Skipping email.")
        return False
    
    try:
        msg = MIMEMultipart()
        msg['From'] = SENDER_EMAIL
        msg['To'] = customer_email
        msg['Subject'] = f"✅ Update on Your Query - Ticket #{ticket_data['ticket_id']}"
        
        body = f"""
Dear {ticket_data['name']},

Thank you for contacting EDCS!

Your query has been updated:

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Ticket ID: {ticket_data['ticket_id']}
Status: {ticket_data['status']}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Your Query:
{ticket_data['description']}

Our Response:
{ticket_data.get('response', 'Our team is working on this.')}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

If you have any further questions, please reply to this email or
visit our chatbot again to check your ticket status.

Best regards,
EDCS Team
Expora Database Consulting Pvt. Ltd India

Email: support@edcs.com
Website: www.edcs.com
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        """
        
        msg.attach(MIMEText(body, 'plain'))
        
        with smtplib.SMTP('smtp.gmail.com', 587) as server:
            server.starttls()
            server.login(SENDER_EMAIL, SENDER_PASSWORD)
            server.send_message(msg)
        
        print(f"✅ Status update email sent to customer: {customer_email}")
        return True
        
    except Exception as e:
        print(f"❌ Error sending customer email: {e}")
        return False


def send_custom_email(to_email, cc_emails, subject, body):
    """
    Send custom email from HR dashboard (for both tickets and meetings)
    
    Args:
        to_email (str): Primary recipient email
        cc_emails (str): Comma-separated CC emails (optional)
        subject (str): Email subject
        body (str): Email body content
    
    Returns:
        bool: True if email sent successfully, False otherwise
    """
    
    if not SENDER_EMAIL or not SENDER_PASSWORD:
        print("⚠️ Email credentials not configured. Skipping email.")
        return False
    
    if not to_email or not to_email.strip():
        print("⚠️ No recipient email address provided. Skipping email.")
        return False
    
    try:
        # Create message
        msg = MIMEMultipart()
        msg['From'] = SENDER_EMAIL
        msg['To'] = to_email
        msg['Subject'] = subject
        
        # Add CC if provided
        if cc_emails and cc_emails.strip():
            msg['Cc'] = cc_emails
        
        # Attach body
        msg.attach(MIMEText(body, 'plain'))
        
        # Send email via Gmail SMTP
        with smtplib.SMTP('smtp.gmail.com', 587) as server:
            server.starttls()
            server.login(SENDER_EMAIL, SENDER_PASSWORD)
            
            # Build recipient list (To + CC)
            recipients = [to_email]
            if cc_emails and cc_emails.strip():
                cc_list = [email.strip() for email in cc_emails.split(',') if email.strip()]
                recipients.extend(cc_list)
            
            # Send to all recipients
            server.sendmail(SENDER_EMAIL, recipients, msg.as_string())
        
        print(f"✅ Custom email sent successfully!")
        print(f"   To: {to_email}")
        if cc_emails and cc_emails.strip():
            print(f"   CC: {cc_emails}")
        print(f"   Subject: {subject}")
        return True
        
    except Exception as e:
        print(f"❌ Error sending custom email: {e}")
        import traceback
        traceback.print_exc()
        return False


# Test function
if __name__ == "__main__":
    print("\n" + "="*60)
    print("📧 TESTING EMAIL SERVICE")
    print("="*60)
    
    from datetime import datetime
    
    # Test 1: Ticket notification
    test_ticket = {
        'ticket_id': 'TEST-12345',
        'name': 'Test User',
        'email': SENDER_EMAIL,  # Send to yourself for testing
        'phone': '9876543210',
        'category': 'General',
        'priority': 'Normal',
        'description': 'This is a test ticket to verify email notifications are working.',
        'status': 'Pending',
        'created_at': datetime.now()
    }
    
    print("\n📤 Test 1: Sending ticket notification email...")
    result1 = send_ticket_notification(test_ticket)
    
    if result1:
        print("✅ Ticket notification sent!")
    else:
        print("❌ Ticket notification failed!")
    
    # Test 2: Custom email
    print("\n📤 Test 2: Sending custom email...")
    result2 = send_custom_email(
        to_email=SENDER_EMAIL,
        cc_emails="",
        subject="Test Custom Email from EDCS HR Dashboard",
        body="This is a test custom email to verify the send_custom_email function works correctly.\n\nBest regards,\nEDCS HR Team"
    )
    
    if result2:
        print("✅ Custom email sent!")
    else:
        print("❌ Custom email failed!")
    
    print("\n" + "="*60)
    if result1 or result2:
        print("✅ SUCCESS! Check your inbox: " + SENDER_EMAIL)
        print("\nIf you don't see emails:")
        print("  1. Check your Spam/Junk folder")
        print("  2. Wait 1-2 minutes")
        print("  3. Verify email credentials in .env file")
    else:
        print("❌ FAILED! No emails sent.")
        print("Check your .env file configuration.")
    print("="*60 + "\n")