import os
import time
import email
import imaplib
import re
from dotenv import load_dotenv

from database import update_ticket  # using your existing function

load_dotenv()

EMAIL_USER = os.getenv('EMAIL_USER')
EMAIL_PASSWORD = os.getenv('EMAIL_PASSWORD')

IMAP_HOST = 'imap.gmail.com'
IMAP_PORT = 993

TICKET_REGEX = re.compile(r'EDCS-\d{8}-\d{4}')  # matches EDCS-20241202-1234

def extract_ticket_id(text: str):
    match = TICKET_REGEX.search(text)
    return match.group(0) if match else None

def process_unseen_emails():
    if not EMAIL_USER or not EMAIL_PASSWORD:
        print("⚠️ IMAP credentials missing, skipping email listener.")
        return

    try:
        mail = imaplib.IMAP4_SSL(IMAP_HOST, IMAP_PORT)
        mail.login(EMAIL_USER, EMAIL_PASSWORD)
        mail.select('INBOX')

        status, data = mail.search(None, '(UNSEEN)')
        if status != 'OK':
            print("⚠️ No unseen messages or search error.")
            mail.logout()
            return

        email_ids = data[0].split()
        if not email_ids:
            mail.logout()
            return

        for eid in email_ids:
            status, msg_data = mail.fetch(eid, '(RFC822)')
            if status != 'OK':
                continue

            raw_email = msg_data[0][1]
            msg = email.message_from_bytes(raw_email)

            subject = msg.get('Subject', '')
            from_addr = msg.get('From', '')

            body_text = ""
            if msg.is_multipart():
                for part in msg.walk():
                    if part.get_content_type() == 'text/plain':
                        charset = part.get_content_charset() or 'utf-8'
                        body_text += part.get_payload(decode=True).decode(charset, errors='ignore')
            else:
                charset = msg.get_content_charset() or 'utf-8'
                body_text = msg.get_payload(decode=True).decode(charset, errors='ignore')

            combined_text = subject + "\n" + body_text
            ticket_id = extract_ticket_id(combined_text)

            if ticket_id:
                print(f"📧 Found reply for ticket {ticket_id} from {from_addr}")
                response_text = f"Reply via email from {from_addr}:\n\n{body_text[:1000]}"
                updated = update_ticket(ticket_id, {
                    'status': 'Resolved',
                    'response': response_text
                })
                if not updated:
                    print(f"⚠️ Could not update ticket {ticket_id} in Firestore.")
            else:
                print("ℹ️ Email without EDCS ticket ID, skipping.")

            # Mark this email as seen
            mail.store(eid, '+FLAGS', '\\Seen')

        mail.logout()

    except Exception as e:
        print(f"❌ Error in email listener: {e}")

def start_email_listener():
    print("📬 Email listener started – checking every 5 minutes...")
    while True:
        process_unseen_emails()
        time.sleep(300)  # 5 minutes

if __name__ == '__main__':
    start_email_listener()
