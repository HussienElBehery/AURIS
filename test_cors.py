#!/usr/bin/env python3
"""
CORS test script for AURIS.
This script tests CORS configuration and helps debug CORS issues.
"""

import requests
import json
from urllib.parse import urljoin

def test_cors_endpoint(base_url, endpoint="/cors-test"):
    """Test a specific endpoint for CORS issues."""
    url = urljoin(base_url, endpoint)
    
    print(f"🔍 Testing CORS for: {url}")
    
    # Test OPTIONS request (preflight)
    try:
        print("   Testing OPTIONS request...")
        response = requests.options(url, timeout=5)
        print(f"   ✅ OPTIONS Status: {response.status_code}")
        print(f"   📋 CORS Headers:")
        for header, value in response.headers.items():
            if 'access-control' in header.lower():
                print(f"      {header}: {value}")
    except Exception as e:
        print(f"   ❌ OPTIONS failed: {e}")
    
    # Test GET request
    try:
        print("   Testing GET request...")
        response = requests.get(url, timeout=5)
        print(f"   ✅ GET Status: {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            print(f"   📄 Response: {json.dumps(data, indent=2)}")
    except Exception as e:
        print(f"   ❌ GET failed: {e}")
    
    print()

def test_api_endpoints(base_url):
    """Test common API endpoints for CORS."""
    endpoints = [
        "/health",
        "/api/models/status",
        "/api/auth/login"
    ]
    
    for endpoint in endpoints:
        test_cors_endpoint(base_url, endpoint)

def main():
    """Main function to test CORS configuration."""
    print("🔧 AURIS CORS Test")
    print("=" * 40)
    
    # Test different backend URLs
    backend_urls = [
        "http://localhost:3001",
        "http://127.0.0.1:3001"
    ]
    
    for url in backend_urls:
        print(f"\n🌐 Testing backend at: {url}")
        print("-" * 40)
        
        # Test basic connectivity
        try:
            response = requests.get(f"{url}/health", timeout=5)
            print(f"✅ Backend is running (Status: {response.status_code})")
        except Exception as e:
            print(f"❌ Backend not accessible: {e}")
            continue
        
        # Test CORS endpoints
        test_cors_endpoint(url)
        test_api_endpoints(url)
    
    print("\n📋 CORS Troubleshooting Tips:")
    print("1. Make sure backend is running on port 3001")
    print("2. Check that frontend is running on an allowed origin")
    print("3. Verify CORS_ORIGINS in backend config includes frontend URL")
    print("4. Clear browser cache and try again")
    print("5. Check browser developer tools for CORS errors")

if __name__ == "__main__":
    main() 