<!--
===============================================================================
FILE PURPOSE:
Root README for the Gita-Bhojanalay Hostel Food Management System.
Provides high-level project overview, system architecture description, setup instructions,
and links to frontend, backend, and documentation resources.

CONNECTED FILES & FOLDERS:
- Connected to: backend/ (FastAPI application API)
- Connected to: frontend/ (React Vite web application)
- Connected to: docs/db_schema.md (Database entity relationship details)
- Connected to: .gitignore (Root workspace version control rules)
===============================================================================
-->

# Gita-Bhojanalay Hostel Food Management System

Welcome to the **Gita-Bhojanalay Hostel Food Management System**, a comprehensive solution designed to streamline the food management process in hostels. It allows students to manage their weekend food preferences and enables administrators to manage the menu and track food requirements efficiently.

## 🚀 Features

- **Role-Based Access**: Dedicated portals for both Students and Administrators.
- **Menu Management**: Admins can easily add, update, and manage daily and weekly menus.
- **Weekend Preferences**: Students can select their food preferences specifically for Saturday and Sunday to avoid food wastage and ensure choices are met.
- **Dashboard & Analytics**: Admins get an overview of student preferences and headcounts.

## 🔄 User Flow

### 👨‍🎓 Student Flow
1. **Registration / Login**: Students log into the portal using their hostel credentials.
2. **Dashboard**: The student views the upcoming week's menu.
3. **Preference Selection**: Before a set deadline (e.g., Thursday), students select their meal preferences (e.g., veg/non-veg, or skip) for Saturday and Sunday.
4. **Confirmation**: Preferences are saved and a confirmation is provided.

### 👨‍💼 Admin Flow
1. **Login**: Administrators log in to the admin dashboard.
2. **Menu Management**: Admins update the weekly menu items for the hostel.
3. **Review Preferences**: Admins view the aggregated student food preferences for the upcoming weekend.
4. **Operations**: Admins use the headcounts to plan inventory and kitchen preparations.

## 🛠️ Technology Stack

- **Frontend**: React (Vite)
- **Backend**: FastAPI (Python)
- **Database**: Relational DB with Alembic for migrations

## ⚙️ Setup Instructions

### 1. Clone the repository
```bash
git clone <repository_url>
cd Bhojnalay
```

### 2. Backend Setup (FastAPI)
```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows use: venv\Scripts\activate
pip install -r requirements.txt
alembic upgrade head      # Run migrations
uvicorn app.main:app --reload
```
The backend will run on `http://localhost:8000`.

### 3. Frontend Setup (React Vite)
```bash
cd frontend
npm install
npm run dev
```
The frontend will run on `http://localhost:5173`.

## 📚 Documentation
For detailed database schemas and models, please refer to the `docs/db_schema.md` file.
