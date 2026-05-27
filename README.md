# Invoice Extractor Audit Trail 🧾🔍

An enterprise-grade, full-stack GenAI application demonstrating a human-in-the-loop audit workflow. Messy, unstructured invoice or receipt text is sent to the Gemini API, structured dynamically using Pydantic schemas, stored in a local SQLite database, and presented in a polished split-screen React dashboard for visual comparison, verification, editing, and approval.

## 🚀 Key Features

*   **Real GenAI Structured Extraction**: Leverages the actual Gemini API's `response_schema` feature to extract structured JSON from chaotic unstructured text.
*   **Confidence & Rationale Metrics**: Captures the model's self-assessed extraction confidence score (0-100) and rationale, which is displayed as a color-coded status badge with interactive tooltips.
*   **Split-Screen Workspace**: Displays the messy raw input text on the left, side-by-side with an editable audit form on the right.
*   **Modern Premium Dashboard**: Sleek, slate-gray aesthetic, live document counts (Pending Review, Audited), smooth loader scanner animation, and intuitive controls.

## 🛠️ Tech Stack

*   **Backend**: FastAPI, SQLAlchemy (SQLite database), Pydantic
*   **AI Orchestration**: Google GenAI Python SDK (`google-generativeai`)
*   **Frontend**: React, TypeScript, Vite, TailwindCSS
*   **Icons**: Lucide React

## 📂 Project Structure

```text
invoice-audit-trail/
├── backend/            # FastAPI python backend
│   ├── database.py     # SQLite DB connection
│   ├── models.py       # SQLAlchemy ORM models
│   ├── schemas.py      # Pydantic validation & LLM response schemas
│   ├── gemini_service.py # Google Generative AI integration service
│   ├── main.py         # Application entrypoint & routes
│   └── requirements.txt
├── frontend/           # Vite + React TypeScript frontend
└── README.md
```

## ⚙️ Local Setup

### Backend Setup

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
4. Create a `.env` file from the template and enter your Gemini API key:
   ```env
   DATABASE_URL=sqlite:///./invoices.db
   GEMINI_API_KEY=AIzaSyYourGeminiApiKeyHere
   ```
5. Run the FastAPI development server:
   ```bash
   uvicorn main:app --reload
   ```
   The backend docs will be live at `http://localhost:8000/docs`.

### Frontend Setup

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
