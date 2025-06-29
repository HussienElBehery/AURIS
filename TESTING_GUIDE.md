# AURIS Testing Guide

This guide provides comprehensive instructions for testing the AURIS model implementation and fixing the identified issues.

## Issues Fixed

### 1. ✅ Dark Mode Persistence

**Problem**: Dark mode didn't persist on page refresh
**Solution**:

- Modified `ThemeContext.tsx` to initialize theme state immediately
- Applied theme on mount to prevent flash of unstyled content
- Improved localStorage handling

### 2. ✅ Authentication Persistence

**Problem**: Users got logged out on page refresh
**Solution**:

- Enhanced `AuthContext.tsx` with better token validation
- Added proper demo user handling
- Improved error handling and refresh token management

### 3. ✅ Chats Page Functionality

**Problem**: Chats page had complex logic that didn't work properly
**Solution**:

- Simplified `ChatsPage.tsx` by removing duplicate code
- Improved error handling and loading states
- Better integration between demo and real user modes

### 4. ✅ API Service Improvements

**Problem**: API service lacked proper error handling and demo mode support
**Solution**:

- Enhanced `api.ts` with better error handling
- Added demo mode detection and mock data
- Improved token refresh logic

## Testing Instructions

### Prerequisites

1. **Install Dependencies**

   ```bash
   # Frontend
   npm install

   # Backend
   cd backend
   pip install -r requirements.txt
   ```

2. **Environment Setup**

   ```bash
   # Copy environment file
   cp env.example .env
   ```

3. **Database Setup**
   ```bash
   cd backend
   python init_db.py
   ```

### Model Testing

#### 1. Comprehensive Model Test

Run the comprehensive model testing script:

```bash
cd backend
python test_model_implementation.py
```

This script tests:

- ✅ Model loader functionality
- ✅ Processing pipeline
- ✅ Individual agents (evaluation, analysis, recommendation)
- ✅ API endpoints
- ✅ Model switching and loading

#### 2. Quick Model Status Check

```bash
cd backend
python test_model_manager.py
```

#### 3. Manual API Testing

Start the backend server:

```bash
cd backend
uvicorn app.main:app --reload --port 3001
```

Test endpoints:

```bash
# Health check
curl http://localhost:3001/health

# Model status (requires authentication)
curl http://localhost:3001/api/chat-logs/debug/model-status
```

### Frontend Testing

#### 1. Start Development Server

```bash
npm run dev
```

#### 2. Test Dark Mode

1. Toggle dark mode
2. Refresh the page
3. Verify dark mode persists

#### 3. Test Authentication

1. Login as demo user (agent or manager)
2. Refresh the page
3. Verify user stays logged in
4. Test logout functionality

#### 4. Test Chats Page

1. Navigate to Chats page
2. Test search and filtering
3. Test upload functionality
4. Verify data loads correctly for both demo and real users

### Backend Testing

#### 1. Start Backend Server

```bash
cd backend
uvicorn app.main:app --reload --port 3001
```

#### 2. Test Model Loading

```bash
# Test model status endpoint
curl -H "Authorization: Bearer YOUR_TOKEN" \
     http://localhost:3001/api/chat-logs/debug/model-status
```

#### 3. Test Chat Log Processing

```bash
# Upload a chat log
curl -X POST \
     -H "Authorization: Bearer YOUR_TOKEN" \
     -F "file=@sample_chat_log.json" \
     http://localhost:3001/api/chat-logs/upload

# Process the chat log
curl -X POST \
     -H "Authorization: Bearer YOUR_TOKEN" \
     http://localhost:3001/api/chat-logs/{chat_log_id}/process
```

## Troubleshooting

### Common Issues

#### 1. Model Loading Failures

**Symptoms**: Models fail to load or switch
**Solutions**:

- Check if models directory exists: `ls models/`
- Verify adapter files are present
- Check GPU memory availability
- Review model_loader.py logs

#### 2. Authentication Issues

**Symptoms**: Users get logged out unexpectedly
**Solutions**:

- Check browser localStorage
- Verify token expiration
- Test with demo mode first
- Check backend auth logs

#### 3. API Connection Issues

**Symptoms**: Frontend can't connect to backend
**Solutions**:

- Verify backend is running on port 3001
- Check CORS configuration
- Verify .env file has correct API URL
- Check network connectivity

#### 4. Dark Mode Issues

**Symptoms**: Theme doesn't persist or flashes
**Solutions**:

- Clear browser localStorage
- Check ThemeContext implementation
- Verify Tailwind dark mode classes
- Test in incognito mode

### Debug Commands

#### Frontend Debug

```bash
# Check environment variables
echo $VITE_API_BASE_URL

# Clear localStorage
localStorage.clear()

# Check for console errors
# Open browser dev tools and check console
```

#### Backend Debug

```bash
# Check model status
python -c "from app.services.model_loader import model_loader; print(model_loader.is_model_loaded())"

# Check database
python check_db.py

# View logs
tail -f backend.log
```

## Performance Testing

### Model Performance

```bash
# Test model loading time
time python test_model_implementation.py

# Monitor memory usage
htop  # or top
```

### API Performance

```bash
# Test API response times
curl -w "@curl-format.txt" -o /dev/null -s http://localhost:3001/health

# Load test with multiple requests
for i in {1..10}; do curl http://localhost:3001/health & done
```

## Deployment Checklist

Before deploying to production:

- [ ] All tests pass (`python test_model_implementation.py`)
- [ ] Dark mode works correctly
- [ ] Authentication persists properly
- [ ] Chats page loads and functions
- [ ] Model loading and switching works
- [ ] API endpoints respond correctly
- [ ] Error handling is robust
- [ ] Performance is acceptable
- [ ] Security measures are in place

## Support

If you encounter issues:

1. Check the troubleshooting section above
2. Review the logs for error messages
3. Test with demo mode first
4. Verify all dependencies are installed
5. Check the GitHub issues for known problems

For additional help, refer to the main README.md file or create an issue in the repository.
