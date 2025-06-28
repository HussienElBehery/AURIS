# AURIS Backend - FastAPI + PostgreSQL

A FastAPI backend for the AURIS Customer Service Evaluation System with PostgreSQL database and JWT authentication.

## 🚀 Features

- **FastAPI** - Modern, fast web framework
- **PostgreSQL** - Robust relational database
- **SQLAlchemy** - Database ORM
- **JWT Authentication** - Secure token-based auth
- **Password Hashing** - bcrypt encryption
- **CORS Support** - Cross-origin requests
- **Pydantic Validation** - Request/response validation

## 📋 Prerequisites

- Python 3.8+
- PostgreSQL 12+
- pgAdmin 4 (for database management)

## 🛠️ Setup Instructions

### 1. PostgreSQL Setup

#### Using pgAdmin 4:

1. Open pgAdmin 4
2. Right-click on "Databases" → "Create" → "Database"
3. Name: `auris_db`
4. Click "Save"

#### Using Command Line:

```bash
# Connect to PostgreSQL
psql -U postgres

# Create database
CREATE DATABASE auris_db;

# Create user (optional)
CREATE USER auris_user WITH PASSWORD 'auris_password';
GRANT ALL PRIVILEGES ON DATABASE auris_db TO auris_user;

# Exit
\q
```

#### Using the provided script:

```bash
# Edit init_db.py with your PostgreSQL password
python init_db.py
```

### 2. Backend Setup

1. **Navigate to backend directory:**

   ```bash
   cd backend
   ```

2. **Create virtual environment:**

   ```bash
   python -m venv venv

   # Windows
   venv\Scripts\activate

   # macOS/Linux
   source venv/bin/activate
   ```

3. **Install dependencies:**

   ```bash
   pip install -r requirements.txt
   ```

4. **Create environment file:**

   ```bash
   cp env.example .env
   ```

5. **Update .env file:**

   ```env
   DATABASE_URL=postgresql://auris_user:auris_password@localhost:5432/auris_db
   SECRET_KEY=your-super-secret-key-here-make-it-long-and-secure
   ALGORITHM=HS256
   ACCESS_TOKEN_EXPIRE_MINUTES=30
   REFRESH_TOKEN_EXPIRE_DAYS=7
   DEBUG=True
   ```

6. **Run the application:**
   ```bash
   uvicorn app.main:app --reload --host 0.0.0.0 --port 3001
   ```

## 📊 Database Schema

### Users Table

```sql
CREATE TABLE users (
    id VARCHAR PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    hashed_password VARCHAR(255) NOT NULL,
    role VARCHAR(10) NOT NULL DEFAULT 'agent',
    avatar VARCHAR(500),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Refresh Tokens Table

```sql
CREATE TABLE refresh_tokens (
    id VARCHAR PRIMARY KEY,
    user_id VARCHAR NOT NULL,
    token TEXT UNIQUE NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## 🔌 API Endpoints

### Authentication

- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - User login
- `POST /api/auth/refresh` - Refresh access token
- `POST /api/auth/logout` - User logout
- `GET /api/auth/me` - Get current user info

### Health Check

- `GET /` - API welcome message
- `GET /health` - Health check

## 🔐 Authentication Flow

1. **Register/Login** → Get access_token + refresh_token
2. **API Calls** → Include `Authorization: Bearer <access_token>`
3. **Token Expiry** → Use refresh_token to get new access_token
4. **Logout** → Invalidate refresh_token

## 📝 Example Usage

### Register a new user:

```bash
curl -X POST "http://localhost:3001/api/auth/register" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Doe",
    "email": "john@example.com",
    "password": "SecurePass123",
    "role": "agent"
  }'
```

### Login:

```bash
curl -X POST "http://localhost:3001/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@example.com",
    "password": "SecurePass123"
  }'
```

### Get user info (with token):

```bash
curl -X GET "http://localhost:3001/api/auth/me" \
  -H "Authorization: Bearer <your_access_token>"
```

## 🧪 Testing

### Using the API Documentation:

1. Open your browser to `http://localhost:3001/docs`
2. Interactive API documentation (Swagger UI)
3. Test endpoints directly from the browser

### Using curl:

```bash
# Test health endpoint
curl http://localhost:3001/health

# Test root endpoint
curl http://localhost:3001/
```

## 🔧 Development

### Project Structure:

```
backend/
├── app/
│   ├── __init__.py
│   ├── main.py              # FastAPI application
│   ├── config.py            # Configuration settings
│   ├── database.py          # Database connection
│   ├── models.py            # SQLAlchemy models
│   ├── schemas.py           # Pydantic schemas
│   ├── auth.py              # Authentication utilities
│   ├── dependencies.py      # FastAPI dependencies
│   └── routers/
│       ├── __init__.py
│       └── auth.py          # Authentication routes
├── requirements.txt         # Python dependencies
├── env.example             # Environment variables template
├── init_db.py              # Database initialization script
└── README.md               # This file
```

### Adding New Routes:

1. Create new router file in `app/routers/`
2. Define routes with proper schemas
3. Add router to `app/main.py`
4. Update this README

## 🚨 Troubleshooting

### Common Issues:

1. **Database Connection Error:**

   - Check PostgreSQL is running
   - Verify DATABASE_URL in .env
   - Ensure database exists

2. **Import Errors:**

   - Activate virtual environment
   - Install requirements: `pip install -r requirements.txt`

3. **Port Already in Use:**

   - Change port in uvicorn command
   - Kill existing process

4. **CORS Errors:**
   - Update CORS_ORIGINS in .env
   - Check frontend URL

## 📚 Additional Resources

- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [SQLAlchemy Documentation](https://docs.sqlalchemy.org/)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [JWT Documentation](https://jwt.io/)

## 🤝 Contributing

1. Follow the existing code structure
2. Add proper error handling
3. Include type hints
4. Update documentation
5. Test your changes
