#!/usr/bin/env python3
"""
Migration script to add agent_id to evaluations and analyses tables.
"""

import os
import sys
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

def run_migration():
    """Run the migration to add agent_id to evaluations and analyses tables."""
    print("🔄 Starting Migration: Add agent_id to evaluations and analyses tables")
    print("=" * 50)
    
    try:
        # Import database components
        sys.path.append(str(Path("backend")))
        from backend.app.database import get_db
        from backend.app.models import Evaluation, ChatLog, Analysis
        from sqlalchemy import text
        
        # Get database session
        db = next(get_db())
        
        # --- EVALUATIONS TABLE ---
        # Check if agent_id column already exists in evaluations
        try:
            db.execute(text("SELECT agent_id FROM evaluations LIMIT 1"))
            print("✅ agent_id column already exists in evaluations table")
        except Exception:
            print("📝 agent_id column does not exist in evaluations, adding it...")
            try:
                db.execute(text("ALTER TABLE evaluations ADD COLUMN agent_id VARCHAR"))
                db.commit()
                print("✅ Added agent_id column to evaluations table")
            except Exception as e:
                db.rollback()
                print(f"❌ Failed to add agent_id column to evaluations: {e}")
                return False
        # Backfill agent_id for evaluations
        print("🔄 Backfilling agent_id for evaluations from chat_logs...")
        evaluations = db.query(Evaluation).all()
        updated_count = 0
        for evaluation in evaluations:
            chat_log = db.query(ChatLog).filter(ChatLog.id == evaluation.chat_log_id).first()
            if chat_log and chat_log.agent_id:
                evaluation.agent_id = chat_log.agent_id
                updated_count += 1
                print(f"   ✅ Updated evaluation {evaluation.id} with agent_id: {chat_log.agent_id}")
            else:
                print(f"   ⚠️  No agent_id found for chat_log {evaluation.chat_log_id}")
        db.commit()
        print(f"✅ Successfully updated {updated_count} evaluations with agent_id")
        # Verify
        total_evaluations = db.query(Evaluation).count()
        evaluations_with_agent_id = db.query(Evaluation).filter(Evaluation.agent_id.isnot(None)).count()
        print(f"   Total evaluations: {total_evaluations}")
        print(f"   Evaluations with agent_id: {evaluations_with_agent_id}")
        
        # --- ANALYSES TABLE ---
        # Check if agent_id column already exists in analyses
        try:
            db.execute(text("SELECT agent_id FROM analyses LIMIT 1"))
            print("✅ agent_id column already exists in analyses table")
        except Exception:
            print("📝 agent_id column does not exist in analyses, adding it...")
            try:
                db.execute(text("ALTER TABLE analyses ADD COLUMN agent_id VARCHAR"))
                db.commit()
                print("✅ Added agent_id column to analyses table")
            except Exception as e:
                db.rollback()
                print(f"❌ Failed to add agent_id column to analyses: {e}")
                return False
        # Backfill agent_id for analyses
        print("🔄 Backfilling agent_id for analyses from chat_logs...")
        analyses = db.query(Analysis).all()
        updated_count = 0
        for analysis in analyses:
            chat_log = db.query(ChatLog).filter(ChatLog.id == analysis.chat_log_id).first()
            if chat_log and chat_log.agent_id:
                analysis.agent_id = chat_log.agent_id
                updated_count += 1
                print(f"   ✅ Updated analysis {analysis.id} with agent_id: {chat_log.agent_id}")
            else:
                print(f"   ⚠️  No agent_id found for chat_log {analysis.chat_log_id}")
        db.commit()
        print(f"✅ Successfully updated {updated_count} analyses with agent_id")
        # Verify
        total_analyses = db.query(Analysis).count()
        analyses_with_agent_id = db.query(Analysis).filter(Analysis.agent_id.isnot(None)).count()
        print(f"   Total analyses: {total_analyses}")
        print(f"   Analyses with agent_id: {analyses_with_agent_id}")
        
        print("\n✅ Migration completed successfully for both tables!")
        db.close()
        return True
        
    except Exception as e:
        print(f"❌ Migration failed: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    success = run_migration()
    sys.exit(0 if success else 1) 