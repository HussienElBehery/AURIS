import psycopg2
from psycopg2.extensions import ISOLATION_LEVEL_AUTOCOMMIT
import os
from dotenv import load_dotenv

load_dotenv()

def create_database():
    """Create the database if it doesn't exist."""
    # Connect to PostgreSQL server
    conn = psycopg2.connect(
        host="localhost",
        port="5432",
        user="postgres",  # Default PostgreSQL user
        password="your_password_here"  # Replace with your PostgreSQL password
    )
    conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
    cursor = conn.cursor()
    
    # Check if database exists
    cursor.execute("SELECT 1 FROM pg_catalog.pg_database WHERE datname = 'auris_db'")
    exists = cursor.fetchone()
    
    if not exists:
        cursor.execute("CREATE DATABASE auris_db")
        print("Database 'auris_db' created successfully!")
    else:
        print("Database 'auris_db' already exists!")
    
    cursor.close()
    conn.close()

def create_user():
    """Create a PostgreSQL user for the application."""
    conn = psycopg2.connect(
        host="localhost",
        port="5432",
        user="postgres",
        password="your_password_here"  # Replace with your PostgreSQL password
    )
    conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
    cursor = conn.cursor()
    
    try:
        # Create user (replace with your desired username and password)
        cursor.execute("CREATE USER auris_user WITH PASSWORD 'auris_password'")
        print("User 'auris_user' created successfully!")
    except psycopg2.errors.DuplicateObject:
        print("User 'auris_user' already exists!")
    
    try:
        # Grant privileges
        cursor.execute("GRANT ALL PRIVILEGES ON DATABASE auris_db TO auris_user")
        print("Privileges granted to 'auris_user'!")
    except Exception as e:
        print(f"Error granting privileges: {e}")
    
    cursor.close()
    conn.close()

if __name__ == "__main__":
    print("Setting up PostgreSQL database for AURIS...")
    create_database()
    create_user()
    print("\nDatabase setup complete!")
    print("\nNext steps:")
    print("1. Update your .env file with the correct DATABASE_URL")
    print("2. Run: pip install -r requirements.txt")
    print("3. Run: uvicorn app.main:app --reload") 