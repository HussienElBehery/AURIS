#!/usr/bin/env python3
"""
Database initialization script for AURIS.
Supports both SQLite (default) and PostgreSQL.
"""

import os
import sys
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

def setup_postgresql():
    """Set up PostgreSQL database (optional for production)."""
    print("🗄️  Setting up PostgreSQL database...")
    
    try:
        import psycopg2
        from psycopg2.extensions import ISOLATION_LEVEL_AUTOCOMMIT
    except ImportError:
        print("❌ psycopg2 not installed. Install with: pip install psycopg2-binary")
        return False
    
    # Get PostgreSQL credentials from environment or prompt user
    host = os.getenv("POSTGRES_HOST", "localhost")
    port = os.getenv("POSTGRES_PORT", "5432")
    user = os.getenv("POSTGRES_USER", "postgres")
    password = os.getenv("POSTGRES_PASSWORD")
    
    if not password:
        print("🔐 PostgreSQL password not found in environment variables.")
        password = input("Enter your PostgreSQL password: ")
    
    try:
        # Connect to PostgreSQL server
        conn = psycopg2.connect(
            host=host,
            port=port,
            user=user,
            password=password
        )
        conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
        cursor = conn.cursor()
        
        # Check if database exists
        cursor.execute("SELECT 1 FROM pg_catalog.pg_database WHERE datname = 'auris_db'")
        exists = cursor.fetchone()
        
        if not exists:
            cursor.execute("CREATE DATABASE auris_db")
            print("✅ Database 'auris_db' created successfully!")
        else:
            print("✅ Database 'auris_db' already exists!")
        
        cursor.close()
        conn.close()
        
        # Update .env file with PostgreSQL URL
        env_file = Path(".env")
        if env_file.exists():
            with open(env_file, 'r') as f:
                content = f.read()
            
            # Replace SQLite URL with PostgreSQL URL
            postgres_url = f"postgresql://{user}:{password}@{host}:{port}/auris_db"
            content = content.replace(
                "DATABASE_URL=sqlite:///./auris.db",
                f"DATABASE_URL={postgres_url}"
            )
            
            with open(env_file, 'w') as f:
                f.write(content)
            
            print("✅ Updated .env file with PostgreSQL URL")
        
        return True
        
    except Exception as e:
        print(f"❌ Failed to setup PostgreSQL: {e}")
        print("💡 Make sure PostgreSQL is running and credentials are correct")
        return False

def create_tables():
    """Create database tables using the configured database."""
    print("📋 Creating database tables...")
    
    try:
        from app.database import engine
        from app.models import Base
        
        # Create all tables
        Base.metadata.create_all(bind=engine)
        print("✅ Database tables created successfully!")
        
        return True
    except Exception as e:
        print(f"❌ Failed to create tables: {e}")
        return False

def main():
    """Main function to setup database."""
    print("🔧 AURIS Database Setup")
    print("=" * 40)
    
    print("🐘 Using PostgreSQL database")
    if not setup_postgresql():
        print("\n❌ Database setup failed!")
        sys.exit(1)
    else:
        print("\n🎉 Database setup completed successfully!")
        print("\nNext steps:")
        print("1. Start the backend server: uvicorn app.main:app --reload --port 3001")
        print("2. Start the frontend: npm run dev")
        print("3. Access the application at http://localhost:5173")

if __name__ == "__main__":
    main() 