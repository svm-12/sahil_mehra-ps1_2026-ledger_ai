# KVGAI Week 1 Evaluation Project: AI-Powered Expense Tracker & LedgerAI 🧾🔍

**A full-stack, AI-driven financial analytics platform built for the KVGAI Week 1 Evaluation Project.**

This application goes beyond simple expense tracking. It allows users to upload unstructured invoice data, extracts structured intelligence using Google's Gemini 2.5 Flash, automatically flags recurring subscriptions, tracks monthly budget goals, and even utilizes live Google Search Grounding to act as an "AI Cost Savings Analyst" finding cheaper alternatives online.

---

## 🚀 Live Demo
- **Frontend URL:** *(https://frontend-production-ce76.up.railway.app/)*
- **Backend API Docs:** *(https://backend-production-5fd2.up.railway.app/docs)*
- **Demo Video (Loom):** *(Add your Loom link here)*

---

## ✨ Features Built in 3 Days

### Core Platform
* **Real GenAI Structured Extraction**: Leverages the Gemini API's strict JSON `response_schema` feature to instantly extract structured data from chaotic unstructured text or document images.
* **Math Auditing & Verification**: Automatically calculates line-item math and cross-checks it against the receipt's listed total, flagging any mathematical discrepancies instantly.
* **Deep OCR Search**: A global search bar connected to the SQL database that instantly filters records based on vendor names, categories, or raw extracted text.
* **Professional PDF Export**: One-click generation of beautifully formatted, landscape-oriented PDF reports detailing all transactions, summary statistics, and AI confidence scores.

### Financial Analytics & Automation
* **AI Cost Savings Analyst (Web Grounded)**: Scans purchased items and utilizes Gemini's live **Google Search Grounding** to search the live web for cheaper alternatives, providing actionable cost-saving advice.
* **Dynamic Budget Goals**: Set monthly limits for custom categories (e.g., Groceries: ₹10,000) and track real-time spending via animated progress bars that shift from green to red based on budget health.
* **Subscription Detector**: The AI intelligently identifies recurring SaaS patterns, software subscriptions, or ongoing payments (Netflix, AWS, Rent) and flags them with a visual "Subscription" badge.

---

## 🛠️ Tech Stack & Architecture
This project perfectly aligns with the required tech stack for the KVGAI cohort.

* **Backend**: Python 3.11, FastAPI, SQLAlchemy
* **Database**: SQLite (Local Dev) / PostgreSQL (Production)
* **AI Orchestration**: Google GenAI SDK (`gemini-2.5-flash`)
* **Frontend**: React, TypeScript, Vite, TailwindCSS, Recharts
* **Deployment**: Railway

---

## 📂 Project Structure

```text
invoice-audit-trail/
├── backend/            # FastAPI Python backend
│   ├── database.py     # SQLAlchemy DB connection (Dynamic SQLite/Postgres)
│   ├── models.py       # ORM models (Document, BudgetGoal)
│   ├── schemas.py      # Pydantic validation & LLM schemas
│   ├── gemini_service.py # Google Generative AI integration (Extraction & Search)
│   ├── main.py         # Application endpoints & database migrations
│   └── requirements.txt
├── frontend/           # Vite + React TypeScript frontend
│   ├── src/App.tsx     # Main application UI, routing, and state
│   ├── src/index.css   # Tailwind configuration and custom styling
│   └── package.json
└── README.md
```

---

## ⚙️ How to Run Locally

### 1. Backend Setup

1. Navigate to `/backend`:
   ```bash
   cd backend
   ```
2. Create and activate a virtual environment:
   ```bash
   python -m venv venv
   # On Windows:
   .\venv\Scripts\activate
   # On macOS/Linux:
   source venv/bin/activate
   ```
3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Create a `.env` file and enter your Gemini API key:
   ```env
   GEMINI_API_KEY=your_api_key_here
   ```
5. Run the FastAPI development server:
   ```bash
   uvicorn main:app --reload
   ```
   The backend docs will be live at `http://localhost:8000/docs`.

### 2. Frontend Setup

1. Navigate to `/frontend`:
   ```bash
   cd frontend
   ```
2. Install npm packages:
   ```bash
   npm install
   ```
3. Start the Vite React development server:
   ```bash
   npm run dev
   ```
   Open `http://localhost:5173` in your browser.

> **Testing Tip**: Once running locally, go to the Analytics Dashboard and click **"Seed Test Data"** to instantly inject 10 diverse records into the database for immediate testing!
