# AURIS - Customer Service Evaluation System

AURIS is an advanced platform for evaluating customer service interactions, powered by AI agents and integrated with the Ollama LLM service. It provides actionable insights, performance analytics, and coaching recommendations to help organizations improve their customer support quality. The backend leverages Ollama for natural language processing and model inference.

## 🌟 What Does AURIS Do?

AURIS analyzes customer service chat logs using state-of-the-art AI models (via Ollama). It automatically evaluates agent performance, identifies strengths and weaknesses, and generates targeted feedback and coaching suggestions. The system is designed for both agents and managers, supporting real-time analytics, role-based access, and seamless integration with your backend.

## 🔗 Pipeline Overview

AURIS processes each chat log through a multi-stage pipeline: evaluation, analysis, and recommendation. This ensures comprehensive, actionable feedback for every conversation. A detailed pipeline diagram is available below.

![AURIS Pipeline](Visuals/pipeline.png)
_Figure: AURIS processing pipeline for customer service chat evaluation._

## 🤖 The Three Core Agents

AURIS leverages three specialized AI agents:

### 1. Evaluation Agent

- **Purpose:** Objectively scores each conversation across four metrics: coherence, relevance, politeness, and resolution.
- **Output:** Numeric scores (1–5 for most metrics, 0/1 for resolution) with concise reasoning for each, plus an evaluation summary.

### 2. Analysis Agent

- **Purpose:** Analyzes chat transcripts for key issues, positive highlights, and adherence to customer service guidelines.
- **Output:** Structured analysis including lists of key issues, positive highlights, and guideline adherence (pass/fail with details).

### 3. Recommendation Agent

- **Purpose:** Provides actionable feedback and long-term coaching based on the analysis and evaluation results.
- **Output:** Specific feedback (original agent messages and improved suggestions) and a coaching paragraph for professional development.

## 🚀 Features

- **AI-Powered Chat Analysis** – Automated, unbiased evaluation of customer service conversations
- **Actionable Recommendations** – Personalized feedback and coaching for agents
- **Interactive Dashboard** – Real-time performance metrics and analytics
- **Role-Based Access** – Agent and Manager interfaces
- **Responsive UI** – Works on desktop and mobile
- **Dark/Light Theme** – User preference support
- **Ollama Integration** – Seamless use of local or remote LLMs for all NLP tasks

## 🛠️ Tech Stack

- **Frontend:** React 18, TypeScript, Tailwind CSS
- **Backend:** Python (FastAPI), Ollama LLM service
- **State Management:** React Context, Custom Hooks
- **Forms:** React Hook Form, Zod
- **HTTP Client:** Axios
- **Build Tool:** Vite

## 🏗️ Project Structure

```
src/
├── components/          # Reusable UI components
├── contexts/            # React Context providers
├── data/                # Mock data and static content
├── hooks/               # Custom React hooks
├── pages/               # Page components
├── services/            # API and external services
├── types/               # TypeScript type definitions
├── utils/               # Utility functions
├── App.tsx              # Main application component
├── main.tsx             # Application entry point
└── index.css            # Global styles
Visuals/                 # Diagrams and pipeline visualizations
```

## 🖼️ Visuals

### Pipeline Overview

AURIS processes each chat log through a multi-stage pipeline: evaluation, analysis, and recommendation. This ensures comprehensive, actionable feedback for every conversation.

![AURIS Pipeline](Visuals/pipeline.png)
_Figure 1: AURIS processing pipeline for customer service chat evaluation._

### Sequence Diagram

The following diagram illustrates the sequence of operations for chat evaluation and recommendation in AURIS.

![AURIS Sequence Diagram](Visuals/sequence.png)
_Figure 2: Sequence of operations for chat evaluation and recommendation in AURIS._

> Additional diagrams and design assets are available in the [Visuals/](Visuals/) directory.

## ⚡ Getting Started

### Prerequisites

- Node.js (v16+)
- Python 3.8+ (for backend)
- [Ollama](https://ollama.com/) LLM service (local or remote)

### Setup Steps

1. **Clone the Repository**
   ```bash
   git clone <repository-url>
   cd AURIS
   ```
2. **Install Frontend Dependencies**
   ```bash
   npm install
   ```
3. **Set Up Environment Variables**
   ```bash
   cp env.example .env.local
   ```
   Edit `.env.local` as needed (see `env.example` for options).
4. **Start the Backend**
   - Ensure your Python backend and Ollama service are running. (See backend/README.md for details.)
5. **Start the Frontend**
   ```bash
   npm run dev
   ```
   Visit [http://localhost:5173](http://localhost:5173) in your browser.

## 🔌 Backend Integration

AURIS expects a RESTful API backend, with Ollama providing LLM inference. Key endpoints include:

- `/api/auth/*` – Authentication (login, register, refresh)
- `/api/chat-logs/*` – Chat log management
- `/api/evaluations/*` – Evaluation results
- `/api/dashboard/stats` – Dashboard metrics
- `/api/users/*` – User profile and management

## 🚀 Deployment

To build for production:

```bash
npm run build
```

The output will be in the `dist/` directory. Deploy with your preferred static hosting solution.

### Environment Variables

Set these for production:

```env
VITE_API_BASE_URL=https://your-api-domain.com/api
VITE_ENABLE_DEMO_MODE=false
VITE_ENABLE_ANALYTICS=true
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## 📝 License

MIT License

## 🆘 Support

- Create an issue in the repository
- Contact the development team
- See documentation for more info
