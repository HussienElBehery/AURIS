#!/usr/bin/env python3
"""
Database connection checker for AURIS.
Checks both SQLite and PostgreSQL connections.
"""

import os
import sys
from pathlib import Path
from dotenv import load_dotenv
from sqlalchemy import inspect

# Load environment variables
load_dotenv()

def check_sqlite():
    """Check SQLite database status."""
    print("💾 Checking SQLite database...")
    
    # Check if SQLite file exists
    sqlite_file = Path("auris.db")
    if not sqlite_file.exists():
        print("❌ SQLite database file not found")
        print("💡 Run: python setup_backend.py")
        return False
    
    # Check file size
    size = sqlite_file.stat().st_size
    print(f"✅ SQLite file exists: {size} bytes")
    
    # Try to connect
    try:
        import sqlite3
        conn = sqlite3.connect("auris.db")
        cursor = conn.cursor()
        
        # Check tables
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
        tables = cursor.fetchall()
        
        print(f"✅ Connected to SQLite database")
        print(f"📋 Tables found: {len(tables)}")
        for table in tables:
            print(f"   - {table[0]}")
        
        conn.close()
        return True
        
    except Exception as e:
        print(f"❌ Failed to connect to SQLite: {e}")
        return False

def check_postgresql():
    """Check PostgreSQL database status."""
    print("🐘 Checking PostgreSQL database...")
    
    # Get database URL from environment
    database_url = os.getenv("DATABASE_URL")
    
    if not database_url or "postgresql" not in database_url.lower():
        print("❌ PostgreSQL URL not configured")
        return False
    
    print(f"🔗 Database URL: {database_url}")
    
    # Try to connect
    try:
        import psycopg2
        from urllib.parse import urlparse
        
        # Parse the URL
        parsed = urlparse(database_url)
        host = parsed.hostname
        port = parsed.port or 5432
        database = parsed.path[1:]  # Remove leading slash
        username = parsed.username
        password = parsed.password
        
        print(f"🔌 Connecting to {host}:{port}/{database} as {username}...")
        
        # Connect to PostgreSQL
        conn = psycopg2.connect(
            host=host,
            port=port,
            database=database,
            user=username,
            password=password
        )
        
        cursor = conn.cursor()
        
        # Check tables
        cursor.execute("""
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public'
        """)
        tables = cursor.fetchall()
        
        print(f"✅ Connected to PostgreSQL: {host}:{port}")
        print(f"📋 Tables found: {len(tables)}")
        for table in tables:
            print(f"   - {table[0]}")
        
        conn.close()
        return True
        
    except ImportError:
        print("❌ psycopg2 not installed")
        print("💡 Install with: pip install psycopg2-binary")
        return False
    except Exception as e:
        print(f"❌ Failed to connect to PostgreSQL: {e}")
        print("💡 Make sure PostgreSQL is running and credentials are correct")
        return False

def auto_detect_database():
    """Auto-detect which database is being used."""
    database_url = os.getenv("DATABASE_URL", "sqlite:///./auris.db")
    
    if "postgresql" in database_url.lower():
        print("🔍 Auto-detected: PostgreSQL")
        return "postgresql"
    else:
        print("🔍 Auto-detected: SQLite")
        return "sqlite"

def print_recommendations_schema(engine):
    inspector = inspect(engine)
    columns = inspector.get_columns('recommendations')
    print('Schema for recommendations table:')
    for col in columns:
        print(f"  {col['name']} ({col['type']})")

def print_all_table_schemas(engine):
    inspector = inspect(engine)
    tables = inspector.get_table_names()
    for table in tables:
        print(f'Schema for {table} table:')
        columns = inspector.get_columns(table)
        for col in columns:
            print(f"  {col['name']} ({col['type']})")
        print()

def main():
    """Main function."""
    print("🔍 AURIS Database Check")
    print("=" * 30)
    
    # Auto-detect database type
    db_type = auto_detect_database()
    
    if db_type == "postgresql":
        success = check_postgresql()
    else:
        success = check_sqlite()
    
    print("\n" + "=" * 30)
    if success:
        print("✅ Database check passed!")
        print("🎉 Your database is working correctly")
    else:
        print("❌ Database check failed!")
        print("🔧 Please check the issues above and try again")
    
    return success

if __name__ == "__main__":
    from app.database import engine
    print_all_table_schemas(engine)
    success = main()
    sys.exit(0 if success else 1) 