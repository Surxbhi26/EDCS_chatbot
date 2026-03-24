import firebase_admin
from firebase_admin import credentials, firestore

cred = credentials.Certificate('firebase-key.json')
firebase_admin.initialize_app(cred)
db = firestore.client()

content = {
    "botName": "EVA",
    "companyName": "EDCS Assistant",
    "footerText": "Powered by EDCS | Select options above",
    "supportEmail": "support@edcs.co.in",
    "companyAddress": "874, Raineo House, 2nd Floor, Modi Hospital Road, West of Chord Road, Basaveshwaranagar, Bengaluru-560079, INDIA",
    "welcomeMessages": [
        "I'm EVA, your EDCS assistant! How can I help you today?",
        "Welcome to EDCS support! I'm here to assist you.",
        "Hello! I'm EVA. What can I do for you today?"
    ],
    "menus": {
        "main": {
            "message": "👋 Hello! Welcome to our company. We specialize in SAP Consulting, Oracle Services, and IT Staffing Solutions. Select an option to learn more.",
            "options": [
                {"id": "sap", "text": "1️⃣ SAP Consulting", "action": "menu"},
                {"id": "oracle", "text": "2️⃣ Oracle Services", "action": "menu"},
                {"id": "staffing", "text": "3️⃣ Managing services", "action": "menu"},
                {"id": "company", "text": "4️⃣ Company & Services", "action": "menu"},
                {"id": "engagement", "text": "5️⃣ Engagement & Pricing", "action": "menu"},
                {"id": "support", "text": "6️⃣ Support & Delivery", "action": "menu"},
                {"id": "about", "text": "ℹ️ About Us", "action": "answer"},
                {"id": "contact", "text": "📧 Contact Support", "action": "menu"},
                {"id": "ticket", "text": "🎫 Submit a Query", "action": "ticket"},
                {"id": "meeting", "text": "📅 Request a Meeting", "action": "meeting"},
                {"id": "checkStatus", "text": "🔍 Check Query Status", "action": "checkStatus"}
            ]
        },
        "sap": {
            "message": "Great! We offer end-to-end SAP services. Select an option to learn more.",
            "options": [
                {"id": "sap1", "text": "SAP services we offer.", "action": "answer"},
                {"id": "sap2", "text": "SAP S/4HANA Migration.", "action": "answer"},
                {"id": "sap3", "text": "SAP Implementation.", "action": "answer"},
                {"id": "sap4", "text": "SAP Support & Maintenance.", "action": "answer"},
                {"id": "sap5", "text": "Hire SAP Consultants.", "action": "answer"},
                {"id": "sap6", "text": "SAP functional and technical consultants.", "action": "answer"}
            ]
        },
        "oracle": {
            "message": "We provide Oracle E-Business Suite, Fusion Cloud, and Database services. Select an option to learn more.",
            "options": [
                {"id": "ora1", "text": "Oracle services we support.", "action": "answer"},
                {"id": "ora2", "text": "Oracle Cloud (Fusion) Migration.", "action": "answer"},
                {"id": "ora3", "text": "Oracle E-Business Suite.", "action": "answer"},
                {"id": "ora4", "text": "DBA Services.", "action": "answer"},
                {"id": "ora5", "text": "Hire Oracle Consultants.", "action": "answer"}
            ]
        },
        "staffing": {
            "message": "We offer contract, contract-to-hire, full-time hiring, and project staffing. Select an option to learn more.",
            "options": [
                {"id": "staff1", "text": "Staffing solutions we provide.", "action": "answer"},
                {"id": "staff2", "text": "Skill sets we specialize in.", "action": "answer"},
                {"id": "staff3", "text": "Consultant deployment timeline.", "action": "answer"},
                {"id": "staff4", "text": "Background checks and screening.", "action": "answer"},
                {"id": "staff5", "text": "Hire IT Talent.", "action": "answer"},
                {"id": "staff6", "text": "Technologies We Staff.", "action": "answer"}
            ]
        },
        "company": {
            "message": "Company & Services Information:",
            "options": [
                {"id": "comp1", "text": "Services our company provides.", "action": "answer"},
                {"id": "comp2", "text": "Our typical clients.", "action": "answer"},
                {"id": "comp3", "text": "Remote and onsite consulting.", "action": "answer"},
                {"id": "comp4", "text": "International clients.", "action": "answer"},
                {"id": "comp5", "text": "Business hours.", "action": "answer"},
                {"id": "comp6", "text": "Location.", "action": "answer"}
            ]
        },
        "engagement": {
            "message": "Engagement & Pricing Information:",
            "options": [
                {"id": "eng1", "text": "Requesting a proposal or quote.", "action": "answer"},
                {"id": "eng2", "text": "Service pricing information.", "action": "answer"},
                {"id": "eng3", "text": "NDAs and long-term contracts.", "action": "answer"},
                {"id": "eng4", "text": "Payment terms and methods.", "action": "answer"},
                {"id": "eng5", "text": "Engagement models available.", "action": "answer"},
                {"id": "eng6", "text": "Minimum contract duration.", "action": "answer"}
            ]
        },
        "support": {
            "message": "Support & Delivery Information:",
            "options": [
                {"id": "sup1", "text": "Post-implementation support.", "action": "answer"},
                {"id": "sup2", "text": "Project delivery methodology.", "action": "answer"},
                {"id": "sup3", "text": "Offshore development teams.", "action": "answer"}
            ]
        },
        "contact": {
            "message": "Reach out to us via email.",
            "options": [
                {"id": "con1", "text": "📧 Email", "action": "answer"},
                {"id": "con3", "text": "📝 Request a Callback", "action": "ticket"}
            ]
        }
    },
    "answers": {
        "about": "About Us:\n\nWe are an IT consulting company specializing in SAP, Oracle, and IT Staffing. We help enterprises streamline operations and build strong technology teams.\n\n✓ SAP Consulting expertise\n✓ Oracle Services\n✓ IT Staffing Solutions\n✓ Serving clients globally\n✓ 24/7 support available",
        "sap1": "SAP Services We Offer:\n\n• SAP Implementation (ECC, S/4HANA)\n• SAP S/4HANA Migration & Conversion\n• SAP Support & Maintenance\n• SAP Integration Services\n• SAP Module Expertise:\n  - FI/CO, MM, SD, PP\n  - HCM, Basis, ABAP\n  - And more\n\nContact us to schedule a consultation.",
        "sap2": "SAP S/4HANA Migration:\n\nYes—our team has experience in:\n• Technical conversion\n• Greenfield migration\n• Brownfield migration\n• Hybrid approach\n\nWe offer comprehensive support from planning to go-live and beyond. Contact us to connect with a migration expert.",
        "sap3": "SAP Implementation:\n\nWe provide SAP implementation for ECC and S/4HANA, covering:\n• Functional modules\n• Technical modules\n• End-to-end implementation\n• Integration services\n\nOur proven methodology ensures successful project delivery. Contact us to schedule a consultation.",
        "sap4": "SAP Support & Maintenance:\n\nWe provide:\n• 24/7 SAP Support\n• AMS (Application Management Services)\n• Production issue handling\n• System monitoring\n• Performance optimization\n• Incident management\n\nOur support team ensures your SAP systems run smoothly.",
        "sap5": "Hire SAP Consultants:\n\nWe have certified SAP consultants across:\n• FI/CO (Finance & Controlling)\n• MM (Materials Management)\n• SD (Sales & Distribution)\n• PP (Production Planning)\n• HCM (Human Capital Management)\n• Basis & ABAP\n\nAvailable for:\n✓ Contract staffing\n✓ Contract-to-hire\n✓ Full-time placement\n\nContact us for profiles of SAP consultants or our rate card.",
        "sap6": "SAP Functional and Technical Consultants:\n\nAbsolutely! We offer certified SAP consultants:\n\nFunctional:\n• FI/CO, MM, SD, PP, HCM, QM\n\nTechnical:\n• Basis, ABAP, PI/PO, BW/BI, Fiori\n\nAll consultants are:\n✓ Certified and experienced\n✓ Available across multiple levels\n✓ Ready for immediate deployment",
        "ora1": "Oracle Services We Support:\n\n• Oracle E-Business Suite (EBS)\n• Oracle Cloud Applications (Fusion)\n• Oracle Database Administration & Support\n• Oracle Financials, SCM, HCM modules\n• Upgrades and integrations\n• End-to-end implementations\n\nWe provide comprehensive Oracle solutions for enterprises.",
        "ora2": "Oracle Cloud Migration Services:\n\nYes. We assist with:\n• Migration planning\n• Data migration\n• Integration setup\n• Testing and validation\n• Post-go-live support\n\nOur team ensures a smooth transition to Oracle Cloud (Fusion). Contact us to request a demo or view our service offerings.",
        "ora3": "Oracle E-Business Suite:\n\nWe handle:\n• Upgrades and patches\n• Customization\n• Integrations\n• Support and maintenance\n• Performance optimization\n• Module implementation\n\nOur expertise covers all major Oracle EBS modules. Contact us to receive our capability deck.",
        "ora4": "DBA Services:\n\nWe offer:\n• Remote DBA services\n• Performance tuning\n• 24/7 monitoring\n• Database administration\n• Backup and recovery\n• Security management\n\nOur DBAs ensure optimal database performance and availability. Contact us for a quote.",
        "ora5": "Hire Oracle Consultants:\n\nWe provide experienced:\n• Oracle developers\n• Functional consultants\n• Database administrators (DBAs)\n• Solution architects\n• Cloud specialists\n\nAvailable for contract, contract-to-hire, or full-time roles.\n\nPlease share your requirements and we'll provide qualified profiles within 24-72 hours.",
        "staff1": "Staffing Solutions We Provide:\n\n• Contract staffing\n• Contract-to-hire\n• Full-time direct hiring\n• Project-based staffing\n• Offshore and nearshore resourcing\n\nFlexible engagement models to meet your needs.",
        "staff2": "Skill Sets We Specialize In:\n\n• SAP consultants (all modules)\n• Oracle specialists\n• DevOps engineers\n• Cloud engineers (AWS, Azure, GCP)\n• Java/.NET developers\n• Data engineers\n• QA testers\n• And many more IT roles\n\nWe staff across diverse technologies and platforms.",
        "staff3": "Consultant Deployment Timeline:\n\nDepending on requirements, we can provide:\n• Qualified profiles within 24-72 hours\n• Pre-screened candidates\n• Technical interviews arranged\n• Fast onboarding process\n\nWe maintain a pool of readily available consultants.",
        "staff4": "Background Checks and Screening:\n\nYes! We conduct:\n✓ Technical screening\n✓ Experience verification\n✓ Background checks\n✓ Reference checks\n✓ Skill assessments\n\nAll consultants are thoroughly vetted before deployment.",
        "staff5": "Hire IT Talent:\n\nWe can provide qualified candidates within 24-72 hours.\n\nOur process:\n1. Understand your requirements\n2. Search our talent pool\n3. Screen and interview\n4. Present qualified profiles\n5. Facilitate hiring\n\nShare your requirements to get started.",
        "staff6": "Technologies We Staff:\n\n• SAP (all modules)\n• Oracle (EBS, Cloud, DBA)\n• Cloud (AWS, Azure, GCP)\n• DevOps (Jenkins, Docker, Kubernetes)\n• Programming (Java, .NET, Python)\n• Data Engineering (ETL, Big Data)\n• QA and Testing\n• Business Intelligence\n• And more\n\nContact us to speak with a staffing specialist.",
        "comp1": "Our Services:\n\nWe specialize in three major areas:\n\n1. SAP Consulting\n   • Implementation, support, migration, integration\n\n2. Oracle Services\n   • E-Business Suite, Oracle Cloud, database services\n\n3. IT Staffing\n   • Contract, contract-to-hire, full-time placement\n\nWe help enterprises optimize their IT operations.",
        "comp2": "Our Typical Clients:\n\nWe serve enterprises in:\n• Manufacturing\n• Retail\n• Healthcare\n• Logistics\n• Finance\n• And other industries\n\nOur clients require:\n✓ Advanced ERP solutions\n✓ IT staffing solutions\n✓ Technology consulting",
        "comp3": "Remote and Onsite Consulting:\n\nYes! We provide:\n✓ Onsite consulting\n✓ Hybrid model\n✓ Fully remote consulting\n\nWe adapt to your requirements and preferences for maximum flexibility.",
        "comp4": "International Clients:\n\nYes, we serve clients across multiple geographies including:\n• United States\n• Europe\n• Middle East\n• Asia\n\nOur global presence enables us to support clients worldwide.",
        "comp5": "Business Hours:\n\nOur team is available:\n• Monday - Friday\n• 9 AM - 6 PM (local time)\n• 24/7 support for critical issues\n\nWe accommodate different time zones for global clients.",
        "comp6": "Our Location:\n\nWe're located at:\n# 874, Raineo House, 2nd Floor, Modi Hospital Road, West of Chord Road, Basaveshwaranagar, Bengaluru-560079, INDIA\n\n• Online services available worldwide\n• Remote consulting capabilities\n• Global delivery model\n• Multiple office locations\n\nWe serve clients regardless of location.",
        "eng1": "Request a Proposal or Quote:\n\nYou can contact us through:\n📧 Email us your requirements\n🌐 Website contact form\n💬 Live chat on our website\n\nOur team will respond within 24 hours with a detailed proposal.",
        "eng2": "Service Pricing:\n\nPricing depends on:\n• Project scope\n• Consultant experience level\n• Duration of engagement\n• Technology requirements\n\nWe offer flexible engagement models:\n✓ Fixed price\n✓ Time & material\n✓ Dedicated resource model\n\nContact us for a customized quote.",
        "eng3": "NDAs and Long-term Contracts:\n\nYes. We provide:\n✓ Non-Disclosure Agreements (NDAs)\n✓ Master Service Agreements (MSAs)\n✓ Service Level Agreements (SLAs)\n✓ Long-term contracts\n\nWe follow strict data confidentiality policies and can customize agreements based on your requirements.",
        "eng4": "Payment Terms and Methods:\n\nWe accept:\n• Bank Transfer\n• Wire Transfer\n• Corporate Checks\n\nPayment Terms:\n✓ Net 30 for established clients\n✓ Milestone-based payments for projects\n✓ Monthly billing for ongoing engagements\n✓ Flexible payment schedules available\n\nContact our finance team for specific arrangements.",
        "eng5": "Engagement Models Available:\n\nWe offer multiple engagement options:\n\n1. Fixed Price\n   • Well-defined scope and deliverables\n   • Predictable costs\n\n2. Time & Material\n   • Flexible scope\n   • Pay for actual effort\n\n3. Dedicated Team\n   • Exclusive resources\n   • Long-term engagement\n\n4. Managed Services\n   • End-to-end service delivery\n   • SLA-based support\n\nWe customize based on your needs.",
        "eng6": "Minimum Contract Duration:\n\nOur typical engagement durations:\n\n• Staff Augmentation: 3 months minimum\n• Project-based: Based on scope (typically 3-12 months)\n• Managed Services: 6-12 months minimum\n• Support Contracts: Annual agreements\n\nWe offer flexibility for shorter or longer terms based on client requirements.",
        "sup1": "Post-Implementation Support:\n\nYes! We offer:\n✓ 24/7 support\n✓ Ticket-based support\n✓ Long-term maintenance contracts\n✓ Bug fixes and enhancements\n✓ System monitoring\n✓ Performance optimization\n\nOur support ensures your systems continue to deliver value.",
        "sup2": "Project Delivery Methodology:\n\nOur teams utilize:\n• Agile methodology\n• Waterfall methodology\n• Hybrid approach\n\nWe adapt our methodology based on:\n✓ Client needs\n✓ Project requirements\n✓ Industry best practices\n✓ Timeline constraints",
        "sup3": "Offshore Development Teams:\n\nYes! Our offshore teams offer:\n✓ Multiple time zone coverage\n✓ Cost-effective solutions\n✓ Experienced professionals\n✓ Quality delivery\n✓ Seamless communication\n✓ Scalable resources\n\nWe can augment your team or handle entire projects offshore.",
        "con1": "📧 Email Contact:\n\nFor General Inquiries:\nankitha.g@edcs.co.in\n\nOur team responds within 24 hours during business days."
    }
}

db.collection('chatbot_content').document('main').set(content)
print("Full chatbot content seeded successfully!")
