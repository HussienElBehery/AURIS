#!/usr/bin/env python3
"""
Backend setup script for AURIS.
This script helps set up the backend environment and configuration.
"""

import os
import shutil
from pathlib import Path

def setup_backend():
    """Set up the backend environment."""
    print("🔧 Setting up AURIS Backend...")
    
    # Check if .env exists, if not create from example
    env_file = Path(".env")
    env_example = Path("env.example")
    
    if not env_file.exists() and env_example.exists():
        print("📝 Creating .env file from example...")
        shutil.copy(env_example, env_file)
        print("✅ .env file created successfully!")
    elif env_file.exists():
        print("✅ .env file already exists")
    else:
        print("❌ env.example not found!")
        return False
    
    # Create database directory
    db_dir = Path(".")
    db_dir.mkdir(exist_ok=True)
    
    # Initialize database
    try:
        print("🗄️  Initializing database...")
        os.system("python init_db.py")
        print("✅ Database initialized successfully!")
    except Exception as e:
        print(f"⚠️  Database initialization failed: {e}")
        print("   You can run 'python init_db.py' manually later")
    
    print("\n🎉 Backend setup completed!")
    print("\nNext steps:")
    print("1. Start the backend server: uvicorn app.main:app --reload --port 3001")
    print("2. Start the frontend: npm run dev")
    print("3. Access the application at http://localhost:5173")
    
    return True

if __name__ == "__main__":
    setup_backend() 