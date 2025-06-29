#!/usr/bin/env python3
"""
Development startup script for AURIS.
This script starts both frontend and backend servers.
"""

import subprocess
import sys
import time
import os
from pathlib import Path

def start_backend():
    """Start the backend server."""
    print("🚀 Starting backend server...")
    backend_dir = Path("backend")
    
    if not backend_dir.exists():
        print("❌ Backend directory not found!")
        return None
    
    # Change to backend directory
    os.chdir(backend_dir)
    
    # Start uvicorn server
    try:
        process = subprocess.Popen([
            sys.executable, "-m", "uvicorn", 
            "app.main:app", "--reload", "--port", "3001"
        ])
        print("✅ Backend server started on http://localhost:3001")
        return process
    except Exception as e:
        print(f"❌ Failed to start backend: {e}")
        return None

def start_frontend():
    """Start the frontend server."""
    print("🚀 Starting frontend server...")
    
    # Check if node_modules exists
    if not Path("node_modules").exists():
        print("📦 Installing frontend dependencies...")
        subprocess.run(["npm", "install"], check=True)
    
    # Start frontend server
    try:
        process = subprocess.Popen(["npm", "run", "dev"])
        print("✅ Frontend server started on http://localhost:5173")
        return process
    except Exception as e:
        print(f"❌ Failed to start frontend: {e}")
        return None

def main():
    """Main function to start both servers."""
    print("🎯 Starting AURIS Development Environment...")
    print("=" * 50)
    
    # Start backend
    backend_process = start_backend()
    if not backend_process:
        print("❌ Backend failed to start. Exiting.")
        sys.exit(1)
    
    # Wait a moment for backend to start
    time.sleep(2)
    
    # Start frontend
    frontend_process = start_frontend()
    if not frontend_process:
        print("❌ Frontend failed to start. Exiting.")
        backend_process.terminate()
        sys.exit(1)
    
    print("\n🎉 Both servers started successfully!")
    print("📱 Frontend: http://localhost:5173")
    print("🔧 Backend:  http://localhost:3001")
    print("📊 API Docs: http://localhost:3001/docs")
    print("\nPress Ctrl+C to stop both servers...")
    
    try:
        # Wait for both processes
        backend_process.wait()
        frontend_process.wait()
    except KeyboardInterrupt:
        print("\n🛑 Stopping servers...")
        backend_process.terminate()
        frontend_process.terminate()
        print("✅ Servers stopped.")

if __name__ == "__main__":
    main() 