import requests
import json

# Test the upload endpoint with demo token
def test_upload_demo():
    url = "http://localhost:3001/api/chat-logs/upload"
    
    # Read the sample file
    with open('sample_chat_log.json', 'rb') as f:
        files = {'file': ('sample_chat_log.json', f, 'application/json')}
        headers = {'Authorization': 'Bearer demo-token'}
        
        try:
            response = requests.post(url, files=files, headers=headers)
            print(f"Demo Upload Status Code: {response.status_code}")
            print(f"Demo Upload Response: {response.text}")
            
            if response.status_code == 200:
                data = response.json()
                print(f"✅ Demo upload successful! Chat log ID: {data.get('id')}")
                return data.get('id')
            else:
                print(f"❌ Demo upload failed: {response.text}")
                return None
                
        except Exception as e:
            print(f"❌ Error: {e}")
            return None

# Test user creation and login
def create_test_user():
    url = "http://localhost:3001/api/auth/register"
    user_data = {
        "name": "Test User",
        "email": "test@example.com",
        "password": "testpassword123",
        "role": "manager"
    }
    
    try:
        response = requests.post(url, json=user_data)
        print(f"Register Status: {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            print(f"✅ User created! Token: {data.get('access_token')[:20]}...")
            return data.get('access_token')
        else:
            print(f"❌ User creation failed: {response.text}")
            return None
    except Exception as e:
        print(f"❌ Error creating user: {e}")
        return None

def login_user():
    url = "http://localhost:3001/api/auth/login"
    login_data = {
        "email": "test@example.com",
        "password": "testpassword123"
    }
    
    try:
        response = requests.post(url, json=login_data)
        print(f"Login Status: {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Login successful! Token: {data.get('access_token')[:20]}...")
            return data.get('access_token')
        else:
            print(f"❌ Login failed: {response.text}")
            return None
    except Exception as e:
        print(f"❌ Error logging in: {e}")
        return None

# Test the upload endpoint
def test_upload(token):
    url = "http://localhost:3001/api/chat-logs/upload"
    
    # Read the sample file
    with open('sample_chat_log.json', 'rb') as f:
        files = {'file': ('sample_chat_log.json', f, 'application/json')}
        headers = {'Authorization': f'Bearer {token}'}
        
        try:
            response = requests.post(url, files=files, headers=headers)
            print(f"Upload Status Code: {response.status_code}")
            print(f"Upload Response: {response.text}")
            
            if response.status_code == 200:
                data = response.json()
                print(f"✅ Upload successful! Chat log ID: {data.get('id')}")
                return data.get('id')
            else:
                print(f"❌ Upload failed: {response.text}")
                return None
                
        except Exception as e:
            print(f"❌ Error: {e}")
            return None

if __name__ == "__main__":
    print("🧪 Testing Chat Log Upload")
    print("=" * 40)
    
    # Test demo mode first
    print("\n🔍 Testing Demo Mode Upload...")
    demo_chat_log_id = test_upload_demo()
    
    if demo_chat_log_id:
        print(f"✅ Demo mode upload works! Chat log ID: {demo_chat_log_id}")
    else:
        print("❌ Demo mode upload failed!")
    
    # Test real authentication
    print("\n🔍 Testing Real Authentication Upload...")
    token = login_user()
    if not token:
        print("Creating new test user...")
        token = create_test_user()
    
    if token:
        chat_log_id = test_upload(token)
        
        if chat_log_id:
            print(f"✅ Real auth upload works! Chat log ID: {chat_log_id}")
        else:
            print("❌ Real auth upload failed!")
    else:
        print("❌ Could not get authentication token!")
    
    print("\n🎉 Upload testing completed!") 