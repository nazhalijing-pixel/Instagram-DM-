import { UserProfile, InstagramAccount, Automation, Contact, InboxMessage, MetaConfig, WebhookLogEvent } from '../types';

export const initialUser: UserProfile = {
  id: 'usr_autoreply_991',
  email: 'dev@autoreply.io',
  name: 'Alex Rivera',
  avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=250&q=80',
  plan: 'pro',
  trial_expires_at: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(), // 5 days left
  created_at: '2026-01-15T10:00:00Z',
};

export const initialInstagramAccount: InstagramAccount = {
  id: 'ig_acc_3301',
  ig_user_id: '17841405829124401',
  username: 'alexrivera.design',
  profile_pic_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=250&q=80',
  followers_count: 48500,
  access_token: 'EAAO8Z3...encrypted_token',
  token_expires_at: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000).toISOString(),
  connected_at: '2026-02-01T08:30:00Z',
  status: 'connected',
};

export const initialAutomations: Automation[] = [
  {
    id: 'auto_na',
    name: 'na',
    trigger_type: 'dm',
    trigger_config: {
      all_or_keywords: 'all',
      keywords: [],
    },
    actions: [
      {
        id: 'act_na_1',
        type: 'send_dm',
        message_text: 'Hello! Thank you for contacting us via Instagram DM.',
      },
    ],
    status: 'active',
    stats: {
      runs: 25,
      dms_sent: 25,
      unique_users: 0,
      open_rate: 100,
    },
    created_at: '2026-08-12T20:30:00Z',
    updated_at: '2026-08-12T20:30:00Z',
  },
  {
    id: 'auto_101',
    name: 'Reel Comment "LINK" → Instant Lead Magnet DM',
    trigger_type: 'comment',
    trigger_config: {
      all_or_keywords: 'keywords',
      keywords: ['LINK', 'EBOOK', 'GUIDE', 'PDF', 'SEND'],
      post_scope: 'any_post',
    },
    actions: [
      {
        id: 'act_101_1',
        type: 'auto_like_comment',
      },
      {
        id: 'act_101_2',
        type: 'reply_comment',
        comment_reply_text: 'Just sent you the full guide in your DMs! Check your inbox 📩✨',
      },
      {
        id: 'act_101_3',
        type: 'send_dm',
        message_text: 'Hey {first_name}! 👋 Thanks for commenting on our Reel! Here is your free 2026 Growth Playbook PDF:',
        buttons: [
          { label: '📥 Download Free Playbook PDF', url: 'https://example.com/playbook.pdf' },
          { label: '🚀 Claim 20% Founder Discount', url: 'https://example.com/discount' },
        ],
      },
    ],
    status: 'active',
    stats: {
      runs: 1842,
      dms_sent: 1795,
      unique_users: 1620,
      open_rate: 96.4,
    },
    created_at: '2026-02-10T14:20:00Z',
    updated_at: '2026-02-12T09:15:00Z',
  },
  {
    id: 'auto_102',
    name: 'DM Keyword "PRICE" → Pricing & Booking Flow',
    trigger_type: 'dm',
    trigger_config: {
      all_or_keywords: 'keywords',
      keywords: ['PRICE', 'COST', 'PRICING', 'RATES', 'QUOTE'],
    },
    actions: [
      {
        id: 'act_102_1',
        type: 'send_dm',
        message_text: 'Hello! 💡 Our consultation & strategy packages start at $499/mo. Tap below to see our complete price sheet and book a free discovery call with our team:',
        buttons: [
          { label: '📊 View 2026 Pricing Sheet', url: 'https://example.com/pricing' },
          { label: '📅 Book 15-Min Strategy Call', url: 'https://calendly.com' },
        ],
      },
    ],
    status: 'active',
    stats: {
      runs: 940,
      dms_sent: 928,
      unique_users: 870,
      open_rate: 98.1,
    },
    created_at: '2026-02-11T10:00:00Z',
    updated_at: '2026-02-12T11:00:00Z',
  },
  {
    id: 'auto_103',
    name: 'Story Reply "VIP" → Secret Promo Code',
    trigger_type: 'story_reply',
    trigger_config: {
      all_or_keywords: 'keywords',
      keywords: ['VIP', 'DEAL', 'CODE', 'PROMO', 'YES'],
      story_scope: 'any_story',
    },
    actions: [
      {
        id: 'act_103_1',
        type: 'send_dm',
        message_text: 'Whoa! You caught our secret story drop! 🔥 Use code VIP30 at checkout to get 30% off any subscription today:',
        buttons: [
          { label: '⚡ Redeem 30% VIP Code', url: 'https://example.com/vip-checkout' },
        ],
      },
    ],
    status: 'active',
    stats: {
      runs: 412,
      dms_sent: 405,
      unique_users: 390,
      open_rate: 94.8,
    },
    created_at: '2026-02-12T08:00:00Z',
    updated_at: '2026-02-12T16:30:00Z',
  },
  {
    id: 'auto_104',
    name: 'AI Chatbot Sales Assistant (Gemini Flash Auto-Reply)',
    trigger_type: 'dm',
    trigger_config: {
      all_or_keywords: 'keywords',
      keywords: ['HELP', 'AI', 'QUESTION', 'INFO', 'HI', 'HELLO', 'SUPPORT', 'BOT'],
    },
    actions: [
      {
        id: 'act_104_1',
        type: 'ai_chatbot',
        ai_system_instruction: 'You are AutoReply.io AI Assistant on Instagram. Help followers answer questions about Instagram DM automation, pricing, and features. Keep responses warm, concise (under 200 characters), and direct them to autoreply.io.',
        ai_model: 'gemini-3.6-flash',
      },
    ],
    status: 'active',
    stats: {
      runs: 696,
      dms_sent: 690,
      unique_users: 685,
      open_rate: 91.2,
    },
    created_at: '2026-02-05T12:00:00Z',
    updated_at: '2026-02-08T15:00:00Z',
  },
];

export const initialContacts: Contact[] = [
  {
    id: 'cnt_001',
    ig_username: 'sarah_creator',
    ig_user_id: 'ig_usr_88201',
    avatar_url: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=150&q=80',
    first_interaction_at: '2026-02-12T18:30:00Z',
    last_interaction_at: '2026-02-12T19:45:00Z',
    interactions: { comments: 4, dms: 8, stories: 2 },
    tags: ['Lead Magnet', 'VIP'],
    status: 'converted',
  },
  {
    id: 'cnt_002',
    ig_username: 'marcus.builds',
    ig_user_id: 'ig_usr_88202',
    avatar_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&q=80',
    first_interaction_at: '2026-02-11T12:00:00Z',
    last_interaction_at: '2026-02-12T17:10:00Z',
    interactions: { comments: 1, dms: 5, stories: 0 },
    tags: ['Pricing Inquiry'],
    status: 'contacted',
  },
  {
    id: 'cnt_003',
    ig_username: 'elena_art',
    ig_user_id: 'ig_usr_88203',
    avatar_url: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=150&q=80',
    first_interaction_at: '2026-02-10T09:15:00Z',
    last_interaction_at: '2026-02-12T15:20:00Z',
    interactions: { comments: 6, dms: 12, stories: 3 },
    tags: ['EBook Lead', 'VIP'],
    status: 'lead',
  },
  {
    id: 'cnt_004',
    ig_username: 'david_growth_hacks',
    ig_user_id: 'ig_usr_88204',
    avatar_url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=150&q=80',
    first_interaction_at: '2026-02-09T11:00:00Z',
    last_interaction_at: '2026-02-11T20:00:00Z',
    interactions: { comments: 2, dms: 3, stories: 1 },
    tags: ['Story Reply'],
    status: 'lead',
  },
  {
    id: 'cnt_005',
    ig_username: 'chloe_agency',
    ig_user_id: 'ig_usr_88205',
    avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80',
    first_interaction_at: '2026-02-08T16:40:00Z',
    last_interaction_at: '2026-02-10T14:10:00Z',
    interactions: { comments: 5, dms: 15, stories: 4 },
    tags: ['Agency Pro', 'VIP'],
    status: 'converted',
  },
];

export const initialInboxMessages: InboxMessage[] = [
  {
    id: 'msg_001',
    from_ig_id: 'ig_usr_88201',
    from_username: 'sarah_creator',
    from_avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=150&q=80',
    message_text: 'Hey! Commenting LINK on your Reel about IG automation!',
    direction: 'in',
    timestamp: '2026-02-12T19:44:00Z',
  },
  {
    id: 'msg_002',
    from_ig_id: '17841405829124401',
    from_username: 'alexrivera.design',
    message_text: 'Hey Sarah! 👋 Thanks for commenting on our Reel! Here is your free 2026 Growth Playbook PDF download link:',
    direction: 'out',
    is_automated: true,
    automation_id: 'auto_101',
    timestamp: '2026-02-12T19:44:02Z',
  },
  {
    id: 'msg_003',
    from_ig_id: 'ig_usr_88201',
    from_username: 'sarah_creator',
    from_avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=150&q=80',
    message_text: 'Wow that was instant!! Thank you so much, downloading now 🔥',
    direction: 'in',
    timestamp: '2026-02-12T19:45:00Z',
  },
  {
    id: 'msg_004',
    from_ig_id: 'ig_usr_88202',
    from_username: 'marcus.builds',
    from_avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&q=80',
    message_text: 'What are your RATES for a custom setup?',
    direction: 'in',
    timestamp: '2026-02-12T17:09:58Z',
  },
  {
    id: 'msg_005',
    from_ig_id: '17841405829124401',
    from_username: 'alexrivera.design',
    message_text: 'Hello! 💡 Our consultation & strategy packages start at $499/mo. Tap below to see our complete price sheet:',
    direction: 'out',
    is_automated: true,
    automation_id: 'auto_102',
    timestamp: '2026-02-12T17:10:00Z',
  },
];

export const initialMetaConfig: MetaConfig = {
  app_id: '891048291039481',
  app_secret: 'a8f9210c48e8312019b882',
  webhook_verify_token: 'tezdm_secret_verify_token_2026',
  redirect_uri: typeof window !== 'undefined' ? `${window.location.origin}/api/auth/instagram/callback` : 'https://autoreply.io/api/auth/instagram/callback',
  is_verified: true,
};

export const initialLogs: WebhookLogEvent[] = [
  {
    id: 'log_01',
    timestamp: new Date(Date.now() - 2 * 60 * 1000).toISOString(),
    trigger_type: 'comment',
    from_username: 'sarah_creator',
    incoming_text: 'LINK please!',
    status: 'triggered',
    matched_automation_name: 'Reel Comment "LINK" → Instant Lead Magnet DM',
    response_sent: 'Sent DM with Playbook PDF link & posted comment reply.',
  },
  {
    id: 'log_02',
    timestamp: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
    trigger_type: 'dm',
    from_username: 'marcus.builds',
    incoming_text: 'PRICE inquiry',
    status: 'triggered',
    matched_automation_name: 'DM Keyword "PRICE" → Pricing & Booking Flow',
    response_sent: 'Sent DM with Price Sheet button link.',
  },
  {
    id: 'log_03',
    timestamp: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
    trigger_type: 'story_reply',
    from_username: 'elena_art',
    incoming_text: 'VIP promo deal',
    status: 'triggered',
    matched_automation_name: 'Story Reply "VIP" → Secret Promo Code',
    response_sent: 'Sent DM with 30% VIP promo code link.',
  },
];

export const initialGeminiKeys = [
  {
    id: 'key_project_a',
    key: process.env.GEMINI_API_KEY || 'AIzaSy_GCP_Project_A_Default_Key',
    label: 'GCP Project Alpha (Main Key)',
    status: 'active' as const,
    cooldownUntil: null,
    requestCount: 142,
    errorCount: 0,
    lastUsedAt: new Date().toISOString(),
  },
  {
    id: 'key_project_b',
    key: 'AIzaSy_GCP_Project_B_Fallback_Key',
    label: 'GCP Project Beta (Rotation Fallback)',
    status: 'active' as const,
    cooldownUntil: null,
    requestCount: 89,
    errorCount: 1,
    lastUsedAt: new Date(Date.now() - 3600000).toISOString(),
  },
  {
    id: 'key_project_c',
    key: 'AIzaSy_GCP_Project_C_Backup_Key',
    label: 'GCP Project Gamma (High-Traffic Backup)',
    status: 'active' as const,
    cooldownUntil: null,
    requestCount: 24,
    errorCount: 0,
    lastUsedAt: new Date(Date.now() - 86400000).toISOString(),
  },
];
