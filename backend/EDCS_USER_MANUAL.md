# EDCS Chatbot System - User Manual

## 1. System Overview
The EDCS Chatbot System is a customer support platform that combines a public chatbot (EVA) with internal dashboards for support teams and administrators. It helps customers submit queries and meeting requests, and helps staff manage, respond, and track them.

**User types:**
- **Public User**: Website visitors who use EVA chatbot to ask questions, submit tickets, request meetings, and check status.
- **Department Handler**: Support staff who manage tickets and meetings in the EDCS Support Dashboard.
- **Admin**: Administrators who manage chatbot content, email routing, service status, and analytics.

---

## 2. How to Start the System

### Start the Flask Backend (API)
1. Open a terminal.
2. Run:
   ```
   cd C:\Users\blessy sharon\EDCS_chatbot\backend
   venv\Scripts\activate
   python app.py
   ```

### Start the React Frontend
1. Open a second terminal.
2. Run:
   ```
   cd C:\Users\blessy sharon\EDCS_chatbot\edcs-chatbot
   npm start
   ```

### URLs
- **Chatbot**: http://localhost:3000
- **Admin Dashboard**: http://localhost:3000/admin
- **Department Dashboard**: http://localhost:3000/dashboard
- **Login Page**: http://localhost:3000/login

---

## 3. EVA Public Chatbot

**Open the chatbot**
- Visit the website and click the chat button at the bottom-right corner.

**Browse FAQ menus**
- Use the menu buttons (SAP, Oracle, Staffing, etc.) to view FAQ answers.

**Submit a support ticket**
- Provide name, email, phone, category, priority, and description.
- A Ticket ID is generated after submission.

**Request a meeting**
- Provide name, email, phone, department, purpose, date (via date picker), time, and notes.
- A Meeting ID is generated after submission.

**Check query status**
- Enter a Ticket ID (or Meeting ID if required) to see status updates.

**Queue system**
- If the system is busy, users are placed in a queue and admitted automatically when a slot is free.

**Session timeout**
- After 60 seconds of inactivity, the chatbot session ends automatically. The user can reopen the chat to start again.

---

## 4. Department Support Dashboard

**Login**
- Go to http://localhost:3000/login
- Use department handler credentials.

**Department tabs**
- SAP
- Oracle DBA
- HR Department
- Accounts

Each tab shows tickets and meetings for that department.

### Support Tickets subtab
- View ticket details, customer info, and query description.
- Change status (Pending, In Progress, Resolved).
- Send branded email using the **Email** button.
- Send quick reply using the **Reply** button.
- Delete a ticket using the **Delete** button.
- Search by name, email, or ticket ID.
- Filter by status and time.

### Meeting Schedule subtab
- View meeting details and customer information.
- Change status (Pending, Scheduled, Confirmed, Completed, Cancelled).
- Send meeting email.
- Create a new meeting using **+ New Meeting**.
- Delete a meeting record.

**Stats bar**
- Shows total, pending, in progress, and resolved counts for the selected subtab.

**Refresh button**
- Reloads ticket and meeting data.

---

## 5. Admin Dashboard

**Login**
- Go to http://localhost:3000/login
- Use admin credentials.

### Tabs

**Email Config**
- Update department email IDs and click **Save**.

**Chatbot Content**
- Edit all text shown in the chatbot.
- **General Settings**: bot name, company name, support email, footer text, address.
- **Welcome Messages**: add, edit, remove greetings.
- **Main Menu Options**: edit button text, add new buttons.
- **Sub Menus**: edit menu messages, options, and answers.
- **Add New Section**: creates a new menu section and adds it to the main menu.
- **Save All Changes** at the bottom applies updates.

**Traffic Analysis**
- Summary stats: total sessions, active now, average per day, events.
- Line chart: sessions over last 14 days.
- Bar chart: peak usage hours.
- Event breakdown list.
- Pie chart: session termination reasons.

**Cleanup Bar (all tabs)**
- **Clean Stale Sessions**: clears timed-out sessions and queue entries.
- **Force Clear Everything**: clears ALL sessions and queue (use only if stuck).

**Service Toggle**
- Can take chatbot online or offline instantly (in service status controls).

**Refresh button**
- Reloads the dashboard.

---

## 6. Email System

**Automatic emails**
- Ticket submission: confirmation to the user + notification to the department.
- Meeting request: confirmation to the user + notification to the department.
- Department replies: branded reply to the user.

**Branding**
- Emails use EDCS logo, dark blue header, red accent, and company address footer.

---

## 7. Common Issues and Solutions

**Issue: Chatbot shows queue even when no one is using it**
- Go to Admin Dashboard and click **Force Clear Everything**.

**Issue: Email not sending**
- Check Flask terminal logs.
- Verify `SENDER_EMAIL` and `SENDER_PASSWORD` in `backend/.env`.

**Issue: Dashboard not loading tickets**
- Ensure Flask backend is running on port 5000.
- Verify `REACT_APP_API_BASE=http://localhost:5000` in `edcs-chatbot/.env`.

**Issue: Chatbot content not updating**
- Admin Dashboard ? Chatbot Content ? Save All Changes ? refresh chatbot page.

**Issue: Department not receiving emails**
- Admin Dashboard ? Email Config ? verify correct department email.

**Issue: System unresponsive**
1. Stop both terminals (Ctrl+C).
2. Restart Flask: `python app.py`.
3. Restart React: `npm start`.
4. Admin Dashboard ? Force Clear Everything.

---

## 8. Login Credentials Management

- Admin and department handler accounts are managed in **Firebase Console**.
- To add a new department handler:
  1. Create a user in Firebase Authentication.
  2. Add a document in Firestore `users` collection with:
     - `role: department_handler`
     - `department: <department name>`
- To change email credentials:
  - Update `backend/.env` and restart Flask.
- To change department routing emails:
  - Use Admin Dashboard ? Email Config.
