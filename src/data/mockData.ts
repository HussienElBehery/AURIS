import { ChatLog, Evaluation, DashboardStats } from '../types';

export const MOCK_CHATLOGS: ChatLog[] = [
  {
    id: 'chat-001',
    agentId: '1',
    agentName: 'Sarah Johnson',
    date: '2024-01-15',
    resolved: true,
    messages: [
      {
        id: 'msg-001',
        sender: 'customer',
        content: 'Hi, I am having trouble with my recent order. It says delivered but I never received it.',
        timestamp: '2024-01-15T10:00:00Z'
      },
      {
        id: 'msg-002',
        sender: 'agent',
        content: 'I apologize for the inconvenience. Let me look into your order right away. Can you provide me with your order number?',
        timestamp: '2024-01-15T10:02:00Z'
      },
      {
        id: 'msg-003',
        sender: 'customer',
        content: 'Yes, it\'s ORDER-12345',
        timestamp: '2024-01-15T10:03:00Z'
      },
      {
        id: 'msg-004',
        sender: 'agent',
        content: 'Thank you. I can see that your order was marked as delivered yesterday at 2 PM. Let me check with our shipping partner and initiate a trace on your package immediately.',
        timestamp: '2024-01-15T10:05:00Z'
      }
    ]
  },
  {
    id: 'chat-002',
    agentId: '1',
    agentName: 'Sarah Johnson',
    date: '2024-01-14',
    resolved: false,
    messages: [
      {
        id: 'msg-005',
        sender: 'customer',
        content: 'I want to return this product, it doesn\'t work as expected.',
        timestamp: '2024-01-14T14:00:00Z'
      },
      {
        id: 'msg-006',
        sender: 'agent',
        content: 'I understand your frustration. Can you tell me more about the issue?',
        timestamp: '2024-01-14T14:02:00Z'
      }
    ]
  },
  {
    id: 'chat-003',
    agentId: '3',
    agentName: 'Alex Rodriguez',
    date: '2024-01-13',
    resolved: true,
    messages: [
      {
        id: 'msg-007',
        sender: 'customer',
        content: 'How do I change my billing address?',
        timestamp: '2024-01-13T09:00:00Z'
      },
      {
        id: 'msg-008',
        sender: 'agent',
        content: 'I can help you with that! You can update your billing address by going to Account Settings > Billing Information.',
        timestamp: '2024-01-13T09:01:00Z'
      }
    ]
  },
  {
    id: 'chat-004',
    agentId: '2',
    agentName: 'Michael Chen',
    date: '2024-01-12',
    resolved: true,
    messages: [
      {
        id: 'msg-009',
        sender: 'customer',
        content: 'I need help with my subscription cancellation.',
        timestamp: '2024-01-12T11:00:00Z'
      },
      {
        id: 'msg-010',
        sender: 'agent',
        content: 'I\'d be happy to help you with your subscription. Let me pull up your account details.',
        timestamp: '2024-01-12T11:01:00Z'
      }
    ]
  }
];

export const MOCK_EVALUATIONS: Evaluation[] = [
  {
    id: 'eval-001',
    chatLogId: 'chat-001',
    coherence: 4,
    relevance: 5,
    politeness: 5,
    resolution: 1,
    reasoning: {
      coherence: 'The agent\'s responses were well-structured and logical, maintaining a clear flow throughout the conversation.',
      relevance: 'All responses directly addressed the customer\'s concerns about the missing package.',
      politeness: 'Excellent use of empathetic language and professional tone throughout the interaction.',
      resolution: 'The issue was fully resolved with immediate action taken to trace the package.'
    },
    guidelines: [
      { name: 'Acknowledge customer concern', passed: true, description: 'Agent properly acknowledged the delivery issue' },
      { name: 'Ask clarifying questions', passed: true, description: 'Requested order number for investigation' },
      { name: 'Provide clear next steps', passed: true, description: 'Explained tracing process clearly' },
      { name: 'Use empathetic language', passed: true, description: 'Apologized and showed understanding' }
    ],
    issues: [],
    highlights: [
      'Immediate acknowledgment of issue',
      'Proactive solution offering',
      'Clear communication of next steps'
    ],
    recommendation: {
      original: 'Thank you. I can see that your order was marked as delivered yesterday at 2 PM. Let me check with our shipping partner and initiate a trace on your package immediately.',
      improved: 'Thank you for providing that information. I can see your order ORDER-12345 was marked as delivered yesterday at 2 PM to your address. Since you haven\'t received it, I\'m immediately initiating a package trace with our shipping partner and will also check if there were any delivery issues reported. You should receive an update within 24 hours, and I\'ll personally follow up with you tomorrow. In the meantime, I\'m also preparing a replacement shipment that we can send if the original package isn\'t located.',
      reasoning: 'The improved version provides more specific details, sets clear expectations for follow-up, and offers proactive solutions.',
      coaching: [
        'Always include specific order details when referencing customer information',
        'Set clear timelines for follow-up communications',
        'Offer proactive solutions before customers need to ask'
      ]
    }
  },
  {
    id: 'eval-002',
    chatLogId: 'chat-002',
    coherence: 3,
    relevance: 4,
    politeness: 4,
    resolution: 0,
    reasoning: {
      coherence: 'Response was somewhat unclear about the return process.',
      relevance: 'Addressed the return request but lacked specific guidance.',
      politeness: 'Showed empathy but could have been more proactive.',
      resolution: 'Issue remains unresolved due to insufficient information gathering.'
    },
    guidelines: [
      { name: 'Acknowledge customer concern', passed: true, description: 'Agent acknowledged frustration' },
      { name: 'Ask clarifying questions', passed: false, description: 'Should have asked more specific questions about the issue' },
      { name: 'Provide clear next steps', passed: false, description: 'No clear return process explained' },
      { name: 'Use empathetic language', passed: true, description: 'Showed understanding of frustration' }
    ],
    issues: [
      'Incomplete information gathering',
      'No clear return process outlined',
      'Missing product-specific troubleshooting'
    ],
    highlights: [
      'Empathetic response to customer frustration'
    ],
    recommendation: {
      original: 'I understand your frustration. Can you tell me more about the issue?',
      improved: 'I completely understand your frustration with the product not working as expected. I\'d be happy to help you with a return or exchange. To better assist you, could you please tell me: 1) What specific issue are you experiencing? 2) When did you purchase the item? 3) Have you tried any troubleshooting steps? Based on your answers, I can guide you through our return process or help resolve the issue.',
      reasoning: 'The improved version shows more empathy, provides structure, asks specific questions, and offers multiple solution paths.',
      coaching: [
        'Ask specific, structured questions to gather complete information',
        'Offer multiple solution options upfront',
        'Provide clear next steps even when gathering information'
      ]
    }
  },
  {
    id: 'eval-003',
    chatLogId: 'chat-003',
    coherence: 5,
    relevance: 5,
    politeness: 4,
    resolution: 1,
    reasoning: {
      coherence: 'Clear and direct response with logical flow.',
      relevance: 'Perfectly addressed the customer\'s billing address question.',
      politeness: 'Professional and helpful tone.',
      resolution: 'Issue was completely resolved with clear instructions.'
    },
    guidelines: [
      { name: 'Acknowledge customer concern', passed: true, description: 'Offered immediate help' },
      { name: 'Ask clarifying questions', passed: true, description: 'Not needed for this simple request' },
      { name: 'Provide clear next steps', passed: true, description: 'Gave specific navigation instructions' },
      { name: 'Use empathetic language', passed: true, description: 'Enthusiastic and helpful tone' }
    ],
    issues: [],
    highlights: [
      'Quick and accurate response',
      'Clear step-by-step instructions',
      'Enthusiastic willingness to help'
    ]
  }
];

export const MOCK_DASHBOARD_STATS: Record<string, DashboardStats> = {
  '1': {
    avgCoherence: 4.2,
    avgRelevance: 4.5,
    avgPoliteness: 4.8,
    avgResolution: 0.7,
    totalChats: 24,
    unresolvedChats: 3
  },
  '2': {
    avgCoherence: 3.8,
    avgRelevance: 4.1,
    avgPoliteness: 4.3,
    avgResolution: 0.8,
    totalChats: 18,
    unresolvedChats: 2
  },
  '3': {
    avgCoherence: 4.5,
    avgRelevance: 4.7,
    avgPoliteness: 4.6,
    avgResolution: 0.9,
    totalChats: 22,
    unresolvedChats: 1
  },
  manager: {
    avgCoherence: 4.1,
    avgRelevance: 4.3,
    avgPoliteness: 4.6,
    avgResolution: 0.75,
    totalChats: 156,
    unresolvedChats: 12
  }
};

export const MOCK_AGENTS = [
  { id: '1', name: 'Sarah Johnson', email: 'sarah.johnson@company.com' },
  { id: '2', name: 'Michael Chen', email: 'michael.chen@company.com' },
  { id: '3', name: 'Alex Rodriguez', email: 'alex.rodriguez@company.com' },
  { id: '4', name: 'Emma Davis', email: 'emma.davis@company.com' }
];