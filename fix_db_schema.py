#!/usr/bin/env python3
"""
Fix database schema by adding agent_id column to evaluations table.
"""

import os
import sys
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

def fix_database_schema():
    """Fix the database schema by adding missing columns."""
    print("🔧 Fixing Database Schema")
    print("=" * 40)
    
    try:
        # Import database components
        sys.path.append(str(Path("backend")))
        from backend.app.database import get_db
        from sqlalchemy import text
        
        # Get database session
        db = next(get_db())
        
        # Check if agent_id column exists
        try:
            result = db.execute(text("SELECT agent_id FROM evaluations LIMIT 1"))
            print("✅ agent_id column already exists")
        except Exception:
            print("📝 Adding agent_id column to evaluations table...")
            try:
                # Add the column
                db.execute(text("ALTER TABLE evaluations ADD COLUMN agent_id VARCHAR"))
                db.commit()
                print("✅ Successfully added agent_id column")
            except Exception as e:
                print(f"❌ Failed to add agent_id column: {e}")
                db.rollback()
                return False
        
        # Backfill agent_id from chat_logs
        print("🔄 Backfilling agent_id from chat_logs...")
        try:
            # Update evaluations with agent_id from chat_logs
            update_query = """
            UPDATE evaluations 
            SET agent_id = chat_logs.agent_id 
            FROM chat_logs 
            WHERE evaluations.chat_log_id = chat_logs.id 
            AND evaluations.agent_id IS NULL
            """
            result = db.execute(text(update_query))
            db.commit()
            print(f"✅ Updated {result.rowcount} evaluations with agent_id")
        except Exception as e:
            print(f"❌ Failed to backfill agent_id: {e}")
            db.rollback()
            return False
        
        # Verify the schema
        print("\n🔍 Verifying schema...")
        try:
            # Check evaluations table structure
            result = db.execute(text("""
                SELECT column_name, data_type 
                FROM information_schema.columns 
                WHERE table_name = 'evaluations' 
                ORDER BY ordinal_position
            """))
            columns = result.fetchall()
            print("📋 Evaluations table columns:")
            for col in columns:
                print(f"   - {col[0]}: {col[1]}")
            
            # Check data
            result = db.execute(text("SELECT COUNT(*) FROM evaluations"))
            total_evaluations = result.fetchone()[0]
            
            result = db.execute(text("SELECT COUNT(*) FROM evaluations WHERE agent_id IS NOT NULL"))
            evaluations_with_agent_id = result.fetchone()[0]
            
            print(f"\n📊 Data summary:")
            print(f"   Total evaluations: {total_evaluations}")
            print(f"   Evaluations with agent_id: {evaluations_with_agent_id}")
            
        except Exception as e:
            print(f"❌ Failed to verify schema: {e}")
            return False
        
        db.close()
        print("\n✅ Database schema fixed successfully!")
        return True
        
    except Exception as e:
        print(f"❌ Error fixing database schema: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    success = fix_database_schema()
    sys.exit(0 if success else 1) 