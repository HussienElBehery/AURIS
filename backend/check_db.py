import os
from dotenv import load_dotenv
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

# Load environment variables
load_dotenv()

def check_database():
    """Check the contents of the database."""
    
    # Get database URL from environment
    database_url = os.getenv("DATABASE_URL", "postgresql://auris_user:auris_password@localhost:5432/auris_db")
    
    try:
        # Create engine
        engine = create_engine(database_url)
        
        # Test connection
        with engine.connect() as connection:
            print("✅ Successfully connected to database!")
            
            # Check if tables exist
            result = connection.execute(text("""
                SELECT table_name 
                FROM information_schema.tables 
                WHERE table_schema = 'public'
                ORDER BY table_name;
            """))
            
            tables = [row[0] for row in result]
            print(f"\n📋 Tables found: {tables}")
            
            # Check users table
            if 'users' in tables:
                print("\n👥 USERS TABLE:")
                result = connection.execute(text("SELECT COUNT(*) FROM users"))
                user_count = result.fetchone()[0]
                print(f"Total users: {user_count}")
                
                if user_count > 0:
                    result = connection.execute(text("""
                        SELECT id, name, email, role, is_active, created_at 
                        FROM users 
                        ORDER BY created_at DESC
                    """))
                    
                    for row in result:
                        print(f"  - {row[1]} ({row[2]}) - {row[3]} - Active: {row[4]} - Created: {row[5]}")
            
            # Check refresh_tokens table
            if 'refresh_tokens' in tables:
                print("\n🔑 REFRESH TOKENS TABLE:")
                result = connection.execute(text("SELECT COUNT(*) FROM refresh_tokens"))
                token_count = result.fetchone()[0]
                print(f"Total refresh tokens: {token_count}")
                
                if token_count > 0:
                    result = connection.execute(text("""
                        SELECT id, user_id, expires_at, created_at 
                        FROM refresh_tokens 
                        ORDER BY created_at DESC
                    """))
                    
                    for row in result:
                        print(f"  - Token ID: {row[0][:8]}... - User: {row[1]} - Expires: {row[2]}")
            
            # Show table schemas
            print("\n📊 TABLE SCHEMAS:")
            for table in tables:
                print(f"\n{table.upper()} table structure:")
                result = connection.execute(text(f"""
                    SELECT column_name, data_type, is_nullable, column_default
                    FROM information_schema.columns 
                    WHERE table_name = '{table}' 
                    ORDER BY ordinal_position;
                """))
                
                for row in result:
                    nullable = "NULL" if row[2] == "YES" else "NOT NULL"
                    default = f" DEFAULT {row[3]}" if row[3] else ""
                    print(f"  - {row[0]}: {row[1]} {nullable}{default}")
    
    except Exception as e:
        print(f"❌ Error connecting to database: {e}")
        print("\n🔧 Troubleshooting tips:")
        print("1. Make sure PostgreSQL is running")
        print("2. Check your DATABASE_URL in .env file")
        print("3. Verify the database 'auris_db' exists")
        print("4. Ensure the user has proper permissions")

if __name__ == "__main__":
    print("🔍 Checking AURIS Database...")
    print("=" * 50)
    check_database() 