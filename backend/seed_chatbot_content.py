import firebase_admin
from firebase_admin import credentials, firestore
import json

cred = credentials.Certificate('firebase-key.json')
firebase_admin.initialize_app(cred)
db = firestore.client()

content = {
    "botName": "EVA",
    "welcomeMessages": [
        "I'm EVA, your EDCS assistant! How can I help you today?",
        "Welcome to EDCS support! I'm here to assist you.",
        "Hello! I'm EVA. What can I do for you today?"
    ],
    "mainMenuTitle": "How can I help you today?",
    "footerText": "Powered by EDCS | Select options above",
    "companyName": "Expora Database Consulting Pvt. Ltd India",
    "companyAddress": "874, Raineo House, 2nd Floor, Modi Hospital Road, West of Chord Road, Basaveshwaranagar, Bengaluru-560079, INDIA",
    "supportEmail": "support@edcs.co.in",
    "categories": [
        "Database Management",
        "Cloud Services", 
        "Technical Support",
        "Consulting",
        "Training",
        "Other"
    ],
    "faqs": [
        {
            "id": "faq1",
            "question": "What services does EDCS offer?",
            "answer": "EDCS offers Oracle DBA, SAP consulting, HR solutions, and Accounts management services."
        },
        {
            "id": "faq2", 
            "question": "How can I contact support?",
            "answer": "You can submit a query through this chatbot or email us at support@edcs.co.in"
        },
        {
            "id": "faq3",
            "question": "What are your business hours?",
            "answer": "We are available Monday to Friday, 9 AM to 6 PM IST."
        }
    ]
}

db.collection('chatbot_content').document('main').set(content)
print("Chatbot content seeded successfully!")
