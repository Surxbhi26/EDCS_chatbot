\# EDCS Chatbot



A chatbot application for EDCS with email integration and Firebase backend.



\## Setup Instructions



\### Prerequisites

\- Python 3.x installed

\- Node.js and npm installed

\- Firebase account



\### Installation



1\. \*\*Clone the repository\*\*

```bash

&nbsp;  git clone https://github.com/Surxbhi26/EDCS\_chatbot.git

&nbsp;  cd EDCS\_chatbot

```



2\. \*\*Backend Setup\*\*

```bash

&nbsp;  cd backend

&nbsp;  

&nbsp;  # Create virtual environment

&nbsp;  python -m venv venv

&nbsp;  

&nbsp;  # Activate virtual environment

&nbsp;  # On Windows:

&nbsp;  venv\\Scripts\\activate

&nbsp;  # On Mac/Linux:

&nbsp;  source venv/bin/activate

&nbsp;  

&nbsp;  # Install dependencies

&nbsp;  pip install flask firebase-admin flask-cors

&nbsp;  

&nbsp;  # Create .env file

&nbsp;  # Ask the team lead for the .env file contents

&nbsp;  

&nbsp;  # Add your firebase-key.json file

&nbsp;  # Ask the team lead for the Firebase credentials

&nbsp;  

&nbsp;  # Run the backend

&nbsp;  python app.py

```



3\. \*\*Frontend Setup\*\*

```bash

&nbsp;  cd ../edcs-chatbot

&nbsp;  

&nbsp;  # Install dependencies

&nbsp;  npm install

&nbsp;  

&nbsp;  # Run the frontend

&nbsp;  npm start

```



4\. \*\*Access the Application\*\*

&nbsp;  - Frontend: http://localhost:3000

&nbsp;  - Backend: http://localhost:5000



\## Important Files (NOT in repository)

These files contain sensitive information and must be obtained separately:

\- `backend/.env` - Environment variables

\- `backend/firebase-key.json` - Firebase credentials



Contact the team lead to get these files.



\## Project Structure

```

├── backend/              # Flask backend

│   ├── app.py           # Main application

│   ├── database.py      # Database operations

│   ├── email\_service.py # Email functionality

│   └── ...

└── edcs-chatbot/        # React frontend

&nbsp;   ├── src/

&nbsp;   └── public/

```



\## Team

\- \[Your Name] - Project Lead

\- \[Friend 1 Name]

\- \[Friend 2 Name]

