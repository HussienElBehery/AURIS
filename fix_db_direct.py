#!/usr/bin/env python3
"""
Fix database schema directly using psycopg2.
"""

import os
import sys
from pathlib import Path
from dotenv import load_dotenv
import psycopg2
from urllib.parse import urlparse

# Load environment variables
load_dotenv()

def fix_database_direct():
    """Fix the database schema directly using psycopg2."""
    print("🔧 Fixing Database Schema (Direct Connection)")
    print("=" * 50)
    
    try:
        # Get database URL from environment
        database_url = os.getenv("DATABASE_URL")
        if not database_url:
            print("❌ DATABASE_URL not found in environment")
            return False
        
        print(f"🔗 Connecting to database...")
        
        # Parse the URL
        parsed = urlparse(database_url)
        host = parsed.hostname
        port = parsed.port or 5432
        database = parsed.path[1:]  # Remove leading slash
        username = parsed.username
        password = parsed.password
        
        # Connect directly to PostgreSQL
        conn = psycopg2.connect(
            host=host,
            port=port,
            database=database,
            user=username,
            password=password
        )
        conn.autocommit = True  # Enable autocommit to avoid transaction issues
        
        cursor = conn.cursor()
        
        # Check if agent_id column exists
        try:
            cursor.execute("SELECT agent_id FROM evaluations LIMIT 1")
            print("✅ agent_id column already exists")
        except Exception:
            print("📝 Adding agent_id column to evaluations table...")
            try:
                cursor.execute("ALTER TABLE evaluations ADD COLUMN agent_id VARCHAR")
                print("✅ Successfully added agent_id column")
            except Exception as e:
                print(f"❌ Failed to add agent_id column: {e}")
                return False
        
        # Backfill agent_id from chat_logs
        print("🔄 Backfilling agent_id from chat_logs...")
        try:
            cursor.execute("""
                UPDATE evaluations 
                SET agent_id = chat_logs.agent_id 
                FROM chat_logs 
                WHERE evaluations.chat_log_id = chat_logs.id 
                AND evaluations.agent_id IS NULL
            """)
            updated_count = cursor.rowcount
            print(f"✅ Updated {updated_count} evaluations with agent_id")
        except Exception as e:
            print(f"❌ Failed to backfill agent_id: {e}")
            return False
        
        # Verify the schema
        print("\n🔍 Verifying schema...")
        try:
            # Check evaluations table structure
            cursor.execute("""
                SELECT column_name, data_type 
                FROM information_schema.columns 
                WHERE table_name = 'evaluations' 
                ORDER BY ordinal_position
            """)
            columns = cursor.fetchall()
            print("📋 Evaluations table columns:")
            for col in columns:
                print(f"   - {col[0]}: {col[1]}")
            
            # Check data
            cursor.execute("SELECT COUNT(*) FROM evaluations")
            total_evaluations = cursor.fetchone()[0]
            
            cursor.execute("SELECT COUNT(*) FROM evaluations WHERE agent_id IS NOT NULL")
            evaluations_with_agent_id = cursor.fetchone()[0]
            
            print(f"\n📊 Data summary:")
            print(f"   Total evaluations: {total_evaluations}")
            print(f"   Evaluations with agent_id: {evaluations_with_agent_id}")
            
            # Show some sample data
            cursor.execute("""
                SELECT e.id, e.chat_log_id, e.agent_id, e.coherence, e.relevance, e.politeness, e.resolution
                FROM evaluations e
                LIMIT 5
            """)
            samples = cursor.fetchall()
            print(f"\n📋 Sample evaluations:")
            for sample in samples:
                print(f"   - ID: {sample[0][:8]}..., Chat: {sample[1][:8]}..., Agent: {sample[2]}, Scores: C={sample[3]}, R={sample[4]}, P={sample[5]}, Res={sample[6]}")
            
        except Exception as e:
            print(f"❌ Failed to verify schema: {e}")
            return False
        
        cursor.close()
        conn.close()
        print("\n✅ Database schema fixed successfully!")
        return True
        
    except Exception as e:
        print(f"❌ Error fixing database schema: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    success = fix_database_direct()
    sys.exit(0 if success else 1) 