# Self-Healing Agent

A comprehensive system demonstrating a self-healing agent architecture. This project consists of a central Agent Dashboard, a Simulated E-commerce Store, and a Python-based Backend powered by Groq.

## 🏗 Architecture

The system is composed of three main components:

1.  **Frontend (Agent Dashboard)**: A Next.js application where you can monitor the agent's activities, view logs, and intervene if necessary.
    -   **Port**: `3000`
2.  **Simulated Store**: A separate Next.js application representing an e-commerce platform that the agent interacts with (navigating, purchasing, etc.).
    -   **Port**: `3001`
3.  **Backend**: A FastAPI (Python) server that hosts the intelligent agent, handles state, and communicates with the Groq API to make decisions.
    -   **Port**: `8000`

## 🚀 Prerequisites

Ensure you have the following installed on your system:

-   **Python 3.8+**
-   **Node.js 18+** & **npm**
-   **MongoDB** (Ensure it is running locally on default port `27017`)

## 🛠 Installation

### 1. Backend Setup

Navigate to the backend directory and install dependencies:

```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

**Configuration:**
Create a `.env` file in the `backend/` directory based on the example:

```bash
cp .env.example .env
```

Open `.env` and add your configuration:
-   `GROQ_API_KEY`: Your Groq API key.
-   `MONGODB_URI`: Your MongoDB connection string (default: `mongodb://localhost:27017/self_healing_agent`).

### 2. Frontend Setup

Install dependencies for the dashboard:

```bash
cd frontend
npm install
```

### 3. Simulated Store Setup

Install dependencies for the store:

```bash
cd simulated-store
npm install
```

## 🏃 Usage

The easiest way to start all services is using the provided script in the root directory:

```bash
./start_all.sh
```

This script will:
-   Kill any existing processes on ports 3000, 3001, and 8000.
-   Start the Backend server.
-   Start the Frontend dashboard.
-   Start the Simulated Store.
-   Stream logs to `backend.log`, `frontend.log`, and `store.log` in the root directory.

**Access the services:**
-   **Agent Dashboard**: [http://localhost:3000](http://localhost:3000)
-   **Simulated Store**: [http://localhost:3001](http://localhost:3001)
-   **Backend API Docs**: [http://localhost:8000/docs](http://localhost:8000/docs)

### Manual Startup

If you prefer to run services individually:

**Backend:**
```bash
cd backend
source venv/bin/activate
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

**Frontend:**
```bash
cd frontend
npm run dev -- -p 3000
```

**Simulated Store:**
```bash
cd simulated-store
npm run dev -- -p 3001
```

## 🧠 Project Structure

-   `backend/`: FastAPI application, agent logic (`agent/`), database models (`models/`), and services.
-   `frontend/`: Agent Dashboard UI (Next.js).
-   `simulated-store/`: Mock E-commerce site for reliability testing (Next.js).
-   `start_all.sh`: Helper script to launch the entire stack.
