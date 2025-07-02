import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), 'app'))
import sqlalchemy as sa
from app.database import engine

def fix_recommendation_columns():
    with engine.connect() as conn:
        # Drop unused columns
        for col in ["original_message", "improved_message", "reasoning", "coaching_suggestions"]:
            try:
                conn.execute(sa.text(f'ALTER TABLE recommendations DROP COLUMN IF EXISTS {col}'))
                print(f"Dropped column: {col}")
            except Exception as e:
                print(f"Could not drop column {col}: {e}")
        # Add error_message if missing
        result = conn.execute(sa.text("""
            SELECT column_name FROM information_schema.columns 
            WHERE table_name = 'recommendations' AND column_name = 'error_message'
        """))
        if not result.fetchone():
            conn.execute(sa.text('ALTER TABLE recommendations ADD COLUMN error_message TEXT'))
            print("Added column: error_message")

if __name__ == "__main__":
    fix_recommendation_columns()
    print("Done.") 