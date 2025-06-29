# AURIS Multi-Agent System

A comprehensive customer service evaluation system using fine-tuned language models for evaluation, analysis, and recommendation.

## Features

- **Multi-Agent Processing**: Three specialized agents (evaluation, analysis, recommendation)
- **Model Management**: Web interface for downloading and managing models
- **Real-time Progress Tracking**: Monitor model installation and processing progress
- **Error Handling**: Robust error handling with fallback mechanisms
- **Memory Efficient**: Optimized for 4GB GPU memory constraint
- **Sample Data**: Includes sample chat logs and placeholder adapters for testing

## Model Management

### Web Interface

The system includes a comprehensive model management interface accessible at `/models`:

- **Model Status**: View installation status of all required models
- **Download Management**: Install base model and sample adapters
- **Progress Tracking**: Real-time progress updates during installation
- **Testing**: Test model loading and functionality
- **Cache Management**: Clean up temporary files

### Required Models

1. **Base Model**: `unsloth/tinyllama-chat-bnb-4bit` (2.5GB)

   - Downloads automatically from Hugging Face
   - Optimized for 4-bit quantization

2. **Sample Adapters**: Placeholder adapters for testing
   - `tinyllama-chat-bnb-4bit_agent1` (Evaluation)
   - `tinyllama-chat-bnb-4bit_agent2` (Analysis)
   - `tinyllama-chat-bnb-4bit_agent3` (Recommendation)

### Installation Process

1. **Access Model Manager**: Navigate to `/models` in the web interface
2. **Check Status**: Review current model installation status
3. **Install Models**: Choose from:
   - Install Base Model Only
   - Install Sample Adapters Only
   - Install All Models (Recommended)
4. **Monitor Progress**: Watch real-time installation progress
5. **Test Loading**: Verify models load correctly

### Manual Installation

If you prefer manual installation:

```bash
# Base model will be downloaded automatically on first use
# Sample adapters are created automatically

# Or use the API directly:
curl -X POST http://localhost:3001/api/models/install/all
```

## Quick Start

### Prerequisites

- Python 3.8+
- Node.js 16+
- PostgreSQL
- 4GB+ GPU memory (for model loading)
- 10GB+ free disk space

### Backend Setup

1. **Install Dependencies**:

   ```bash
   cd backend
   pip install -r requirements.txt
   ```

2. **Environment Configuration**:

   ```bash
   cp env.example .env
   # Edit .env with your database and JWT settings
   ```

3. **Database Setup**:

   ```bash
   python init_db.py
   ```

4. **Start Backend**:
   ```bash
   uvicorn app.main:app --reload --port 3001
   ```

### Frontend Setup

1. **Install Dependencies**:

   ```bash
   npm install
   ```

2. **Environment Configuration**:

   ```bash
   cp env.example .env
   # Edit .env with your API base URL
   ```

3. **Start Frontend**:
   ```bash
   npm run dev
   ```

### Model Installation

1. **Access the Web Interface**: Navigate to `http://localhost:5173`
2. **Login/Register**: Create an account or login
3. **Go to Models**: Click "Models" in the sidebar
4. **Install Models**: Click "Install All Models" and wait for completion
5. **Test**: Click "Test Model Loading" to verify installation

## API Endpoints

### Model Management

- `GET /api/models/status` - Get model installation status
- `POST /api/models/install/base` - Install base model
- `POST /api/models/install/adapters` - Install sample adapters
- `POST /api/models/install/all` - Install all models
- `GET /api/models/progress` - Get installation progress
- `GET /api/models/test` - Test model loading
- `DELETE /api/models/cache` - Clean up cache

### Chat Processing

- `POST /api/chat-logs/upload` - Upload chat log file
- `POST /api/chat-logs/{id}/process` - Start processing
- `GET /api/chat-logs/{id}/status` - Get processing status
- `GET /api/chat-logs/{id}/evaluation` - Get evaluation results
- `GET /api/chat-logs/{id}/analysis` - Get analysis results
- `GET /api/chat-logs/{id}/recommendation` - Get recommendation results

## Usage

### Processing Chat Logs

1. **Upload File**: Use the chat log upload component
2. **Start Processing**: Click "Process" to begin multi-agent analysis
3. **Monitor Progress**: Watch real-time progress updates
4. **View Results**: Access results in Evaluation, Analysis, and Recommendation pages

### Sample Data

The system includes a sample chat log (`sample_chat_log.json`) for testing:

```json
{
  "chat_id": "sample_chat_001",
  "customer_name": "John Doe",
  "agent_name": "Sarah Smith",
  "messages": [
    {
      "sender": "customer",
      "content": "I'm having trouble with my order",
      "timestamp": "2024-01-15T10:30:00Z"
    },
    {
      "sender": "agent",
      "content": "I'd be happy to help you with your order. Can you provide your order number?",
      "timestamp": "2024-01-15T10:31:00Z"
    }
  ]
}
```

## Architecture

### Model Loading Strategy

- **Base Model**: Loaded once and shared across all agents
- **Adapters**: Switched dynamically based on agent type
- **Memory Management**: Automatic cleanup between agent switches
- **Error Handling**: Fallback to base tokenizer if adapter tokenizer fails

### Processing Pipeline

1. **File Upload**: JSON chat log validation and storage
2. **Evaluation Agent**: Assesses conversation quality and agent performance
3. **Analysis Agent**: Identifies key themes and customer sentiment
4. **Recommendation Agent**: Provides improvement suggestions
5. **Result Storage**: All outputs stored in PostgreSQL database

## Troubleshooting

### Common Issues

1. **Model Download Fails**:

   - Check internet connection
   - Verify sufficient disk space (10GB+)
   - Check Hugging Face access

2. **Memory Errors**:

   - Ensure 4GB+ GPU memory available
   - Close other GPU-intensive applications
   - Consider reducing model precision

3. **Tokenizer Loading Issues**:

   - System automatically falls back to base tokenizer
   - Check adapter file integrity
   - Verify adapter configuration

4. **Processing Timeouts**:
   - Increase timeout settings in configuration
   - Check system resources
   - Monitor GPU memory usage

### Debug Endpoints

- `GET /api/models/status` - Check model installation status
- `GET /api/models/test` - Test model loading functionality
- `GET /api/chat-logs/{id}/status` - Check processing status

### Logs

Check backend logs for detailed error information:

```bash
# Backend logs
tail -f backend/logs/app.log

# Model loading logs
grep "ModelLoader" backend/logs/app.log
```

## Development

### Adding New Agents

1. **Create Adapter Directory**: Add new adapter to `models/` directory
2. **Update Model Loader**: Add adapter configuration in `model_loader.py`
3. **Create Agent Service**: Implement agent logic in `services/`
4. **Add API Endpoints**: Create new router endpoints
5. **Update Frontend**: Add UI components for new agent

### Customizing Prompts

Edit agent prompts in respective service files:

- `evaluation_agent.py` - Evaluation criteria and scoring
- `analysis_agent.py` - Analysis focus areas
- `recommendation_agent.py` - Recommendation types

### Performance Optimization

- **Batch Processing**: Process multiple chat logs simultaneously
- **Caching**: Implement result caching for repeated analysis
- **Model Optimization**: Use smaller models for faster inference
- **Async Processing**: Leverage FastAPI's async capabilities

## Security

- **Authentication**: JWT-based authentication required
- **File Validation**: Strict JSON schema validation
- **Input Sanitization**: All inputs validated and sanitized
- **Rate Limiting**: API rate limiting for production use

## Production Deployment

### Environment Variables

```bash
# Database
DATABASE_URL=postgresql://user:pass@host:port/db

# JWT
SECRET_KEY=your-secret-key
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30

# CORS
CORS_ORIGINS=["https://yourdomain.com"]

# Model Settings
MODELS_DIR=/path/to/models
GPU_MEMORY_LIMIT=4GB
```

### Docker Deployment

```dockerfile
# Backend Dockerfile
FROM python:3.9-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt
COPY . .
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "3001"]
```

### Monitoring

- **Health Checks**: `/health` endpoint for monitoring
- **Model Status**: Regular model availability checks
- **Performance Metrics**: Track processing times and success rates
- **Error Tracking**: Monitor and alert on processing failures

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## License

This project is licensed under the MIT License - see the LICENSE file for details.
