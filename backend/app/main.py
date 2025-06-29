from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .routers import auth, chat_logs, models
from .database import engine
from .models import Base
from .config import settings

# Create database tables
Base.metadata.create_all(bind=engine)

# Create FastAPI app
app = FastAPI(
    title=settings.APP_NAME,
    description="AURIS Customer Service Evaluation System API",
    version="1.0.0",
    debug=settings.DEBUG
)

# Add CORS middleware with more comprehensive configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allow_headers=[
        "Accept",
        "Accept-Language",
        "Content-Language",
        "Content-Type",
        "Authorization",
        "X-Requested-With",
        "Origin",
        "Access-Control-Request-Method",
        "Access-Control-Request-Headers",
    ],
    expose_headers=["*"],
    max_age=86400,  # Cache preflight requests for 24 hours
)

# Include routers
app.include_router(auth.router, prefix="/api")
app.include_router(chat_logs.router, prefix="/api")
app.include_router(models.router)

@app.get("/")
def read_root():
    return {"message": "Welcome to AURIS API", "version": "1.0.0"}

@app.get("/health")
def health_check():
    return {"status": "healthy"}

@app.get("/cors-test")
def cors_test():
    """Test endpoint to verify CORS is working."""
    return {
        "message": "CORS test successful",
        "cors_origins": settings.CORS_ORIGINS,
        "timestamp": "2024-01-01T00:00:00Z"
    }

@app.options("/cors-test")
def cors_test_options():
    """Handle OPTIONS request for CORS test."""
    return {"message": "CORS preflight successful"} 