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
FROM_EMAIL = SENDER_EMAIL
SMTP_SERVER = 'smtp.gmail.com'
SMTP_PORT = 587
SMTP_USERNAME = SENDER_EMAIL
SMTP_PASSWORD = SENDER_PASSWORD


def get_email_template(title, subtitle, body_html, footer_note=""):
    return f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background-color:#f1f5f9;font-family:Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f1f5f9;padding:32px 0;">
  <tr><td align="center">
    <table width="600" cellpadding="0" cellspacing="0"
        style="background-color:#ffffff;border-radius:16px;overflow:hidden;
        box-shadow:0 4px 24px rgba(0,0,0,0.10);">
      <tr>
        <td style="background:linear-gradient(135deg,#1e3a5f 0%,#2c5282 100%);
            padding:32px 40px;text-align:center;">
          <img src="https://i.ibb.co/3mmcBJ70/expora-database-consulting-logo.jpg" 
    alt="EDCS - Expertise for Business Growth" 
    style="max-width:180px;height:auto;display:block;margin:0 auto;">
        </td>
      </tr>
      <tr>
        <td style="background-color:#ef5b6c;padding:16px 40px;">
          <h1 style="margin:0;font-size:20px;font-weight:700;color:#ffffff;">
            {title}
          </h1>
          {'<p style="margin:4px 0 0;font-size:13px;color:#ffe4e8;">' + subtitle + '</p>' if subtitle else ''}
        </td>
      </tr>
      <tr>
        <td style="padding:32px 40px;">
          {body_html}
        </td>
      </tr>
      <tr>
        <td style="padding:0 40px;">
          <hr style="border:none;border-top:1px solid #e2e8f0;margin:0;">
        </td>
      </tr>
      <tr>
        <td style="padding:24px 40px;background-color:#f8fafc;
            border-radius:0 0 16px 16px;">
          {'<p style="margin:0 0 8px;font-size:13px;color:#64748b;">' + footer_note + '</p>' if footer_note else ''}
          <p style="margin:0;font-size:12px;color:#94a3b8;">
            <strong style="color:#1e3a5f;">Expora Database Consulting Pvt. Ltd India</strong><br>
            874, Raineo House, 2nd Floor, Modi Hospital Road,<br>
            West of Chord Road, Basaveshwaranagar, Bengaluru - 560079, INDIA<br><br>
            <span style="color:#ef5b6c;">support@edcs.co.in</span>
          </p>
        </td>
      </tr>
    </table>
    <p style="margin:16px 0 0;font-size:11px;color:#94a3b8;text-align:center;">
      This is an automated email from EDCS Support System.
      Please do not reply directly to this email.
    </p>
  </td></tr>
</table>
</body>
</html>"""

def info_row(label, value):
    return f"""<tr>
      <td style="padding:8px 12px;font-size:13px;font-weight:600;
          color:#374151;background-color:#f8fafc;width:35%;">{label}</td>
      <td style="padding:8px 12px;font-size:13px;color:#1e293b;
          background-color:#f1f5f9;">{value}</td>
    </tr>"""

def send_ticket_notification(ticket_data):
    try:
        name = ticket_data.get('name', 'Customer')
        ticket_id = ticket_data.get('ticket_id', 'N/A')
        category = ticket_data.get('category', 'N/A')
        priority = ticket_data.get('priority', 'Normal')
        description = ticket_data.get('description', '')
        customer_email = ticket_data.get('email', '')
        dept_email = ticket_data.get('dept_email', '')
        department = ticket_data.get('department', 'Support')
        phone = ticket_data.get('phone', 'Not provided')

        # Email to customer
        customer_body = f"""
        <p style="font-size:15px;color:#374151;margin:0 0 20px;">
            Dear <strong>{name}</strong>,
        </p>
        <p style="font-size:14px;color:#374151;margin:0 0 20px;">
            Thank you for contacting EDCS Support. We have received 
            your query and our team will respond shortly.
        </p>
        <div style="background-color:#eff6ff;border-left:4px solid #1e3a5f;
            border-radius:8px;padding:16px;margin-bottom:20px;">
            <p style="margin:0 0 10px;font-size:13px;font-weight:700;
                color:#1e3a5f;">TICKET DETAILS</p>
            <table width="100%" cellpadding="4" cellspacing="4">
                {info_row("Ticket ID", f'<strong style="color:#ef5b6c;">{ticket_id}</strong>')}
                {info_row("Category", category)}
                {info_row("Priority", priority)}
                {info_row("Status", "Pending - Under Review")}
            </table>
        </div>
        <div style="background-color:#f8fafc;border-radius:8px;
            padding:16px;margin-bottom:20px;">
            <p style="margin:0 0 8px;font-size:13px;font-weight:700;
                color:#374151;">YOUR QUERY</p>
            <p style="margin:0;font-size:14px;color:#4a5568;
                line-height:1.6;">{description}</p>
        </div>
        <div style="background-color:#fef3c7;border-radius:8px;
            padding:14px;border-left:4px solid #f59e0b;">
            <p style="margin:0;font-size:13px;color:#92400e;">
                 <strong>Save your Ticket ID: {ticket_id}</strong><br>
                Use this ID to check your query status in our chatbot.
            </p>
        </div>
        """
        customer_html = get_email_template(
            title="Support Ticket Received",
            subtitle=f"Ticket ID: {ticket_id}",
            body_html=customer_body,
            footer_note="Our support team will respond within 24 business hours."
        )
        send_custom_email(
            customer_email, None,
            f"EDCS Support - Ticket {ticket_id} Received",
            customer_html
        )

        # Email to department
        if dept_email:
            dept_body = f"""
            <p style="font-size:14px;color:#374151;margin:0 0 20px;">
                A new support ticket has been assigned to the 
                <strong style="color:#1e3a5f;">{department}</strong> department.
            </p>
            <div style="background-color:#fef2f2;border-left:4px solid #ef5b6c;
                border-radius:8px;padding:16px;margin-bottom:20px;">
                <p style="margin:0 0 10px;font-size:13px;font-weight:700;
                    color:#ef5b6c;">NEW TICKET - ACTION REQUIRED</p>
                <table width="100%" cellpadding="4" cellspacing="4">
                    {info_row("Ticket ID", f'<strong style="color:#ef5b6c;">{ticket_id}</strong>')}
                    {info_row("Priority", f'<strong style="color:{"#dc2626" if priority == "Urgent" else "#d97706"};">{priority}</strong>')}
                    {info_row("Category", category)}
                    {info_row("Customer Name", name)}
                    {info_row("Customer Email", customer_email)}
                    {info_row("Customer Phone", phone)}
                </table>
            </div>
            <div style="background-color:#f8fafc;border-radius:8px;
                padding:16px;margin-bottom:20px;">
                <p style="margin:0 0 8px;font-size:13px;font-weight:700;
                    color:#374151;">CUSTOMER QUERY</p>
                <p style="margin:0;font-size:14px;color:#4a5568;
                    line-height:1.6;">{description}</p>
            </div>
            <div style="background-color:#eff6ff;border-radius:8px;
                padding:14px;border-left:4px solid #1e3a5f;">
                <p style="margin:0;font-size:13px;color:#1e3a5f;">
                     Login to <strong>EDCS Support Dashboard</strong> 
                    to respond to this ticket.
                </p>
            </div>
            """
            dept_html = get_email_template(
                title=f"New Ticket - {department} Department",
                subtitle=f"Ticket ID: {ticket_id} | Priority: {priority}",
                body_html=dept_body,
                footer_note="Please respond within your SLA timeframe."
            )
            send_custom_email(
                dept_email, None,
                f"[EDCS] New Ticket {ticket_id} - {category} ({priority})",
                dept_html
            )
    except Exception as e:
        print(f"Error in send_ticket_notification: {e}")


def send_meeting_notification(meeting_data):
    try:
        name = meeting_data.get('name', 'Customer')
        meeting_id = meeting_data.get('meeting_id', 'N/A')
        purpose = meeting_data.get('purpose', 'N/A')
        date = meeting_data.get('date', 'N/A')
        time = meeting_data.get('time', 'N/A')
        customer_email = meeting_data.get('email', '')
        dept_email = meeting_data.get('dept_email', '')
        department = meeting_data.get('department', 'Support')
        phone = meeting_data.get('phone', 'Not provided')

        # Email to customer
        customer_body = f"""
        <p style="font-size:15px;color:#374151;margin:0 0 20px;">
            Dear <strong>{name}</strong>,
        </p>
        <p style="font-size:14px;color:#374151;margin:0 0 20px;">
            Thank you for requesting a meeting with EDCS.
            We have received your request and will confirm shortly.
        </p>
        <div style="background-color:#eff6ff;border-left:4px solid #1e3a5f;
            border-radius:8px;padding:16px;margin-bottom:20px;">
            <p style="margin:0 0 10px;font-size:13px;font-weight:700;
                color:#1e3a5f;">MEETING REQUEST DETAILS</p>
            <table width="100%" cellpadding="4" cellspacing="4">
                {info_row("Meeting ID", f'<strong style="color:#ef5b6c;">{meeting_id}</strong>')}
                {info_row("Purpose", purpose)}
                {info_row("Preferred Date", date)}
                {info_row("Preferred Time", time)}
                {info_row("Status", "Pending - Awaiting Confirmation")}
            </table>
        </div>
        <div style="background-color:#fef3c7;border-radius:8px;
            padding:14px;border-left:4px solid #f59e0b;">
            <p style="margin:0;font-size:13px;color:#92400e;">
                <strong>Save your Meeting ID: {meeting_id}</strong><br>
                You will receive a confirmation email with the
                meeting link once approved.
            </p>
        </div>
        """
        customer_html = get_email_template(
            title="Meeting Request Received",
            subtitle=f"Meeting ID: {meeting_id}",
            body_html=customer_body,
            footer_note="We will confirm your meeting within 24 business hours."
        )
        send_custom_email(
            customer_email, None,
            f"EDCS - Meeting Request {meeting_id} Received",
            customer_html
        )

        # Email to department
        if dept_email:
            dept_body = f"""
            <p style="font-size:14px;color:#374151;margin:0 0 20px;">
                A new meeting request has been assigned to the
                <strong style="color:#1e3a5f;">{department}</strong> department.
            </p>
            <div style="background-color:#fef2f2;border-left:4px solid #ef5b6c;
                border-radius:8px;padding:16px;margin-bottom:20px;">
                <p style="margin:0 0 10px;font-size:13px;font-weight:700;
                    color:#ef5b6c;">NEW MEETING REQUEST - ACTION REQUIRED</p>
                <table width="100%" cellpadding="4" cellspacing="4">
                    {info_row("Meeting ID", f'<strong style="color:#ef5b6c;">{meeting_id}</strong>')}
                    {info_row("Purpose", purpose)}
                    {info_row("Preferred Date", date)}
                    {info_row("Preferred Time", time)}
                    {info_row("Customer Name", name)}
                    {info_row("Customer Email", customer_email)}
                    {info_row("Customer Phone", phone)}
                </table>
            </div>
            <div style="background-color:#eff6ff;border-radius:8px;
                padding:14px;border-left:4px solid #1e3a5f;">
                <p style="margin:0;font-size:13px;color:#1e3a5f;">
                    Login to <strong>EDCS Support Dashboard</strong>
                    to approve or reject this meeting request.
                </p>
            </div>
            """
            dept_html = get_email_template(
                title=f"New Meeting Request - {department}",
                subtitle=f"Meeting ID: {meeting_id}",
                body_html=dept_body,
                footer_note="Please confirm or reject within 24 hours."
            )
            send_custom_email(
                dept_email, None,
                f"[EDCS] New Meeting Request {meeting_id} - {purpose}",
                dept_html
            )
    except Exception as e:
        print(f"Error in send_meeting_notification: {e}")


def send_status_update_to_customer(ticket_data, customer_email):
    try:
        ticket_id = ticket_data.get('ticket_id', 'N/A')
        status = ticket_data.get('status', 'Updated')
        category = ticket_data.get('category', 'N/A')
        response = ticket_data.get('response', '')

        body = f"""
        <p style="font-size:15px;color:#374151;margin:0 0 20px;">
            Dear Customer,
        </p>
        <p style="font-size:14px;color:#374151;margin:0 0 20px;">
            There is an update on your support ticket.
        </p>
        <div style="background-color:#eff6ff;border-left:4px solid #1e3a5f;
            border-radius:8px;padding:16px;margin-bottom:20px;">
            <p style="margin:0 0 10px;font-size:13px;font-weight:700;
                color:#1e3a5f;">TICKET UPDATE</p>
            <table width="100%" cellpadding="4" cellspacing="4">
                {info_row("Ticket ID", f'<strong style="color:#ef5b6c;">{ticket_id}</strong>')}
                {info_row("Category", category)}
                {info_row("New Status", f'<strong>{status}</strong>')}
            </table>
        </div>
        {'<div style="background-color:#f8fafc;border-radius:8px;padding:16px;margin-bottom:20px;"><p style="margin:0 0 8px;font-size:13px;font-weight:700;color:#374151;">RESPONSE FROM SUPPORT TEAM</p><p style="margin:0;font-size:14px;color:#4a5568;line-height:1.6;">' + response + '</p></div>' if response else ''}
        """
        html = get_email_template(
            title="Ticket Status Update",
            subtitle=f"Ticket ID: {ticket_id} - {status}",
            body_html=body,
            footer_note="If you have further questions please submit a new query through our chatbot."
        )
        return send_custom_email(
            customer_email, None,
            f"EDCS - Ticket {ticket_id} Status Updated: {status}",
            html
        )
    except Exception as e:
        print(f"Error in send_status_update_to_customer: {e}")
        return False


def send_custom_email(to_email, cc_emails, subject, body):
    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = f"EDCS Support <{FROM_EMAIL}>"
        msg["To"] = to_email
        if cc_emails:
            if isinstance(cc_emails, list):
                msg["Cc"] = ", ".join(cc_emails)
            else:
                msg["Cc"] = cc_emails

        # If body looks like HTML use html, otherwise wrap it
        if body and body.strip().startswith("<!DOCTYPE"):
            msg.attach(MIMEText(body, "html"))
        else:
            # Wrap plain text in branded template
            wrapped_body = f"""
            <p style="font-size:14px;color:#374151;
                line-height:1.8;white-space:pre-line;">{body}</p>
            """
            html = get_email_template(
                title="Message from EDCS Support",
                subtitle="",
                body_html=wrapped_body,
                footer_note="If you have further questions please contact us through our chatbot."
            )
            msg.attach(MIMEText(html, "html"))

        recipients = [to_email]
        if cc_emails:
            if isinstance(cc_emails, list):
                recipients.extend(cc_emails)
            else:
                recipients.append(cc_emails)

        with smtplib.SMTP(SMTP_SERVER, SMTP_PORT) as server:
            server.starttls()
            server.login(SMTP_USERNAME, SMTP_PASSWORD)
            server.sendmail(FROM_EMAIL, recipients, msg.as_string())

        print(f"Email sent successfully to {to_email}")
        return True
    except Exception as e:
        print(f"Failed to send email to {to_email}: {e}")
        return False
