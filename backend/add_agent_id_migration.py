#!/usr/bin/env python3
"""
Migration script to add agent_id column to users table
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.database import get_db, engine
from app.models import User, Base
from app.auth import generate_uuid
from sqlalchemy import text
import sqlalchemy as sa
from sqlalchemy import inspect

def migrate_add_agent_id():
    """Add agent_id column to users table and populate for existing agents"""
    
    # Create the column if it doesn't exist
    with engine.connect() as conn:
        # Check if column exists
        result = conn.execute(text("""
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'users' AND column_name = 'agent_id'
        """))
        
        if not result.fetchone():
            print("Adding agent_id column to users table...")
            conn.execute(text("ALTER TABLE users ADD COLUMN agent_id VARCHAR"))
            conn.commit()
            print("✓ agent_id column added")
        else:
            print("✓ agent_id column already exists")
    
    # Populate agent_id for existing agents
    db = next(get_db())
    try:
        agents_without_id = db.query(User).filter(
            User.role == "agent",
            (User.agent_id.is_(None) | (User.agent_id == ""))
        ).all()
        
        if agents_without_id:
            print(f"Found {len(agents_without_id)} agents without agent_id, updating...")
            
            for agent in agents_without_id:
                agent.agent_id = f"agent-{generate_uuid()[:8]}"
                print(f"  - {agent.name} ({agent.email}): {agent.agent_id}")
            
            db.commit()
            print("✓ All agents updated with agent_id")
        else:
            print("✓ All agents already have agent_id")
            
    except Exception as e:
        print(f"Error updating agents: {e}")
        db.rollback()
    finally:
        db.close()

def add_recommendation_columns(engine):
    inspector = inspect(engine)
    columns = [col['name'] for col in inspector.get_columns('recommendations')]
    with engine.connect() as conn:
        if 'specific_feedback' not in columns:
            conn.execute(sa.text('ALTER TABLE recommendations ADD COLUMN IF NOT EXISTS specific_feedback JSONB'))
        if 'long_term_coaching' not in columns:
            conn.execute(sa.text('ALTER TABLE recommendations ADD COLUMN IF NOT EXISTS long_term_coaching TEXT'))

if __name__ == "__main__":
    print("Starting agent_id migration...")
    migrate_add_agent_id()
    add_recommendation_columns(engine)
    print("Migration completed!") 