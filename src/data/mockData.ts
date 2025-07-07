import { ChatLog, Evaluation, DashboardStats } from '../types';

export const MOCK_CHATLOGS: ChatLog[] = [
  {
    id: 'chat-001',
    interaction_id: 'chat-001',
    agent_id: '1',
    agent_persona: 'Sarah Johnson',
    created_at: '2024-01-15',
    status: 'completed',
    uploaded_by: '1',
    transcript: [
      {
        sender: 'customer',
        text: 'Hi, I am having trouble with my recent order. It says delivered but I never received it.',
        timestamp: '2024-01-15T10:00:00Z'
      },
      {
        sender: 'agent',
        text: 'I apologize for the inconvenience. Let me look into your order right away. Can you provide me with your order number?',
        timestamp: '2024-01-15T10:02:00Z'
      },
      {
        sender: 'customer',
        text: 'Yes, it\'s ORDER-12345',
        timestamp: '2024-01-15T10:03:00Z'
      },
      {
        sender: 'agent',
        text: 'Thank you. I can see that your order was marked as delivered yesterday at 2 PM. Let me check with our shipping partner and initiate a trace on your package immediately.',
        timestamp: '2024-01-15T10:05:00Z'
      }
    ]
  },
  {
    id: 'chat-002',
    interaction_id: 'chat-002',
    agent_id: '1',
    agent_persona: 'Sarah Johnson',
    created_at: '2024-01-14',
    status: 'completed',
    uploaded_by: '1',
    transcript: [
      {
        sender: 'customer',
        text: 'I want to return this product, it doesn\'t work as expected.',
        timestamp: '2024-01-14T14:00:00Z'
      },
      {
        sender: 'agent',
        text: 'I understand your frustration. Can you tell me more about the issue?',
        timestamp: '2024-01-14T14:02:00Z'
      }
    ]
  },
  {
    id: 'chat-003',
    interaction_id: 'chat-003',
    agent_id: '3',
    agent_persona: 'Alex Rodriguez',
    created_at: '2024-01-13',
    status: 'completed',
    uploaded_by: '3',
    transcript: [
      {
        sender: 'customer',
        text: 'How do I change my billing address?',
        timestamp: '2024-01-13T09:00:00Z'
      },
      {
        sender: 'agent',
        text: 'I can help you with that! You can update your billing address by going to Account Settings > Billing Information.',
        timestamp: '2024-01-13T09:01:00Z'
      }
    ]
  },
  {
    id: 'chat-004',
    interaction_id: 'chat-004',
    agent_id: '2',
    agent_persona: 'Michael Chen',
    created_at: '2024-01-12',
    status: 'completed',
    uploaded_by: '2',
    transcript: [
      {
        sender: 'customer',
        text: 'I need help with my subscription cancellation.',
        timestamp: '2024-01-12T11:00:00Z'
      },
      {
        sender: 'agent',
        text: 'I\'d be happy to help you with your subscription. Let me pull up your account details.',
        timestamp: '2024-01-12T11:01:00Z'
      }
    ]
  },
  {
    id: 'chat-005',
    interaction_id: 'chat-005',
    agent_id: '4',
    agent_persona: 'Emma Davis',
    created_at: '2024-01-11',
    status: 'completed',
    uploaded_by: '4',
    transcript: [
      {
        sender: 'customer',
        text: 'My promo code is not working during checkout.',
        timestamp: '2024-01-11T13:00:00Z'
      },
      {
        sender: 'agent',
        text: 'I apologize for the trouble. Can you share the promo code you are trying to use?',
        timestamp: '2024-01-11T13:01:00Z'
      }
    ]
  },
  {
    id: 'chat-006',
    interaction_id: 'chat-006',
    agent_id: '2',
    agent_persona: 'Michael Chen',
    created_at: '2024-01-10',
    status: 'completed',
    uploaded_by: '2',
    transcript: [
      {
        sender: 'customer',
        text: 'Can I change my delivery address after placing an order?',
        timestamp: '2024-01-10T15:00:00Z'
      },
      {
        sender: 'agent',
        text: 'Yes, you can update your address within 2 hours of placing the order. Would you like me to assist you with this now?',
        timestamp: '2024-01-10T15:01:00Z'
      }
    ]
  },
  {
    id: 'chat-007',
    interaction_id: 'chat-007',
    agent_id: '3',
    agent_persona: 'Alex Rodriguez',
    created_at: '2024-01-09',
    status: 'completed',
    uploaded_by: '3',
    transcript: [
      {
        sender: 'customer',
        text: 'I received the wrong item in my order.',
        timestamp: '2024-01-09T16:00:00Z'
      },
      {
        sender: 'agent',
        text: 'I am sorry for the mix-up. Could you please send me a photo of the item you received?',
        timestamp: '2024-01-09T16:02:00Z'
      }
    ]
  },
  {
    id: 'chat-008',
    interaction_id: 'chat-008',
    agent_id: '1',
    agent_persona: 'Sarah Johnson',
    created_at: '2024-01-08',
    status: 'completed',
    uploaded_by: '1',
    transcript: [
      {
        sender: 'customer',
        text: 'Is there a way to expedite my shipping?',
        timestamp: '2024-01-08T12:00:00Z'
      },
      {
        sender: 'agent',
        text: 'Yes, I can upgrade your shipping to express for an additional fee. Would you like to proceed?',
        timestamp: '2024-01-08T12:01:00Z'
      }
    ]
  },
  {
    id: 'chat-009',
    interaction_id: 'chat-009',
    agent_id: '4',
    agent_persona: 'Emma Davis',
    created_at: '2024-01-07',
    status: 'completed',
    uploaded_by: '4',
    transcript: [
      {
        sender: 'customer',
        text: 'I was double charged for my order.',
        timestamp: '2024-01-07T17:00:00Z'
      },
      {
        sender: 'agent',
        text: 'I apologize for the inconvenience. Let me check your order and process a refund if needed.',
        timestamp: '2024-01-07T17:01:00Z'
      }
    ]
  }
];

export const MOCK_EVALUATIONS: Evaluation[] = [
  {
    id: 'eval-001',
    chat_log_id: 'chat-001',
    coherence: 4,
    relevance: 5,
    politeness: 5,
    resolution: 1,
    reasoning: {
      coherence: { score: 4, reasoning: 'The agent\'s responses were well-structured and logical, maintaining a clear flow throughout the conversation.' },
      relevance: { score: 5, reasoning: 'All responses directly addressed the customer\'s concerns about the missing package.' },
      politeness: { score: 5, reasoning: 'Excellent use of empathetic language and professional tone throughout the interaction.' },
      resolution: { score: 1, reasoning: 'The issue was fully resolved with immediate action taken to trace the package.' }
    }
  },
  {
    id: 'eval-002',
    chat_log_id: 'chat-002',
    coherence: 3,
    relevance: 4,
    politeness: 4,
    resolution: 0,
    reasoning: {
      coherence: { score: 3, reasoning: 'Response was somewhat unclear about the return process.' },
      relevance: { score: 4, reasoning: 'Addressed the return request but lacked specific guidance.' },
      politeness: { score: 4, reasoning: 'Showed empathy but could have been more proactive.' },
      resolution: { score: 0, reasoning: 'Issue remains unresolved due to insufficient information gathering.' }
    }
  },
  {
    id: 'eval-003',
    chat_log_id: 'chat-003',
    coherence: 5,
    relevance: 5,
    politeness: 4,
    resolution: 1,
    reasoning: {
      coherence: { score: 5, reasoning: 'Clear and direct response with logical flow.' },
      relevance: { score: 5, reasoning: 'Perfectly addressed the customer\'s billing address question.' },
      politeness: { score: 4, reasoning: 'Professional and helpful tone.' },
      resolution: { score: 1, reasoning: 'Issue was completely resolved with clear instructions.' }
    }
  }
];

export const MOCK_DASHBOARD_STATS: Record<string, DashboardStats> = {
  '1': {
    avg_coherence: 4.2,
    avg_relevance: 4.5,
    avg_politeness: 4.8,
    avg_resolution: 0.7,
    total_chats: 24,
    unresolved_chats: 3,
    total_evaluations: 24
  },
  '2': {
    avg_coherence: 3.8,
    avg_relevance: 4.1,
    avg_politeness: 4.3,
    avg_resolution: 0.8,
    total_chats: 18,
    unresolved_chats: 2,
    total_evaluations: 18
  },
  '3': {
    avg_coherence: 4.5,
    avg_relevance: 4.7,
    avg_politeness: 4.6,
    avg_resolution: 0.9,
    total_chats: 22,
    unresolved_chats: 1,
    total_evaluations: 22
  },
  manager: {
    avg_coherence: 4.1,
    avg_relevance: 4.3,
    avg_politeness: 4.6,
    avg_resolution: 0.75,
    total_chats: 156,
    unresolved_chats: 12,
    total_evaluations: 156
  }
};

export const MOCK_AGENTS = [
  { id: '1', name: 'Sarah Johnson', email: 'sarah.johnson@company.com' },
  { id: '2', name: 'Michael Chen', email: 'michael.chen@company.com' },
  { id: '3', name: 'Alex Rodriguez', email: 'alex.rodriguez@company.com' },
  { id: '4', name: 'Emma Davis', email: 'emma.davis@company.com' }
];