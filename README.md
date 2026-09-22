# LearnLoop Backend

Backend API for LearnLoop, an explainable closed-loop learning intelligence platform.

## Tech Stack

- Python
- Flask
- MySQL (8.0+)
- SQLAlchemy
- Flask-Migrate
- Flask-CORS
- Python dotenv
- Pytest

## Backend Location

This README applies to the `backend` folder.

Run all backend commands from:

```text
LearnLoop/backend
```

## Project Setup

### 1. Create and activate a virtual environment

Windows PowerShell:

```powershell
python -m venv venv
.\venv\Scripts\Activate.ps1
```

Windows Command Prompt:

```bat
python -m venv venv
venv\Scripts\activate
```

macOS/Linux:

```bash
python3 -m venv venv
source venv/bin/activate
```

### 2. Install dependencies

```powershell
pip install -r requirements.txt
```

### 3. Configure environment variables

Copy the environment template:

Windows PowerShell:

```powershell
Copy-Item .env.example .env
```

macOS/Linux:

```bash
cp .env.example .env
```

Update the private `.env` file with:

- `DATABASE_URL`
- `SECRET_KEY`
- `JWT_SECRET_KEY`
- `FRONTEND_URL`

Example database URL structure for MySQL:

```env
DATABASE_URL=mysql+pymysql://root:YOUR_URL_ENCODED_PASSWORD@127.0.0.1:3306/learnloop_db
```

Never commit `.env` or real credentials.

### 4. Set up MySQL

Install MySQL Server 8.0+ locally and ensure the database service is running.

Create the development database:

```sql
CREATE DATABASE learnloop_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

The default local connection uses:

```text
Host: 127.0.0.1
Port: 3306
User: root
Database: learnloop_db
```

### 5. Initialize migrations

Only run this once for a fresh repository that does not already have a `migrations/` folder:

```powershell
python -m flask --app run.py db init
```

For normal development, create and apply migrations with:

```powershell
python -m flask --app run.py db migrate -m "Describe schema change"
python -m flask --app run.py db upgrade
```

### 6. Seed the demonstration dataset

Seed the synthetic Class 9 Mathematics pilot dataset:

```powershell
python -m flask --app run.py seed-demo
```

To remove the synthetic demo dataset:

```powershell
python -m flask --app run.py reset-demo --confirm
```

### 7. Run the backend

```powershell
python run.py
```

The backend starts at:

```text
http://127.0.0.1:5000
```

## Health Check

```text
GET /api/health
```

Open:

```text
http://127.0.0.1:5000/api/health
```

Expected response:

```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "service": "LearnLoop API",
    "database": "connected"
  },
  "message": "Backend and database are running",
  "errors": []
}
```

## Run Tests

Activate the virtual environment, then run:

```powershell
pytest
```

## Security Rules

- Never commit `.env`.
- Never commit database passwords, JWT secrets, or API keys.
- Commit `.env.example` with placeholders only.
- Use pseudonymous student data for public demonstrations.
- Do not use wildcard CORS in production.
- Restrict production CORS to the approved frontend domain.