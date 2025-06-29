# Ollama Setup for AURIS

This document explains how to set up and use Ollama with the AURIS system.

## What is Ollama?

Ollama is a local LLM server that allows you to run large language models locally on your machine. It provides a simple API for loading and using models.

## Installation

### 1. Install Ollama

Visit [https://ollama.ai](https://ollama.ai) and download the installer for your operating system:

- **Windows**: Download the Windows installer
- **macOS**: Download the macOS installer
- **Linux**: Follow the installation instructions for your distribution

### 2. Start Ollama

After installation, start Ollama:

```bash
# On Windows/macOS, Ollama should start automatically
# On Linux, you may need to start it manually:
ollama serve
```

### 3. Verify Installation

Check if Ollama is running:

```bash
ollama list
```

This should show an empty list initially, which is normal.

## Using Models

### 1. Pull a Model

Pull a model from the Ollama library:

```bash
# Example: Pull Llama 2
ollama pull llama2

# Example: Pull a smaller model
ollama pull tinyllama

# Example: Pull a coding model
ollama pull codellama
```

### 2. List Available Models

```bash
ollama list
```

### 3. Test a Model

```bash
ollama run llama2 "Hello, how are you?"
```

## Integration with AURIS

### 1. Backend Setup

The AURIS backend automatically detects if Ollama is running and connects to it on `http://localhost:11434`.

### 2. Frontend Interface

The Models page in the AURIS frontend will:

- Show if Ollama is running
- Display all available models with their tags
- Allow you to load models
- Show system information (CPU, GPU, memory)
- Provide test generation functionality

### 3. API Endpoints

The backend provides these Ollama-related endpoints:

- `GET /api/models/status` - Get model status and system info
- `GET /api/models/available` - List available models
- `POST /api/models/load` - Load a specific model
- `POST /api/models/test-generation` - Test model generation
- `POST /api/models/pull` - Pull a new model
- `GET /api/models/health` - Check Ollama health

## Popular Models

Here are some popular models you can try:

### General Purpose

- `llama2` - Meta's Llama 2 (7B parameters)
- `llama2:13b` - Llama 2 13B version
- `mistral` - Mistral 7B model
- `tinyllama` - TinyLlama 1.1B (fast, small)

### Coding

- `codellama` - Code Llama for programming
- `codellama:7b` - Smaller Code Llama
- `codellama:python` - Python-specific Code Llama

### Specialized

- `llama2:uncensored` - Uncensored Llama 2
- `neural-chat` - Intel's Neural Chat
- `orca-mini` - Lightweight conversational model

## Troubleshooting

### Ollama Not Running

If the frontend shows "Ollama is not running":

1. Check if Ollama is installed: `ollama --version`
2. Start Ollama: `ollama serve`
3. Verify it's running: `ollama list`

### Model Loading Issues

If models fail to load:

1. Check available disk space (models can be several GB)
2. Ensure you have enough RAM
3. Try pulling the model again: `ollama pull <model-name>`

### Performance Issues

For better performance:

1. Use smaller models like `tinyllama` for testing
2. Ensure you have sufficient RAM (8GB+ recommended)
3. Consider using GPU acceleration if available

## System Requirements

- **RAM**: 8GB minimum, 16GB+ recommended
- **Storage**: 10GB+ free space for models
- **OS**: Windows 10+, macOS 10.15+, or Linux
- **Network**: Internet connection for downloading models

## Next Steps

1. Install Ollama
2. Pull your first model: `ollama pull tinyllama`
3. Start the AURIS backend
4. Navigate to the Models page in the frontend
5. Load and test your models

For more information, visit [https://ollama.ai](https://ollama.ai).
