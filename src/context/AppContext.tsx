import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  UserProfile,
  InstagramAccount,
  Automation,
  Contact,
  InboxMessage,
  MetaConfig,
  WebhookLogEvent,
  TriggerType,
  GeminiApiKeyItem,
} from '../types';
import {
  auth,
  signOut,
  onAuthStateChanged,
  signInAnonymously,
  User,
  subscribeToUserCollection,
  saveUserDocument,
  removeUserDocument,
  checkAndMigrateExistingData,
  isFirebaseInitialized,
} from '../lib/firebase';
import { generateGeminiChatReply } from '../lib/geminiKeyRotator';

const defaultMetaConfig: MetaConfig = {
  app_id: '2300969844066002',
  app_secret: 'a8f9210c48e8312019b882',
  webhook_verify_token: 'Nazha125',
  redirect_uri: `${typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000'}/api/auth/instagram/callback`,
};

interface AppContextType {
  user: UserProfile;
  firebaseUser: User | null;
  authLoading: boolean;
  logout: () => Promise<void>;
  
  instagramAccount: InstagramAccount | null;
  automations: Automation[];
  contacts: Contact[];
  inboxMessages: InboxMessage[];
  metaConfig: MetaConfig;
  logs: WebhookLogEvent[];
  geminiKeys: GeminiApiKeyItem[];
  pausedAiUsers: string[];
  activeTab: 'home' | 'automations' | 'contacts' | 'inbox' | 'settings';
  setActiveTab: (tab: 'home' | 'automations' | 'contacts' | 'inbox' | 'settings') => void;
  
  // Modals & Builder States
  isBuilderOpen: boolean;
  setIsBuilderOpen: (open: boolean) => void;
  editingAutomation: Automation | null;
  setEditingAutomation: (auto: Automation | null) => void;
  isConnectModalOpen: boolean;
  setIsConnectModalOpen: (open: boolean) => void;
  isRenewModalOpen: boolean;
  setIsRenewModalOpen: (open: boolean) => void;

  // AI Conversion Toggle (Human Takeover)
  isAiPausedForUser: (username: string) => boolean;
  toggleAiForUser: (username: string) => void;
  setAiPausedForUser: (username: string, paused: boolean) => void;

  // Actions
  createAutomation: (newAuto: Omit<Automation, 'id' | 'created_at' | 'updated_at' | 'stats'>) => void;
  updateAutomation: (id: string, updates: Partial<Automation>) => void;
  deleteAutomation: (id: string) => void;
  toggleAutomationStatus: (id: string) => void;
  
  // Gemini Keys Management
  addGeminiKey: (key: string, label: string) => void;
  deleteGeminiKey: (id: string) => void;
  updateGeminiKey: (id: string, updates: Partial<GeminiApiKeyItem>) => void;

  // Simulator & Webhook Engine
  simulateWebhookEvent: (triggerType: TriggerType, username: string, incomingText: string) => Promise<WebhookLogEvent>;
  triggerWebhookSimulation: (params: { trigger_type: TriggerType; username: string; text: string }) => Promise<WebhookLogEvent>;
  
  // Inbox Actions
  sendManualReply: (fromUsername: string, text: string) => void;
  
  // Deletion Actions (Permanent DB Removal)
  deleteContact: (contactId: string, username?: string) => Promise<void>;
  deleteContactsBulk: (contactIds: string[], usernames?: string[]) => Promise<void>;
  deleteInboxThread: (username: string) => Promise<void>;
  deleteInboxThreadsBulk: (usernames: string[]) => Promise<void>;

  // Channel & Config Actions
  updateMetaConfig: (config: Partial<MetaConfig>) => void;
  reauthorizeChannel: () => void;
  disconnectChannel: () => Promise<void>;
  connectChannel: (account: Partial<InstagramAccount> | string) => Promise<void>;
  renewPlan: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const MOCK_HANDLES = ['sarah_creator', 'marcus.builds', 'elena_art', 'david_growth_hacks', 'chloe_agency', 'alexrivera.design'];

const filterOutMockContacts = (items: Contact[]): Contact[] => {
  return (items || []).filter(
    (item) =>
      item &&
      (item.ig_username || item.ig_user_id) &&
      !MOCK_HANDLES.includes((item.ig_username || '').toLowerCase())
  );
};

const filterOutMockMessages = (items: InboxMessage[]): InboxMessage[] => {
  return (items || []).filter(
    (item) =>
      item &&
      (item.from_username || item.from_ig_id) &&
      !MOCK_HANDLES.includes((item.from_username || '').toLowerCase())
  );
};

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState<boolean>(false);

  const [user, setUser] = useState<UserProfile>({
    id: 'primary_user',
    name: 'Creator Admin',
    email: 'admin@autoreply.io',
    avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=250&q=80',
    plan: 'pro',
    trial_expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    created_at: new Date().toISOString(),
  });

  const [instagramAccount, setInstagramAccount] = useState<InstagramAccount | null>(null);
  const [automations, setAutomations] = useState<Automation[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [inboxMessages, setInboxMessages] = useState<InboxMessage[]>([]);
  const [metaConfig, setMetaConfig] = useState<MetaConfig>(defaultMetaConfig);
  const [logs, setLogs] = useState<WebhookLogEvent[]>([]);
  const [geminiKeys, setGeminiKeys] = useState<GeminiApiKeyItem[]>([]);
  const [pausedAiUsers, setPausedAiUsers] = useState<string[]>([]);

  const [activeTab, setActiveTab] = useState<'home' | 'automations' | 'contacts' | 'inbox' | 'settings'>('home');
  const [isBuilderOpen, setIsBuilderOpen] = useState<boolean>(false);
  const [editingAutomation, setEditingAutomation] = useState<Automation | null>(null);
  const [isConnectModalOpen, setIsConnectModalOpen] = useState<boolean>(false);
  const [isRenewModalOpen, setIsRenewModalOpen] = useState<boolean>(false);

  // 1. Listen for Firebase Auth State Changes & Silent Background Init
  useEffect(() => {
    if (!auth) {
      setAuthLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (currUser) => {
      setFirebaseUser(currUser);
      if (currUser) {
        const userProfile: UserProfile = {
          id: currUser.uid,
          name: currUser.displayName || currUser.email?.split('@')[0] || 'Creator Admin',
          email: currUser.email || 'admin@autoreply.io',
          avatar_url: currUser.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${currUser.uid}`,
          plan: 'pro',
          trial_expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          created_at: currUser.metadata.creationTime || new Date().toISOString(),
        };
        setUser(userProfile);

        // Run safe migration check if needed
        try {
          await checkAndMigrateExistingData(currUser.uid, currUser.email || '');
        } catch (mErr) {
          console.warn('[MIGRATION_CHECK_ERR]', mErr);
        }
      } else {
        // Attempt silent background anonymous auth if available
        try {
          signInAnonymously(auth).catch(() => {
            // If anonymous auth is disabled, fallback silently to primary_user
          });
        } catch {}
      }
      setAuthLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // 2. Multi-Tenant Firestore Synchronization (Scoped by active UID or fallback)
  useEffect(() => {
    if (!isFirebaseInitialized) {
      return;
    }

    const uid = firebaseUser?.uid || 'primary_user';

    const unsubscribeAutomations = subscribeToUserCollection<Automation>(uid, 'automations', (data) => {
      if (data && data.length > 0) {
        const sanitized: Automation[] = data.map((auto) => ({
          ...auto,
          id: auto.id || `auto_${Date.now()}`,
          name: auto.name || 'Untitled Automation',
          trigger_type: auto.trigger_type || 'dm',
          trigger_config: {
            all_or_keywords: auto.trigger_config?.all_or_keywords || 'keywords',
            keywords: Array.isArray(auto.trigger_config?.keywords) ? auto.trigger_config.keywords : [],
            smart_matching: auto.trigger_config?.smart_matching ?? true,
            story_scope: auto.trigger_config?.story_scope || 'any_story',
            post_scope: auto.trigger_config?.post_scope || 'any_post',
            specific_post_url: auto.trigger_config?.specific_post_url || '',
          },
          actions: Array.isArray(auto.actions) ? auto.actions : [],
          status: auto.status || 'active',
          stats: {
            runs: Number(auto.stats?.runs) || 0,
            dms_sent: Number(auto.stats?.dms_sent) || 0,
            unique_users: Number(auto.stats?.unique_users) || 0,
            open_rate: typeof auto.stats?.open_rate === 'number' ? auto.stats.open_rate : 98,
          },
          created_at: auto.created_at || new Date().toISOString(),
          updated_at: auto.updated_at || new Date().toISOString(),
        }));
        setAutomations(sanitized);
      }
    });

    const unsubscribeContacts = subscribeToUserCollection<Contact>(uid, 'contacts', (data) => {
      if (data) {
        const sanitized: Contact[] = data.map((c) => ({
          ...c,
          id: c.id || `contact_${Date.now()}`,
          ig_username: c.ig_username || c.ig_user_id || 'instagram_user',
          ig_user_id: c.ig_user_id || '',
          avatar_url: c.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${c.ig_username || 'user'}`,
          first_interaction_at: c.first_interaction_at || new Date().toISOString(),
          last_interaction_at: c.last_interaction_at || new Date().toISOString(),
          interactions: {
            comments: Number(c.interactions?.comments) || 0,
            dms: Number(c.interactions?.dms) || 0,
            stories: Number(c.interactions?.stories) || 0,
          },
          tags: Array.isArray(c.tags) ? c.tags : [],
          status: c.status || 'converted',
        }));
        setContacts(filterOutMockContacts(sanitized));
      }
    });

    const unsubscribeInbox = subscribeToUserCollection<InboxMessage>(uid, 'inbox_messages', (data) => {
      if (data) {
        const sanitized: InboxMessage[] = data.map((m) => ({
          ...m,
          id: m.id || `msg_${Date.now()}`,
          from_ig_id: m.from_ig_id || '',
          from_username: m.from_username || m.from_ig_id || 'instagram_user',
          from_avatar: m.from_avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${m.from_username || 'user'}`,
          message_text: m.message_text || '',
          direction: m.direction || 'in',
          timestamp: m.timestamp || new Date().toISOString(),
        }));
        const filtered = filterOutMockMessages(sanitized);
        setInboxMessages(filtered.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()));
      }
    });

    const unsubscribeLogs = subscribeToUserCollection<WebhookLogEvent>(uid, 'webhook_logs', (data) => {
      if (data) {
        setLogs(data.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()));
      }
    });

    const unsubscribeKeys = subscribeToUserCollection<GeminiApiKeyItem>(uid, 'gemini_api_keys', (data) => {
      if (data) {
        setGeminiKeys(data);
      }
    });

    const unsubscribeAccount = subscribeToUserCollection<InstagramAccount>(uid, 'instagram_account', (data) => {
      if (data && data.length > 0) {
        setInstagramAccount(data[0]);
      }
    });

    return () => {
      unsubscribeAutomations();
      unsubscribeContacts();
      unsubscribeInbox();
      unsubscribeLogs();
      unsubscribeKeys();
      unsubscribeAccount();
    };
  }, [firebaseUser?.uid]);

  // AI Human Takeover state
  const isAiPausedForUser = (username: string): boolean => {
    if (!username) return false;
    const clean = username.replace(/^@/, '').toLowerCase();
    return pausedAiUsers.some((u) => u.toLowerCase() === clean);
  };

  const toggleAiForUser = (username: string) => {
    if (!username) return;
    const clean = username.replace(/^@/, '').toLowerCase();
    setPausedAiUsers((prev) => {
      const exists = prev.some((u) => u.toLowerCase() === clean);
      if (exists) {
        return prev.filter((u) => u.toLowerCase() !== clean);
      } else {
        return [...prev, clean];
      }
    });
  };

  const setAiPausedForUser = (username: string, paused: boolean) => {
    if (!username) return;
    const clean = username.replace(/^@/, '').toLowerCase();
    setPausedAiUsers((prev) => {
      const exists = prev.some((u) => u.toLowerCase() === clean);
      if (paused && !exists) {
        return [...prev, clean];
      } else if (!paused && exists) {
        return prev.filter((u) => u.toLowerCase() !== clean);
      }
      return prev;
    });
  };

  // 3. Handle OAuth callback parameters, window postMessage events, and initial account load
  useEffect(() => {
    const uid = firebaseUser?.uid || 'primary_user';

    // Fetch initial account state on mount or user change
    fetch(`/api/instagram/account?userId=${encodeURIComponent(uid)}`)
      .then((res) => res.json())
      .then((data) => {
        if (data && data.account) {
          const formatted = { ...data.account, id: 'primary' };
          setInstagramAccount((prev) => prev || formatted);
        }
      })
      .catch(console.warn);

    const searchParams = new URLSearchParams(window.location.search);
    const statusParam = searchParams.get('status');

    if (statusParam === 'ig_connected') {
      fetch(`/api/instagram/account?userId=${encodeURIComponent(uid)}`)
        .then((res) => res.json())
        .then((data) => {
          if (data && data.account) {
            const formatted = { ...data.account, id: 'primary' };
            setInstagramAccount(formatted);
            saveUserDocument(uid, 'instagram_account', formatted);
          }
        })
        .catch(console.warn)
        .finally(() => {
          if (window.history && window.history.replaceState) {
            const cleanUrl = window.location.pathname + (window.location.hash || '');
            window.history.replaceState({}, document.title, cleanUrl);
          }
        });
    }

    const handleMessage = (event: MessageEvent) => {
      if (event.data === 'ig_connected' || event.data?.type === 'ig_connected') {
        fetch(`/api/instagram/account?userId=${encodeURIComponent(uid)}`)
          .then((res) => res.json())
          .then((data) => {
            if (data && data.account) {
              const formatted = { ...data.account, id: 'primary' };
              setInstagramAccount(formatted);
              saveUserDocument(uid, 'instagram_account', formatted);
            }
          })
          .catch(console.warn);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [firebaseUser?.uid]);

  // Logout Handler
  const logout = async () => {
    if (auth) {
      await signOut(auth);
    }
    setInstagramAccount(null);
    setAutomations([]);
    setContacts([]);
    setInboxMessages([]);
    setLogs([]);
    setGeminiKeys([]);
    setActiveTab('home');
  };

  // Automation CRUD (Scoped by UID)
  const createAutomation = (newAuto: Omit<Automation, 'id' | 'created_at' | 'updated_at' | 'stats'>) => {
    const uid = firebaseUser?.uid || 'primary_user';
    const created: Automation = {
      ...newAuto,
      id: `auto_${Date.now()}`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      stats: {
        runs: 0,
        dms_sent: 0,
        unique_users: 0,
        open_rate: 100,
      },
    };
    setAutomations((prev) => [created, ...prev]);
    saveUserDocument(uid, 'automations', created);
  };

  const updateAutomation = (id: string, updates: Partial<Automation>) => {
    const uid = firebaseUser?.uid || 'primary_user';
    setAutomations((prev) =>
      prev.map((auto) => {
        if (auto.id === id) {
          const updated = { ...auto, ...updates, updated_at: new Date().toISOString() };
          saveUserDocument(uid, 'automations', updated);
          return updated;
        }
        return auto;
      })
    );
  };

  const deleteAutomation = (id: string) => {
    const uid = firebaseUser?.uid || 'primary_user';
    setAutomations((prev) => prev.filter((auto) => auto.id !== id));
    removeUserDocument(uid, 'automations', id);
  };

  const toggleAutomationStatus = (id: string) => {
    const uid = firebaseUser?.uid || 'primary_user';
    setAutomations((prev) =>
      prev.map((auto) => {
        if (auto.id === id) {
          const updated = { ...auto, status: auto.status === 'active' ? ('paused' as const) : ('active' as const) };
          saveUserDocument(uid, 'automations', updated);
          return updated;
        }
        return auto;
      })
    );
  };

  // Gemini Key Management Actions (Scoped by UID)
  const addGeminiKey = (key: string, label: string) => {
    const uid = firebaseUser?.uid || 'primary_user';
    const newKeyItem: GeminiApiKeyItem = {
      id: `key_${Date.now()}`,
      key: key.trim(),
      label: label.trim(),
      status: 'active',
      cooldownUntil: null,
      requestCount: 0,
      errorCount: 0,
      lastUsedAt: new Date().toISOString(),
    };
    setGeminiKeys((prev) => [newKeyItem, ...prev]);
    saveUserDocument(uid, 'gemini_api_keys', newKeyItem);
  };

  const deleteGeminiKey = (id: string) => {
    const uid = firebaseUser?.uid || 'primary_user';
    setGeminiKeys((prev) => prev.filter((k) => k.id !== id));
    removeUserDocument(uid, 'gemini_api_keys', id);
  };

  const updateGeminiKey = (id: string, updates: Partial<GeminiApiKeyItem>) => {
    const uid = firebaseUser?.uid || 'primary_user';
    setGeminiKeys((prev) =>
      prev.map((k) => {
        if (k.id === id) {
          const updated = { ...k, ...updates };
          saveUserDocument(uid, 'gemini_api_keys', updated);
          return updated;
        }
        return k;
      })
    );
  };

  // Simulator & Webhook Engine implementation
  const simulateWebhookEvent = async (triggerType: TriggerType, username: string, incomingText: string): Promise<WebhookLogEvent> => {
    const uid = firebaseUser?.uid || 'guest';
    const cleanUser = username.replace(/^@/, '').toLowerCase();
    const upperText = incomingText.toUpperCase();
    const nowIso = new Date().toISOString();

    if (isAiPausedForUser(cleanUser)) {
      const newInMsg: InboxMessage = {
        id: `msg_in_${Date.now()}`,
        from_ig_id: `ig_usr_${cleanUser}`,
        from_username: cleanUser,
        from_avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${cleanUser}`,
        message_text: incomingText,
        direction: 'in',
        timestamp: nowIso,
      };
      setInboxMessages((prev) => [newInMsg, ...prev]);
      if (firebaseUser?.uid) saveUserDocument(firebaseUser.uid, 'inbox_messages', newInMsg);

      const logEntry: WebhookLogEvent = {
        id: `log_${Date.now()}`,
        timestamp: nowIso,
        trigger_type: triggerType,
        from_username: cleanUser,
        incoming_text: incomingText,
        status: 'ignored',
        response_sent: `AI Auto-Response stopped (Human Interference / Takeover Active for @${cleanUser}).`,
      };
      setLogs((prev) => [logEntry, ...prev]);
      if (firebaseUser?.uid) saveUserDocument(firebaseUser.uid, 'webhook_logs', logEntry);
      return logEntry;
    }

    const matched = automations.find((auto) => {
      if (auto.status !== 'active') return false;
      if (auto.trigger_type !== triggerType) return false;

      const { all_or_keywords, keywords } = auto.trigger_config;
      if (all_or_keywords === 'all') return true;

      return keywords.some((kw) => upperText.includes(kw.toUpperCase()));
    });

    if (!matched) {
      const logEntry: WebhookLogEvent = {
        id: `log_${Date.now()}`,
        timestamp: nowIso,
        trigger_type: triggerType,
        from_username: cleanUser,
        incoming_text: incomingText,
        status: 'ignored',
        response_sent: 'No active automation keywords matched.',
      };
      setLogs((prev) => [logEntry, ...prev]);
      if (firebaseUser?.uid) saveUserDocument(firebaseUser.uid, 'webhook_logs', logEntry);
      return logEntry;
    }

    let responseSummary = '';
    const aiAction = matched.actions.find((a) => a.type === 'ai_chatbot');
    const dmAction = matched.actions.find((a) => a.type === 'send_dm');
    const commentReplyAction = matched.actions.find((a) => a.type === 'reply_comment');

    if (aiAction) {
      // Limit context history to last 2 messages for ultra-fast processing
      const previousHistory = (inboxMessages || [])
        .filter((m) => m?.from_username?.toLowerCase() === cleanUser)
        .sort((a, b) => new Date(a?.timestamp || 0).getTime() - new Date(b?.timestamp || 0).getTime())
        .slice(-2)
        .map((m) => ({
          role: (m.direction === 'in' ? 'user' : 'model') as 'user' | 'model',
          text: m.message_text || '',
        }));

      try {
        const aiResponse = await generateGeminiChatReply({
          history: previousHistory,
          incomingText,
          systemInstruction: aiAction.ai_system_instruction || 'You are a helpful and polite Instagram assistant. Reply directly in 1 short sentence.',
          model: (aiAction.ai_model as any) || 'gemini-3.1-flash-lite',
          maxOutputTokens: 60,
        });
        responseSummary = aiResponse.reply;
      } catch (err: any) {
        responseSummary = 'Thanks for your message! Our team will reach back out to you shortly.';
      }
    } else if (dmAction && dmAction.message_text) {
      responseSummary = dmAction.message_text;
    } else if (commentReplyAction && commentReplyAction.comment_reply_text) {
      responseSummary = commentReplyAction.comment_reply_text;
    } else {
      responseSummary = 'Automation trigger acknowledged.';
    }

    const inMsg: InboxMessage = {
      id: `msg_in_${Date.now()}`,
      from_ig_id: `ig_usr_${cleanUser}`,
      from_username: cleanUser,
      from_avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${cleanUser}`,
      message_text: incomingText,
      direction: 'in',
      timestamp: nowIso,
    };

    const outMsg: InboxMessage = {
      id: `msg_out_${Date.now() + 1}`,
      from_ig_id: `ig_usr_${cleanUser}`,
      from_username: cleanUser,
      from_avatar: instagramAccount?.profile_pic_url || 'https://api.dicebear.com/7.x/avataaars/svg?seed=autoreply',
      message_text: responseSummary,
      direction: 'out',
      is_automated: true,
      automation_id: matched.id,
      timestamp: new Date(Date.now() + 1000).toISOString(),
    };

    const userUid = uid || firebaseUser?.uid || 'primary_user';
    setInboxMessages((prev) => [outMsg, inMsg, ...prev]);
    saveUserDocument(userUid, 'inbox_messages', inMsg);
    saveUserDocument(userUid, 'inbox_messages', outMsg);

    // Also trigger backend test-webhook endpoint asynchronously
    fetch('/api/test-webhook', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        trigger_type: triggerType,
        username: cleanUser,
        text: incomingText,
        userId: userUid,
      }),
    }).catch((err) => console.warn('[TEST_WEBHOOK_CALL_WARN]', err));

    // Upsert Contact
    const existingContact = contacts.find((c) => c.ig_username.toLowerCase() === cleanUser);
    const updatedContact: Contact = {
      id: existingContact ? existingContact.id : `cnt_${Date.now()}`,
      ig_username: cleanUser,
      ig_user_id: existingContact ? existingContact.ig_user_id : `ig_${Date.now()}`,
      avatar_url: `https://api.dicebear.com/7.x/avataaars/svg?seed=${cleanUser}`,
      first_interaction_at: existingContact ? existingContact.first_interaction_at : nowIso,
      last_interaction_at: nowIso,
      interactions: {
        comments: (existingContact?.interactions.comments || 0) + (triggerType === 'comment' ? 1 : 0),
        dms: (existingContact?.interactions.dms || 0) + (triggerType === 'dm' ? 1 : 0),
        stories: (existingContact?.interactions.stories || 0) + (triggerType === 'story_reply' ? 1 : 0),
      },
      status: 'converted',
    };

    setContacts((prev) => {
      const filtered = prev.filter((c) => c.ig_username.toLowerCase() !== cleanUser);
      return [updatedContact, ...filtered];
    });
    saveUserDocument(uid, 'contacts', updatedContact);

    // Update Automation Stats
    updateAutomation(matched.id, {
      stats: {
        ...matched.stats,
        runs: (matched.stats?.runs || 0) + 1,
        dms_sent: (matched.stats?.dms_sent || 0) + 1,
      },
    });

    const finalLog: WebhookLogEvent = {
      id: `log_${Date.now()}`,
      timestamp: nowIso,
      trigger_type: triggerType,
      from_username: cleanUser,
      incoming_text: incomingText,
      status: 'triggered',
      matched_automation_name: matched.name,
      response_sent: responseSummary,
    };

    setLogs((prev) => [finalLog, ...prev]);
    saveUserDocument(uid, 'webhook_logs', finalLog);

    return finalLog;
  };

  const triggerWebhookSimulation = async (params: {
    trigger_type: TriggerType;
    username: string;
    text: string;
  }): Promise<WebhookLogEvent> => {
    return simulateWebhookEvent(params.trigger_type, params.username, params.text);
  };

  const sendManualReply = async (fromUsername: string, text: string) => {
    if (!text.trim()) return;
    const cleanUser = fromUsername.replace(/^@/, '').toLowerCase();
    const nowIso = new Date().toISOString();
    const uid = firebaseUser?.uid || 'primary_user';

    const newOutMsg: InboxMessage = {
      id: `msg_out_${Date.now()}`,
      from_ig_id: `ig_usr_${cleanUser}`,
      from_username: cleanUser,
      from_avatar: instagramAccount?.profile_pic_url || 'https://api.dicebear.com/7.x/avataaars/svg?seed=autoreply',
      message_text: text.trim(),
      direction: 'out',
      is_automated: false,
      timestamp: nowIso,
    };

    setInboxMessages((prev) => [newOutMsg, ...prev]);
    saveUserDocument(uid, 'inbox_messages', newOutMsg);

    // Auto pause AI for this contact since human intervened
    setAiPausedForUser(cleanUser, true);

    // Dispatch live Instagram Graph API call to send message to recipient
    try {
      await fetch('/api/instagram/send-dm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipientUsername: cleanUser,
          messageText: text.trim(),
          userId: uid,
        }),
      });
    } catch (err) {
      console.warn('[SEND_MANUAL_DM_DISPATCH_WARN]', err);
    }
  };

  // Contacts & Inbox Deletion (Scoped by UID)
  const deleteContact = async (contactId: string, username?: string) => {
    if (!contactId && !username) return;
    const uid = firebaseUser?.uid || 'primary_user';

    await removeUserDocument(uid, 'contacts', contactId);

    const targetUsername = username || contacts.find((c) => c.id === contactId)?.ig_username;
    if (targetUsername) {
      const cleanTarget = targetUsername.toLowerCase();
      const msgsToDelete = inboxMessages.filter(
        (m) => m.from_username?.toLowerCase() === cleanTarget
      );
      for (const msg of msgsToDelete) {
        await removeUserDocument(uid, 'inbox_messages', msg.id);
      }
      setInboxMessages((prev) =>
        prev.filter((m) => m.from_username?.toLowerCase() !== cleanTarget)
      );
    }

    setContacts((prev) => prev.filter((c) => c.id !== contactId));

    try {
      await fetch('/api/contacts/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contactId, username: targetUsername, userId: uid }),
      });
    } catch (e) {
      console.warn('[DELETE_CONTACT_API_WARN]', e);
    }
  };

  const deleteContactsBulk = async (contactIds: string[], usernames: string[] = []) => {
    if (!contactIds || contactIds.length === 0) return;
    const uid = firebaseUser?.uid || 'primary_user';

    for (const cid of contactIds) {
      await removeUserDocument(uid, 'contacts', cid);
    }

    const targetUsernames = new Set<string>(usernames.map((u) => u.toLowerCase()));
    contacts.forEach((c) => {
      if (contactIds.includes(c.id)) {
        targetUsernames.add(c.ig_username.toLowerCase());
      }
    });

    const msgsToDelete = inboxMessages.filter(
      (m) => m.from_username && targetUsernames.has(m.from_username.toLowerCase())
    );
    for (const msg of msgsToDelete) {
      await removeUserDocument(uid, 'inbox_messages', msg.id);
    }

    setContacts((prev) => prev.filter((c) => !contactIds.includes(c.id)));
    setInboxMessages((prev) =>
      prev.filter((m) => !m.from_username || !targetUsernames.has(m.from_username.toLowerCase()))
    );

    try {
      await fetch('/api/contacts/bulk-delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contactIds, usernames: Array.from(targetUsernames), userId: uid }),
      });
    } catch (e) {
      console.warn('[DELETE_CONTACTS_BULK_API_WARN]', e);
    }
  };

  const deleteInboxThread = async (username: string) => {
    if (!username) return;
    const uid = firebaseUser?.uid || 'primary_user';
    const cleanUname = username.toLowerCase();

    const msgsToDelete = inboxMessages.filter(
      (m) => m.from_username?.toLowerCase() === cleanUname
    );
    for (const msg of msgsToDelete) {
      await removeUserDocument(uid, 'inbox_messages', msg.id);
    }

    setInboxMessages((prev) =>
      prev.filter((m) => m.from_username?.toLowerCase() !== cleanUname)
    );

    try {
      await fetch('/api/inbox/delete-thread', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, userId: uid }),
      });
    } catch (e) {
      console.warn('[DELETE_INBOX_THREAD_API_WARN]', e);
    }
  };

  const deleteInboxThreadsBulk = async (usernames: string[]) => {
    if (!usernames || usernames.length === 0) return;
    const uid = firebaseUser?.uid || 'primary_user';
    const targets = new Set(usernames.map((u) => u.toLowerCase()));

    const msgsToDelete = inboxMessages.filter(
      (m) => m.from_username && targets.has(m.from_username.toLowerCase())
    );
    for (const msg of msgsToDelete) {
      await removeUserDocument(uid, 'inbox_messages', msg.id);
    }

    setInboxMessages((prev) =>
      prev.filter((m) => !m.from_username || !targets.has(m.from_username.toLowerCase()))
    );

    try {
      await fetch('/api/inbox/bulk-delete-threads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ usernames, userId: uid }),
      });
    } catch (e) {
      console.warn('[DELETE_INBOX_BULK_API_WARN]', e);
    }
  };

  const updateMetaConfig = (config: Partial<MetaConfig>) => {
    setMetaConfig((prev) => ({ ...prev, ...config }));
  };

  const reauthorizeChannel = () => {
    setIsConnectModalOpen(true);
  };

  const disconnectChannel = async () => {
    const uid = firebaseUser?.uid || 'primary_user';
    await removeUserDocument(uid, 'instagram_account', 'primary');
    if (instagramAccount?.id) {
      await removeUserDocument(uid, 'instagram_account', instagramAccount.id);
    }
    setInstagramAccount(null);
    try {
      await fetch('/api/instagram/account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ account: null, userId: uid }),
      });
    } catch (err) {
      console.warn('[DISCONNECT_CHANNEL_ERR]', err);
    }
  };

  const connectChannel = async (accountInput: Partial<InstagramAccount> | string) => {
    let cleanUsername = '';
    let accountObj: Partial<InstagramAccount> = {};
    if (typeof accountInput === 'string') {
      cleanUsername = accountInput.replace(/^@/, '').trim();
      accountObj = { username: cleanUsername };
    } else {
      cleanUsername = (accountInput.username || '').replace(/^@/, '').trim();
      accountObj = accountInput;
    }
    if (!cleanUsername) return;

    const uid = firebaseUser?.uid || 'primary_user';
    const newAccount: InstagramAccount = {
      id: 'primary',
      ig_user_id: accountObj.ig_user_id || `ig_user_${cleanUsername}`,
      username: cleanUsername,
      profile_pic_url: accountObj.profile_pic_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${cleanUsername}`,
      followers_count: typeof accountObj.followers_count === 'number' ? accountObj.followers_count : 2480,
      access_token: accountObj.access_token || '',
      token_expires_at: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString(),
      connected_at: new Date().toISOString(),
      status: 'connected',
    };

    setInstagramAccount(newAccount);
    await saveUserDocument(uid, 'instagram_account', newAccount);

    try {
      await fetch('/api/instagram/account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ account: newAccount, userId: uid }),
      });
    } catch (err) {
      console.warn('[CONNECT_CHANNEL_API_ERR]', err);
    }
    setIsConnectModalOpen(false);
  };

  const renewPlan = () => {
    setUser((prev) => ({
      ...prev,
      plan: 'pro',
      trial_expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    }));
    setIsRenewModalOpen(false);
  };

  return (
    <AppContext.Provider
      value={{
        user,
        firebaseUser,
        authLoading,
        logout,
        instagramAccount,
        automations,
        contacts,
        inboxMessages,
        metaConfig,
        logs,
        geminiKeys,
        pausedAiUsers,
        activeTab,
        setActiveTab,
        isBuilderOpen,
        setIsBuilderOpen,
        editingAutomation,
        setEditingAutomation,
        isConnectModalOpen,
        setIsConnectModalOpen,
        isRenewModalOpen,
        setIsRenewModalOpen,
        isAiPausedForUser,
        toggleAiForUser,
        setAiPausedForUser,
        createAutomation,
        updateAutomation,
        deleteAutomation,
        toggleAutomationStatus,
        addGeminiKey,
        deleteGeminiKey,
        updateGeminiKey,
        simulateWebhookEvent,
        triggerWebhookSimulation,
        sendManualReply,
        deleteContact,
        deleteContactsBulk,
        deleteInboxThread,
        deleteInboxThreadsBulk,
        updateMetaConfig,
        reauthorizeChannel,
        disconnectChannel,
        connectChannel,
        renewPlan,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
