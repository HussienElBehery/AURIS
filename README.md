# AURIS - Customer Service Evaluation System

A comprehensive React-based frontend application for evaluating customer service interactions and providing AI-powered recommendations for improvement.

## 🚀 Features

- **Interactive Dashboard** - Real-time metrics and performance analytics
- **Chat Evaluation** - AI-powered analysis of customer service conversations
- **Performance Tracking** - Monitor agent performance over time
- **Recommendation Engine** - Personalized coaching suggestions
- **Multi-role Support** - Agent and Manager interfaces
- **Responsive Design** - Works on desktop and mobile devices
- **Dark/Light Theme** - User preference support

## 🛠️ Tech Stack

- **Frontend**: React 18 + TypeScript
- **Styling**: Tailwind CSS
- **Routing**: React Router DOM
- **State Management**: React Context + Custom Hooks
- **Forms**: React Hook Form + Zod validation
- **HTTP Client**: Axios
- **Build Tool**: Vite
- **Icons**: Lucide React

## 📦 Installation

1. **Clone the repository**

   ```bash
   git clone <repository-url>
   cd AURIS
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Set up environment variables**

   ```bash
   cp env.example .env.local
   ```

   Edit `.env.local` with your configuration:

   ```env
   VITE_API_BASE_URL=http://localhost:3001/api
   VITE_ENABLE_DEMO_MODE=true
   ```

4. **Start development server**

   ```bash
   npm run dev
   ```

5. **Open your browser**
   Navigate to `http://localhost:5173`

## 🏗️ Project Structure

```
src/
├── components/          # Reusable UI components
│   ├── Chart.tsx       # Data visualization components
│   ├── LoadingSkeleton.tsx
│   ├── MetricCard.tsx
│   └── Sidebar.tsx
├── contexts/           # React Context providers
│   ├── AuthContext.tsx # Authentication state
│   └── ThemeContext.tsx # Theme management
├── data/              # Mock data and static content
│   └── mockData.ts
├── hooks/             # Custom React hooks
│   └── useApi.ts      # API integration hooks
├── pages/             # Page components
│   ├── AnalysisPage.tsx
│   ├── ChatsPage.tsx
│   ├── Dashboard.tsx
│   ├── EvaluationPage.tsx
│   ├── LandingPage.tsx
│   ├── LoginPage.tsx
│   ├── RecommendationPage.tsx
│   ├── ReportPage.tsx
│   └── SignupPage.tsx
├── services/          # API and external services
│   └── api.ts         # Centralized API client
├── types/             # TypeScript type definitions
│   └── index.ts
├── utils/             # Utility functions
│   └── index.ts
├── App.tsx            # Main application component
├── main.tsx           # Application entry point
└── index.css          # Global styles
```

## 🔧 Development

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint
- `npm run type-check` - Run TypeScript type checking

### Code Style

- Use TypeScript for all new code
- Follow ESLint configuration
- Use functional components with hooks
- Implement proper error handling
- Write meaningful component and function names

### Adding New Features

1. **Create types** in `src/types/index.ts`
2. **Add API endpoints** in `src/services/api.ts`
3. **Create components** in `src/components/`
4. **Add pages** in `src/pages/`
5. **Update routing** in `src/App.tsx`

## 🔌 Backend Integration

The frontend is designed to work with a RESTful API backend. Key endpoints:

### Authentication

- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration
- `POST /api/auth/refresh` - Token refresh

### Chat Logs

- `GET /api/chat-logs` - Get chat logs with filters
- `GET /api/chat-logs/:id` - Get specific chat log
- `POST /api/chat-logs` - Create new chat log
- `PATCH /api/chat-logs/:id` - Update chat log

### Evaluations

- `GET /api/evaluations` - Get evaluations
- `GET /api/evaluations/:id` - Get specific evaluation
- `POST /api/evaluations` - Create evaluation
- `PATCH /api/evaluations/:id` - Update evaluation

### Dashboard

- `GET /api/dashboard/stats` - Get dashboard statistics

### Users

- `GET /api/users/profile` - Get user profile
- `PATCH /api/users/profile` - Update user profile
- `GET /api/users` - Get all users (managers only)

## 🎨 UI Components

### Design System

The application uses a consistent design system with:

- **Colors**: Tailwind CSS color palette
- **Typography**: Inter font family
- **Spacing**: Consistent 4px grid system
- **Components**: Reusable UI components

### Key Components

- `MetricCard` - Display key performance metrics
- `Chart` - Data visualization components
- `LoadingSkeleton` - Loading state placeholders
- `Sidebar` - Navigation component

## 🔐 Authentication

The application supports:

- **JWT-based authentication**
- **Role-based access control** (Agent/Manager)
- **Token refresh** for session management
- **Demo mode** for testing without backend

## 📊 Data Flow

1. **User Authentication** → AuthContext manages user state
2. **API Calls** → Centralized API service handles requests
3. **State Management** → React Context + custom hooks
4. **UI Updates** → Components re-render based on state changes

## 🚀 Deployment

### Production Build

```bash
npm run build
```

The build output will be in the `dist/` directory.

### Environment Variables

Set these environment variables for production:

```env
VITE_API_BASE_URL=https://your-api-domain.com/api
VITE_ENABLE_DEMO_MODE=false
VITE_ENABLE_ANALYTICS=true
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📝 License

This project is licensed under the MIT License.

## 🆘 Support

For support and questions:

- Create an issue in the repository
- Contact the development team
- Check the documentation

## 🔄 Version History

- **v0.1.0** - Initial release with basic functionality
- **v0.2.0** - Added API integration and enhanced UI
- **v0.3.0** - Improved error handling and performance
