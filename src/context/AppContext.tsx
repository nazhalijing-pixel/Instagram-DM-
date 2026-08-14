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
  initialUser,
  initialInstagramAccount,
  initialAutomations,
  initialContacts,
  initialInboxMessages,
  initialMetaConfig,
  initialLogs,
  initialGeminiKeys,
} from '../lib/mockData';
import {
  subscribeToCollection,
  saveDocument,
  removeDocument,
  saveMultipleDocuments,
  isFirebaseInitialized,
} from '../lib/firebase';
import { generateGeminiChatReply } from '../lib/geminiKeyRotator';

interface AppContextType {
  user: UserProfile;
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
  isSimulatorOpen: boolean;
  setIsSimulatorOpen: (open: boolean) => void;
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
  
  // Inbox Actions
  sendManualReply: (fromUsername: string, text: string) => void;
  
  // Channel & Config Actions
  updateMetaConfig: (config: Partial<MetaConfig>) => void;
  reauthorizeChannel: () => void;
  disconnectChannel: () => void;
  connectChannel: (username: string) => void;
  renewPlan: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Load initial state with localStorage fallback
  const [user, setUser] = useState<UserProfile>(() => {
    const saved = localStorage.getItem('autoreply_user') || localStorage.getItem('tezdm_user');
    return saved ? JSON.parse(saved) : initialUser;
  });

  const [instagramAccount, setInstagramAccount] = useState<InstagramAccount | null>(() => {
    const saved = localStorage.getItem('autoreply_ig_account') || localStorage.getItem('tezdm_ig_account');
    return saved ? JSON.parse(saved) : initialInstagramAccount;
  });

  const [automations, setAutomations] = useState<Automation[]>(() => {
    const saved = localStorage.getItem('autoreply_automations') || localStorage.getItem('tezdm_automations');
    if (!saved) return initialAutomations;
    try {
      const parsed = JSON.parse(saved);
      if (!parsed.some((a: Automation) => a.name === 'na' || a.id === 'auto_na')) {
        return [initialAutomations[0], ...parsed];
      }
      return parsed;
    } catch (e) {
      return initialAutomations;
    }
  });

  const [contacts, setContacts] = useState<Contact[]>(() => {
    const saved = localStorage.getItem('autoreply_contacts') || localStorage.getItem('tezdm_contacts');
    return saved ? JSON.parse(saved) : initialContacts;
  });

  const [inboxMessages, setInboxMessages] = useState<InboxMessage[]>(() => {
    const saved = localStorage.getItem('autoreply_inbox') || localStorage.getItem('tezdm_inbox');
    return saved ? JSON.parse(saved) : initialInboxMessages;
  });

  const [metaConfig, setMetaConfig] = useState<MetaConfig>(() => {
    const saved = localStorage.getItem('autoreply_meta_config') || localStorage.getItem('tezdm_meta_config');
    return saved ? JSON.parse(saved) : initialMetaConfig;
  });

  const [logs, setLogs] = useState<WebhookLogEvent[]>(() => {
    const saved = localStorage.getItem('autoreply_logs') || localStorage.getItem('tezdm_logs');
    return saved ? JSON.parse(saved) : initialLogs;
  });

  const [geminiKeys, setGeminiKeys] = useState<GeminiApiKeyItem[]>(() => {
    const saved = localStorage.getItem('autoreply_gemini_keys') || localStorage.getItem('tezdm_gemini_keys');
    return saved ? JSON.parse(saved) : initialGeminiKeys;
  });

  const [pausedAiUsers, setPausedAiUsers] = useState<string[]>(() => {
    const saved = localStorage.getItem('autoreply_paused_ai_users') || localStorage.getItem('tezdm_paused_ai_users');
    return saved ? JSON.parse(saved) : [];
  });

  const [activeTab, setActiveTab] = useState<'home' | 'automations' | 'contacts' | 'inbox' | 'settings'>('home');
  const [isBuilderOpen, setIsBuilderOpen] = useState<boolean>(false);
  const [editingAutomation, setEditingAutomation] = useState<Automation | null>(null);
  const [isSimulatorOpen, setIsSimulatorOpen] = useState<boolean>(false);
  const [isConnectModalOpen, setIsConnectModalOpen] = useState<boolean>(false);
  const [isRenewModalOpen, setIsRenewModalOpen] = useState<boolean>(false);

  useEffect(() => {
    localStorage.setItem('autoreply_paused_ai_users', JSON.stringify(pausedAiUsers));
  }, [pausedAiUsers]);

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

  // Sync state to local storage and Firestore
  useEffect(() => {
    localStorage.setItem('autoreply_user', JSON.stringify(user));
  }, [user]);

  useEffect(() => {
    localStorage.setItem('autoreply_ig_account', JSON.stringify(instagramAccount));
  }, [instagramAccount]);

  useEffect(() => {
    localStorage.setItem('autoreply_automations', JSON.stringify(automations));
  }, [automations]);

  useEffect(() => {
    localStorage.setItem('autoreply_contacts', JSON.stringify(contacts));
  }, [contacts]);

  useEffect(() => {
    localStorage.setItem('autoreply_inbox', JSON.stringify(inboxMessages));
  }, [inboxMessages]);

  useEffect(() => {
    localStorage.setItem('autoreply_meta_config', JSON.stringify(metaConfig));
  }, [metaConfig]);

  useEffect(() => {
    localStorage.setItem('autoreply_logs', JSON.stringify(logs));
  }, [logs]);

  useEffect(() => {
    localStorage.setItem('autoreply_gemini_keys', JSON.stringify(geminiKeys));
  }, [geminiKeys]);

  // Firestore real-time sync listeners
  useEffect(() => {
    if (!isFirebaseInitialized) return;

    const unsubscribeAutomations = subscribeToCollection<Automation>('automations', (data) => {
      if (data && data.length > 0) {
        setAutomations(data);
      } else {
        saveMultipleDocuments('automations', initialAutomations);
      }
    });

    const unsubscribeContacts = subscribeToCollection<Contact>('contacts', (data) => {
      if (data && data.length > 0) {
        setContacts(data);
      } else {
        saveMultipleDocuments('contacts', initialContacts);
      }
    });

    const unsubscribeInbox = subscribeToCollection<InboxMessage>('inbox_messages', (data) => {
      if (data && data.length > 0) {
        setInboxMessages(data.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()));
      } else {
        saveMultipleDocuments('inbox_messages', initialInboxMessages);
      }
    });

    const unsubscribeLogs = subscribeToCollection<WebhookLogEvent>('webhook_logs', (data) => {
      if (data && data.length > 0) {
        setLogs(data.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()));
      } else {
        saveMultipleDocuments('webhook_logs', initialLogs);
      }
    });

    const unsubscribeKeys = subscribeToCollection<GeminiApiKeyItem>('gemini_api_keys', (data) => {
      if (data && data.length > 0) {
        setGeminiKeys(data);
      } else {
        saveMultipleDocuments('gemini_api_keys', initialGeminiKeys);
      }
    });

    return () => {
      unsubscribeAutomations();
      unsubscribeContacts();
      unsubscribeInbox();
      unsubscribeLogs();
      unsubscribeKeys();
    };
  }, []);

  // Automation CRUD
  const createAutomation = (newAuto: Omit<Automation, 'id' | 'created_at' | 'updated_at' | 'stats'>) => {
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
    saveDocument('automations', created);
  };

  const updateAutomation = (id: string, updates: Partial<Automation>) => {
    setAutomations((prev) =>
      prev.map((auto) => {
        if (auto.id === id) {
          const updated = { ...auto, ...updates, updated_at: new Date().toISOString() };
          saveDocument('automations', updated);
          return updated;
        }
        return auto;
      })
    );
  };

  const deleteAutomation = (id: string) => {
    setAutomations((prev) => prev.filter((auto) => auto.id !== id));
    removeDocument('automations', id);
  };

  const toggleAutomationStatus = (id: string) => {
    setAutomations((prev) =>
      prev.map((auto) => {
        if (auto.id === id) {
          const updated = { ...auto, status: auto.status === 'active' ? ('paused' as const) : ('active' as const) };
          saveDocument('automations', updated);
          return updated;
        }
        return auto;
      })
    );
  };

  // Gemini Key Management Actions
  const addGeminiKey = (key: string, label: string) => {
    const newKeyItem: GeminiApiKeyItem = {
      id: `key_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      key: key.trim(),
      label: label.trim(),
      status: 'active',
      cooldownUntil: null,
      requestCount: 0,
      errorCount: 0,
      lastUsedAt: new Date().toISOString(),
    };
    setGeminiKeys((prev) => [newKeyItem, ...prev]);
    saveDocument('gemini_api_keys', newKeyItem);
  };

  const deleteGeminiKey = (id: string) => {
    setGeminiKeys((prev) => prev.filter((k) => k.id !== id));
    removeDocument('gemini_api_keys', id);
  };

  const updateGeminiKey = (id: string, updates: Partial<GeminiApiKeyItem>) => {
    setGeminiKeys((prev) =>
      prev.map((k) => {
        if (k.id === id) {
          const updated = { ...k, ...updates };
          saveDocument('gemini_api_keys', updated);
          return updated;
        }
        return k;
      })
    );
  };

  // Simulator & Webhook Engine implementation with AI Chatbot support
  const simulateWebhookEvent = async (triggerType: TriggerType, username: string, incomingText: string): Promise<WebhookLogEvent> => {
    const cleanUser = username.replace(/^@/, '').toLowerCase();
    const upperText = incomingText.toUpperCase();
    const nowIso = new Date().toISOString();

    // Check if AI conversion / auto-reply is paused for this user due to Human Interference or manual toggle
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
      saveDocument('inbox_messages', newInMsg);

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
      saveDocument('webhook_logs', logEntry);
      return logEntry;
    }

    // Find matching active automation
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
      saveDocument('webhook_logs', logEntry);
      return logEntry;
    }

    // Process matched automation actions
    let responseSummary = '';
    const aiAction = matched.actions.find((a) => a.type === 'ai_chatbot');
    const dmAction = matched.actions.find((a) => a.type === 'send_dm');
    const commentReplyAction = matched.actions.find((a) => a.type === 'reply_comment');

    if (aiAction) {
      // 1. Fetch contact's previous chat history from Firestore / inboxMessages
      const previousHistory = inboxMessages
        .filter((m) => m.from_username.toLowerCase() === cleanUser)
        .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
        .slice(-10)
        .map((m) => ({
          role: m.direction === 'in' ? ('user' as const) : ('model' as const),
          text: m.message_text,
        }));

      // 2. Send history + incoming message to Gemini API with multi-key rotation fallback
      let aiReplyText = 'Hello! Thanks for reaching out. How can I assist you today?';
      let usedKeyLabel = 'Primary Key Pool';

      try {
        const aiResult = await generateGeminiChatReply({
          history: previousHistory,
          incomingText: incomingText,
          systemInstruction: aiAction.ai_system_instruction,
          model: aiAction.ai_model || 'gemini-3.6-flash',
          keysPool: geminiKeys,
          onKeyStatusChange: (updatedKeys) => {
            setGeminiKeys(updatedKeys);
            saveMultipleDocuments('gemini_api_keys', updatedKeys);
          },
        });
        aiReplyText = aiResult.reply;
        usedKeyLabel = aiResult.usedKeyLabel;
      } catch (err) {
        console.error('Gemini AI Chatbot execution error:', err);
      }

      responseSummary += `AI Chatbot (${usedKeyLabel}): "${aiReplyText.slice(0, 45)}..." `;

      // 3. Save Gemini's reply & incoming message back to Firestore
      const newInMsg: InboxMessage = {
        id: `msg_in_${Date.now()}`,
        from_ig_id: `ig_usr_${cleanUser}`,
        from_username: cleanUser,
        from_avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${cleanUser}`,
        message_text: incomingText,
        direction: 'in',
        timestamp: nowIso,
      };

      const newOutMsg: InboxMessage = {
        id: `msg_out_${Date.now()}`,
        from_ig_id: instagramAccount?.ig_user_id || '17841405829124401',
        from_username: instagramAccount?.username || 'alexrivera.design',
        message_text: aiReplyText,
        direction: 'out',
        is_automated: true,
        automation_id: matched.id,
        timestamp: new Date(Date.now() + 800).toISOString(),
      };

      setInboxMessages((prev) => [newOutMsg, newInMsg, ...prev]);
      saveDocument('inbox_messages', newInMsg);
      saveDocument('inbox_messages', newOutMsg);
    }

    if (dmAction && dmAction.message_text) {
      const formattedMessage = dmAction.message_text.replace('{first_name}', cleanUser);
      responseSummary += `Sent DM: "${formattedMessage.slice(0, 45)}..." `;

      const newInMsg: InboxMessage = {
        id: `msg_in_${Date.now()}`,
        from_ig_id: `ig_usr_${cleanUser}`,
        from_username: cleanUser,
        from_avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${cleanUser}`,
        message_text: incomingText,
        direction: 'in',
        timestamp: nowIso,
      };

      const newOutMsg: InboxMessage = {
        id: `msg_out_${Date.now()}`,
        from_ig_id: instagramAccount?.ig_user_id || '17841405829124401',
        from_username: instagramAccount?.username || 'alexrivera.design',
        message_text: formattedMessage,
        direction: 'out',
        is_automated: true,
        automation_id: matched.id,
        timestamp: new Date(Date.now() + 1000).toISOString(),
      };

      setInboxMessages((prev) => [newOutMsg, newInMsg, ...prev]);
      saveDocument('inbox_messages', newInMsg);
      saveDocument('inbox_messages', newOutMsg);
    }

    if (commentReplyAction && commentReplyAction.comment_reply_text) {
      responseSummary += `Comment Reply posted. `;
    }

    // Update Automation stats
    setAutomations((prev) =>
      prev.map((a) => {
        if (a.id === matched.id) {
          const updated = {
            ...a,
            stats: {
              ...a.stats,
              runs: a.stats.runs + 1,
              dms_sent: dmAction || aiAction ? a.stats.dms_sent + 1 : a.stats.dms_sent,
              unique_users: a.stats.unique_users + 1,
            },
            updated_at: nowIso,
          };
          saveDocument('automations', updated);
          return updated;
        }
        return a;
      })
    );

    // Update Contacts list
    setContacts((prev) => {
      const existing = prev.find((c) => c.ig_username.toLowerCase() === cleanUser);
      if (existing) {
        return prev.map((c) => {
          if (c.ig_username.toLowerCase() === cleanUser) {
            const updated = {
              ...c,
              last_interaction_at: nowIso,
              interactions: {
                ...c.interactions,
                comments: triggerType === 'comment' ? c.interactions.comments + 1 : c.interactions.comments,
                dms: triggerType === 'dm' ? c.interactions.dms + 1 : c.interactions.dms,
                stories: triggerType === 'story_reply' ? c.interactions.stories + 1 : c.interactions.stories,
              },
            };
            saveDocument('contacts', updated);
            return updated;
          }
          return c;
        });
      } else {
        const newContact: Contact = {
          id: `cnt_${Date.now()}`,
          ig_username: cleanUser,
          ig_user_id: `ig_usr_${cleanUser}`,
          avatar_url: `https://api.dicebear.com/7.x/avataaars/svg?seed=${cleanUser}`,
          first_interaction_at: nowIso,
          last_interaction_at: nowIso,
          interactions: {
            comments: triggerType === 'comment' ? 1 : 0,
            dms: triggerType === 'dm' ? 1 : 0,
            stories: triggerType === 'story_reply' ? 1 : 0,
          },
          tags: [matched.name.slice(0, 15)],
          status: 'lead',
        };
        saveDocument('contacts', newContact);
        return [newContact, ...prev];
      }
    });

    const logEntry: WebhookLogEvent = {
      id: `log_${Date.now()}`,
      timestamp: nowIso,
      trigger_type: triggerType,
      from_username: cleanUser,
      incoming_text: incomingText,
      status: 'triggered',
      matched_automation_name: matched.name,
      response_sent: responseSummary,
    };

    setLogs((prev) => [logEntry, ...prev]);
    saveDocument('webhook_logs', logEntry);
    return logEntry;
  };

  const sendManualReply = (fromUsername: string, text: string) => {
    const cleanUser = fromUsername.replace(/^@/, '').toLowerCase();
    const nowIso = new Date().toISOString();
    const newMsg: InboxMessage = {
      id: `msg_manual_${Date.now()}`,
      from_ig_id: instagramAccount?.ig_user_id || '17841405829124401',
      from_username: instagramAccount?.username || 'alexrivera.design',
      message_text: text,
      direction: 'out',
      is_automated: false,
      timestamp: nowIso,
    };
    setInboxMessages((prev) => [newMsg, ...prev]);
    saveDocument('inbox_messages', newMsg);

    // Human Interference Detected: Automatically pause AI auto-reply for this user!
    setAiPausedForUser(cleanUser, true);
  };

  const updateMetaConfig = (config: Partial<MetaConfig>) => {
    setMetaConfig((prev) => ({ ...prev, ...config }));
  };

  const reauthorizeChannel = () => {
    if (instagramAccount) {
      setInstagramAccount({
        ...instagramAccount,
        token_expires_at: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString(),
        status: 'connected',
      });
    }
  };

  const disconnectChannel = () => {
    setInstagramAccount(null);
  };

  const connectChannel = (username: string) => {
    const clean = username.replace(/^@/, '');
    const newAccount: InstagramAccount = {
      id: `ig_acc_${Date.now()}`,
      ig_user_id: `17841${Math.floor(Math.random() * 1000000000)}`,
      username: clean || 'brand.official',
      profile_pic_url: `https://api.dicebear.com/7.x/avataaars/svg?seed=${clean}`,
      followers_count: 12500,
      access_token: 'EAAO8Z3...encrypted_token',
      token_expires_at: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString(),
      connected_at: new Date().toISOString(),
      status: 'connected',
    };
    setInstagramAccount(newAccount);
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
        isSimulatorOpen,
        setIsSimulatorOpen,
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
        sendManualReply,
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
