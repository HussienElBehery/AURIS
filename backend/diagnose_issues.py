#!/usr/bin/env python3
"""
Diagnostic script for AURIS issues.
This script helps identify what's causing the database and model problems.
"""

import os
import sys
from pathlib import Path
from dotenv import load_dotenv

def check_environment():
    """Check environment variables and configuration."""
    print("🔍 Environment Check")
    print("=" * 30)
    
    # Check for .env files
    root_env = Path("../../.env")
    backend_env = Path(".env")
    
    print(f"Root .env exists: {root_env.exists()}")
    print(f"Backend .env exists: {backend_env.exists()}")
    
    # Load environment
    load_dotenv(root_env)
    load_dotenv(backend_env)
    
    # Check database configuration
    database_url = os.getenv("DATABASE_URL", "sqlite:///./auris.db")
    database_type = os.getenv("DATABASE_TYPE", "sqlite")
    
    print(f"Database URL: {database_url}")
    print(f"Database Type: {database_type}")
    
    # Check if it's PostgreSQL
    if "postgresql" in database_url.lower():
        print("🐘 PostgreSQL detected!")
        print("   This explains why SQLite check failed but login works!")
    else:
        print("💾 SQLite detected")
    
    return database_url, database_type

def check_database_files():
    """Check for database files."""
    print("\n📁 Database Files Check")
    print("=" * 30)
    
    # Check for SQLite file
    sqlite_file = Path("auris.db")
    if sqlite_file.exists():
        size = sqlite_file.stat().st_size
        print(f"✅ SQLite file exists: {sqlite_file} ({size} bytes)")
    else:
        print("❌ SQLite file not found")
    
    # Check for PostgreSQL connection
    try:
        import psycopg2
        print("✅ psycopg2 available")
    except ImportError:
        print("❌ psycopg2 not installed")

def check_model_files():
    """Check model files and directories."""
    print("\n🤖 Model Files Check")
    print("=" * 30)
    
    models_dir = Path("../../models")
    print(f"Models directory: {models_dir}")
    print(f"Models directory exists: {models_dir.exists()}")
    
    if models_dir.exists():
        for item in models_dir.iterdir():
            if item.is_dir():
                print(f"📁 {item.name}/")
                # Check for key files
                key_files = ["adapter_config.json", "adapter_model.safetensors", "tokenizer.json"]
                for file in key_files:
                    if (item / file).exists():
                        print(f"   ✅ {file}")
                    else:
                        print(f"   ❌ {file}")

def check_app_config():
    """Check the actual app configuration."""
    print("\n⚙️  App Configuration Check")
    print("=" * 30)
    
    try:
        from app.config import settings
        print(f"Database URL from app: {settings.DATABASE_URL}")
        print(f"Debug mode: {settings.DEBUG}")
        print(f"CORS origins: {settings.CORS_ORIGINS}")
    except Exception as e:
        print(f"❌ Failed to load app config: {e}")

def check_database_connection():
    """Test actual database connection."""
    print("\n🔌 Database Connection Test")
    print("=" * 30)
    
    try:
        from app.database import engine
        from app.models import Base
        
        # Test connection
        with engine.connect() as conn:
            print("✅ Database connection successful!")
            
            # Check tables
            inspector = engine.dialect.inspector(engine)
            tables = inspector.get_table_names()
            print(f"📋 Tables found: {len(tables)}")
            for table in tables:
                print(f"   - {table}")
                
    except Exception as e:
        print(f"❌ Database connection failed: {e}")

def check_model_manager():
    """Check model manager status."""
    print("\n🧠 Model Manager Check")
    print("=" * 30)
    
    try:
        from app.services.model_manager import model_manager
        
        status = model_manager.get_model_status()
        print(f"Total models: {status['total_required']}")
        print(f"Installed models: {status['total_installed']}")
        print(f"System ready: {status['system_ready']}")
        
        for model_key, model_info in status['models'].items():
            print(f"   {model_key}: {'✅' if model_info['installed'] else '❌'} ({model_info['size_gb']}GB)")
            
    except Exception as e:
        print(f"❌ Model manager check failed: {e}")

def main():
    """Main diagnostic function."""
    print("🔧 AURIS Issue Diagnostic")
    print("=" * 50)
    
    # Run all checks
    database_url, database_type = check_environment()
    check_database_files()
    check_model_files()
    check_app_config()
    check_database_connection()
    check_model_manager()
    
    print("\n📋 Summary & Recommendations")
    print("=" * 50)
    
    if "postgresql" in database_url.lower():
        print("🎯 You're using PostgreSQL, not SQLite!")
        print("   - This explains why SQLite check failed")
        print("   - Login works because PostgreSQL is working")
        print("   - The check_db.py script was looking for SQLite file")
        
        print("\n💡 To fix the database check:")
        print("   1. Set DATABASE_TYPE=postgresql in your .env file")
        print("   2. Or run: python check_db.py (it will detect PostgreSQL)")
        
    else:
        print("🎯 You're using SQLite")
        print("   - Need to run: python setup_backend.py")
        print("   - This will create the auris.db file")
    
    print("\n🔧 For model installation issues:")
    print("   1. Check if you have enough disk space")
    print("   2. Check if you have a stable internet connection")
    print("   3. Try running: python test_model_implementation.py")

if __name__ == "__main__":
    main() 