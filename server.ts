import express, { Request, Response } from 'express';
import path from 'path';
import { readFileSync } from 'fs';
import { createServer as createViteServer } from 'vite';
import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getFirestore,
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  deleteDoc,
  query,
  where,
  Firestore,
} from 'firebase/firestore';
import { Agent, setGlobalDispatcher } from 'undici';
import {
  generateGeminiChatReply,
  generateGeminiChatStream,
  getLocalKeyPool,
  setLocalKeyPool,
} from './src/lib/geminiKeyRotator';
import {
  Automation,
  Contact,
  InboxMessage,
  InstagramAccount,
  WebhookLogEvent,
  GeminiApiKeyItem,
} from './src/types';

// Configure high-performance persistent connection pooling with TCP Keep-Alive
const globalHttpDispatcher = new Agent({
  keepAliveTimeout: 90000,
  keepAliveMaxTimeout: 120000,
  pipelining: 1,
  connections: 50,
  connect: {
    timeout: 3000,
  },
});
setGlobalDispatcher(globalHttpDispatcher);

// Record Instance Boot Timestamp to measure uptime and confirm warm instance status
const SERVER_BOOT_TIMESTAMP = Date.now();
const SERVER_BOOT_ISO = new Date().toISOString();
console.log(`🚀 [SERVER_BOOT] Instance initialized at ${SERVER_BOOT_ISO} (${SERVER_BOOT_TIMESTAMP}ms) - Warm and ready for incoming Meta webhooks`);

// Pre-warm TCP + TLS handshakes with Meta Graph & Gemini endpoints to eliminate cold DNS/TLS latency
function preWarmHttpConnections() {
  const hosts = [
    'https://graph.instagram.com',
    'https://graph.facebook.com',
    'https://generativelanguage.googleapis.com',
  ];
  for (const host of hosts) {
    fetch(host, { method: 'HEAD', signal: AbortSignal.timeout(2000) }).catch(() => {});
  }
}
preWarmHttpConnections();
setInterval(preWarmHttpConnections, 45000); // Periodic keep-alive pulse every 45s

// Initialize Firebase Firestore for Server-Side Webhook Processing & Persistence
let db: Firestore | null = null;
try {
  const configPath = path.join(process.cwd(), 'firebase-applet-config.json');
  const firebaseConfig = JSON.parse(readFileSync(configPath, 'utf-8'));
  const firebaseApp = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
  db = firebaseConfig.firestoreDatabaseId
    ? getFirestore(firebaseApp, firebaseConfig.firestoreDatabaseId)
    : getFirestore(firebaseApp);
  console.log('[FIREBASE_SERVER] Initialized Firestore successfully for database:', firebaseConfig.firestoreDatabaseId);
} catch (err) {
  console.warn('[FIREBASE_SERVER_INIT_WARN] Could not initialize Firestore on server:', err);
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Config store for Meta Instagram Webhook & OAuth
  const metaConfigStore = {
    app_id: process.env.INSTAGRAM_APP_ID || '',
    app_secret: process.env.INSTAGRAM_APP_SECRET || '',
    webhook_verify_token:
      process.env.WEBHOOK_VERIFY_TOKEN ||
      process.env.VERIFY_TOKEN ||
      'autoreply_meta_verify_secret_token_2026',
    redirect_uri:
      process.env.REDIRECT_URI ||
      `${process.env.APP_URL || 'http://localhost:3000'}/api/auth/instagram/callback`,
  };

  let connectedInstagramAccountMemory: InstagramAccount | null = null;

  // Helper: Sanitize & Clean Meta/Instagram Access Tokens
  // Strips wrapping quotes, whitespace, and recursively decodes URL-encoded characters (%2F, %3D, %2B, etc.) to store & send clean raw ASCII tokens.
  function sanitizeAccessToken(rawToken: string | null | undefined): string {
    if (!rawToken) return '';
    let token = String(rawToken).trim();

    // Strip wrapping single or double quotes
    if ((token.startsWith('"') && token.endsWith('"')) || (token.startsWith("'") && token.endsWith("'"))) {
      token = token.slice(1, -1).trim();
    }

    // Handle URL-encoded strings (e.g., %2F, %3D, %2B, %20, etc.)
    if (token.includes('%')) {
      try {
        let prev = '';
        while (token.includes('%') && token !== prev) {
          prev = token;
          token = decodeURIComponent(token);
        }
      } catch (err) {
        console.warn('[SANITIZE_TOKEN_DECODE_ERR] Could not decode token string:', err);
      }
    }

    return token.trim();
  }

  // Dynamic working endpoint memoization for sub-second HTTP dispatch (< 200ms)
  let lastSuccessfulDmEndpoint: string | null = null;
  let lastSuccessfulCommentEndpoint: string | null = null;

  // Multi-endpoint Direct Message Dispatcher with Exact Telemetry Logging & Instant Memoized Endpoint
  async function sendInstagramDirectMessageWithFallback(params: {
    accessToken: string;
    senderId: string;
    recipientId?: string;
    messageText: string;
  }): Promise<{
    success: boolean;
    result: any;
    endpointUsed?: string;
    reply_api_call_start: string;
    reply_api_call_start_ms: number;
    reply_api_call_end: string;
    reply_api_call_end_ms: number;
    ig_api_duration_ms: number;
  }> {
    const { accessToken, senderId, recipientId, messageText } = params;
    const cleanToken = sanitizeAccessToken(accessToken);
    const nowIso = new Date().toISOString();
    const nowMs = Date.now();

    if (!cleanToken || cleanToken.includes('encrypted_token') || cleanToken.includes('sandbox_token')) {
      return {
        success: false,
        result: { note: 'Simulation / no live token' },
        reply_api_call_start: nowIso,
        reply_api_call_start_ms: nowMs,
        reply_api_call_end: nowIso,
        reply_api_call_end_ms: nowMs,
        ig_api_duration_ms: 0,
      };
    }

    const candidateEndpoints: string[] = [];

    // Prioritize the last known working endpoint for instantaneous ~150-250ms dispatch
    if (lastSuccessfulDmEndpoint) {
      candidateEndpoints.push(lastSuccessfulDmEndpoint);
    }

    const standardEndpoints = [
      `https://graph.instagram.com/v21.0/me/messages`,
      `https://graph.facebook.com/v21.0/me/messages`,
    ];

    for (const ep of standardEndpoints) {
      if (!candidateEndpoints.includes(ep)) {
        candidateEndpoints.push(ep);
      }
    }

    if (recipientId && recipientId !== 'primary' && recipientId !== 'me') {
      const customIg = `https://graph.instagram.com/v21.0/${encodeURIComponent(recipientId)}/messages`;
      const customFb = `https://graph.facebook.com/v21.0/${encodeURIComponent(recipientId)}/messages`;
      if (!candidateEndpoints.includes(customIg)) candidateEndpoints.push(customIg);
      if (!candidateEndpoints.includes(customFb)) candidateEndpoints.push(customFb);
    }

    let lastResult: any = null;
    let apiCallStartIso = '';
    let apiCallStartMs = 0;
    let apiCallEndIso = '';
    let apiCallEndMs = 0;
    let apiDurationMs = 0;
    let successfulEndpoint = '';

    for (const endpoint of candidateEndpoints) {
      try {
        const url = `${endpoint}?access_token=${encodeURIComponent(cleanToken)}`;
        apiCallStartMs = Date.now();
        apiCallStartIso = new Date().toISOString();

        console.log(`\n📤 [REPLY_API_CALL_START] Timestamp: ${apiCallStartIso} (${apiCallStartMs}ms)`);
        console.log(`   Posting DM to: ${endpoint} for senderId: ${senderId}`);

        const res = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${cleanToken}`,
            'Connection': 'keep-alive',
          },
          body: JSON.stringify({
            recipient: { id: senderId },
            message: { text: messageText },
          }),
          signal: AbortSignal.timeout(2800),
        });

        apiCallEndMs = Date.now();
        apiCallEndIso = new Date().toISOString();
        apiDurationMs = apiCallEndMs - apiCallStartMs;

        const data = await res.json();
        lastResult = data;

        console.log(`📥 [REPLY_API_CALL_END] Timestamp: ${apiCallEndIso} (${apiCallEndMs}ms)`);
        console.log(`   Instagram Graph API Duration: ${apiDurationMs}ms | HTTP Status: ${res.status}`);
        console.log(`   Response body:`, JSON.stringify(data));

        if (res.ok && (data.message_id || data.recipient_id || data.success === true)) {
          lastSuccessfulDmEndpoint = endpoint;
          successfulEndpoint = endpoint;
          return {
            success: true,
            result: data,
            endpointUsed: endpoint,
            reply_api_call_start: apiCallStartIso,
            reply_api_call_start_ms: apiCallStartMs,
            reply_api_call_end: apiCallEndIso,
            reply_api_call_end_ms: apiCallEndMs,
            ig_api_duration_ms: apiDurationMs,
          };
        }
      } catch (err: any) {
        apiCallEndMs = Date.now();
        apiCallEndIso = new Date().toISOString();
        apiDurationMs = apiCallEndMs - apiCallStartMs;
        console.warn(`⚠️ [REPLY_API_CALL_FAIL] Timestamp: ${apiCallEndIso} (${apiCallEndMs}ms) | Duration: ${apiDurationMs}ms | Error on ${endpoint}:`, err);
        lastResult = { error: String(err?.message || err) };
      }
    }

    return {
      success: false,
      result: lastResult,
      endpointUsed: successfulEndpoint || candidateEndpoints[0],
      reply_api_call_start: apiCallStartIso || nowIso,
      reply_api_call_start_ms: apiCallStartMs || nowMs,
      reply_api_call_end: apiCallEndIso || nowIso,
      reply_api_call_end_ms: apiCallEndMs || nowMs,
      ig_api_duration_ms: apiDurationMs,
    };
  }

  // Multi-endpoint Comment Reply Dispatcher with Exact Telemetry Logging
  async function sendInstagramCommentReplyWithFallback(params: {
    accessToken: string;
    commentId: string;
    messageText: string;
  }): Promise<{
    success: boolean;
    result: any;
    endpointUsed?: string;
    reply_api_call_start: string;
    reply_api_call_start_ms: number;
    reply_api_call_end: string;
    reply_api_call_end_ms: number;
    ig_api_duration_ms: number;
  }> {
    const { accessToken, commentId, messageText } = params;
    const cleanToken = sanitizeAccessToken(accessToken);
    const nowIso = new Date().toISOString();
    const nowMs = Date.now();

    if (!cleanToken || !commentId || cleanToken.includes('encrypted_token') || cleanToken.includes('sandbox_token')) {
      return {
        success: false,
        result: { note: 'Simulation / no live token' },
        reply_api_call_start: nowIso,
        reply_api_call_start_ms: nowMs,
        reply_api_call_end: nowIso,
        reply_api_call_end_ms: nowMs,
        ig_api_duration_ms: 0,
      };
    }

    const candidateEndpoints: string[] = [];
    if (lastSuccessfulCommentEndpoint) {
      candidateEndpoints.push(lastSuccessfulCommentEndpoint);
    }

    const standardEndpoints = [
      `https://graph.instagram.com/v21.0/${encodeURIComponent(commentId)}/replies`,
      `https://graph.facebook.com/v21.0/${encodeURIComponent(commentId)}/replies`,
    ];

    for (const ep of standardEndpoints) {
      if (!candidateEndpoints.includes(ep)) {
        candidateEndpoints.push(ep);
      }
    }

    let lastResult: any = null;
    let apiCallStartIso = '';
    let apiCallStartMs = 0;
    let apiCallEndIso = '';
    let apiCallEndMs = 0;
    let apiDurationMs = 0;
    let successfulEndpoint = '';

    for (const endpoint of candidateEndpoints) {
      try {
        const url = `${endpoint}?access_token=${encodeURIComponent(cleanToken)}`;
        apiCallStartMs = Date.now();
        apiCallStartIso = new Date().toISOString();

        console.log(`\n📤 [REPLY_COMMENT_API_CALL_START] Timestamp: ${apiCallStartIso} (${apiCallStartMs}ms) | URL: ${endpoint}`);

        const res = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${cleanToken}`,
            'Connection': 'keep-alive',
          },
          body: JSON.stringify({ message: messageText }),
          signal: AbortSignal.timeout(2800),
        });

        apiCallEndMs = Date.now();
        apiCallEndIso = new Date().toISOString();
        apiDurationMs = apiCallEndMs - apiCallStartMs;

        const data = await res.json();
        lastResult = data;

        console.log(`📥 [REPLY_COMMENT_API_CALL_END] Timestamp: ${apiCallEndIso} (${apiCallEndMs}ms) | Duration: ${apiDurationMs}ms | Status: ${res.status}`);

        if (res.ok && (data.id || data.success === true)) {
          lastSuccessfulCommentEndpoint = endpoint;
          successfulEndpoint = endpoint;
          return {
            success: true,
            result: data,
            endpointUsed: endpoint,
            reply_api_call_start: apiCallStartIso,
            reply_api_call_start_ms: apiCallStartMs,
            reply_api_call_end: apiCallEndIso,
            reply_api_call_end_ms: apiCallEndMs,
            ig_api_duration_ms: apiDurationMs,
          };
        }
      } catch (err: any) {
        apiCallEndMs = Date.now();
        apiCallEndIso = new Date().toISOString();
        apiDurationMs = apiCallEndMs - apiCallStartMs;
        console.warn(`⚠️ [REPLY_COMMENT_API_CALL_FAIL] Timestamp: ${apiCallEndIso} (${apiCallEndMs}ms) | Duration: ${apiDurationMs}ms | Error on ${endpoint}:`, err);
        lastResult = { error: String(err?.message || err) };
      }
    }

    return {
      success: false,
      result: lastResult,
      endpointUsed: successfulEndpoint || candidateEndpoints[0],
      reply_api_call_start: apiCallStartIso || nowIso,
      reply_api_call_start_ms: apiCallStartMs || nowMs,
      reply_api_call_end: apiCallEndIso || nowIso,
      reply_api_call_end_ms: apiCallEndMs || nowMs,
      ig_api_duration_ms: apiDurationMs,
    };
  }

  // Subscribed Apps Helper: Calls Meta Graph API to subscribe app to receiving Instagram Webhook events
  async function subscribeAppToInstagramWebhooks(igUserId: string, rawAccessToken: string) {
    const accessToken = sanitizeAccessToken(rawAccessToken);
    if (!accessToken || accessToken.includes('encrypted_token') || accessToken.includes('sandbox_token')) {
      console.log('[SUBSCRIBE_APPS] Skipping Meta subscription API call: No valid live token provided.');
      return { success: false, reason: 'no_valid_token' };
    }

    const fields = 'messages,messaging_postbacks,message_deliveries,message_reads,comments,mentions';
    const targetId = igUserId && igUserId !== 'primary' ? igUserId : 'me';

    const endpoints = [
      `https://graph.facebook.com/v21.0/${targetId}/subscribed_apps?subscribed_fields=${encodeURIComponent(fields)}&access_token=${encodeURIComponent(accessToken)}`,
      `https://graph.facebook.com/v21.0/me/subscribed_apps?subscribed_fields=${encodeURIComponent(fields)}&access_token=${encodeURIComponent(accessToken)}`,
      `https://graph.instagram.com/v21.0/${targetId}/subscribed_apps?subscribed_fields=${encodeURIComponent(fields)}&access_token=${encodeURIComponent(accessToken)}`,
      `https://graph.instagram.com/v21.0/me/subscribed_apps?subscribed_fields=${encodeURIComponent(fields)}&access_token=${encodeURIComponent(accessToken)}`,
    ];

    let lastResponse: any = null;
    let isSuccess = false;

    for (const url of endpoints) {
      try {
        console.log(`[SUBSCRIBE_APPS_CALL] Posting to Meta API: ${url.replace(accessToken, 'REDACTED_TOKEN')}`);
        const res = await fetch(url, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          },
        });
        const data = await res.json();
        console.log('[SUBSCRIBE_APPS_RESPONSE]', { status: res.status, ok: res.ok, data });
        lastResponse = data;
        if (res.ok && (data.success === true || data.data?.[0]?.success === true)) {
          isSuccess = true;
          break;
        }
      } catch (err) {
        console.error('[SUBSCRIBE_APPS_ERROR]', err);
      }
    }

    if (db) {
      try {
        const logId = `sub_${Date.now()}`;
        await setDoc(doc(db, 'webhook_logs', logId), {
          id: logId,
          timestamp: new Date().toISOString(),
          trigger_type: 'app_subscription',
          from_username: 'system',
          incoming_text: `Meta Subscribed Apps API call for IG User ID: ${igUserId}`,
          status: isSuccess ? 'success' : 'error',
          matched_automation_name: 'Meta Subscribed Apps API',
          response_sent: isSuccess ? 'Subscribed successfully to messages and comments' : 'Subscription API completed with warnings',
          api_response: lastResponse || null,
        });
      } catch (logErr) {
        console.warn('[SUBSCRIBE_APPS_LOG_ERR]', logErr);
      }
    }

    return { success: isSuccess, response: lastResponse };
  }

  // 1. Health check endpoint
  app.get('/api/health', (req: Request, res: Response) => {
    res.json({
      status: 'ok',
      service: 'AutoReply.io Instagram Automation API Engine',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
    });
  });

  // Instagram Account status REST endpoints (Uses Firestore doc 'primary')
  // Instagram Account status REST endpoints (Scoped by userId if provided)
  app.get('/api/instagram/account', async (req: Request, res: Response) => {
    const userId = req.query.userId as string | undefined;
    let accountData: InstagramAccount | null = null;
    if (db) {
      try {
        if (userId) {
          const userDocRef = doc(db, 'users', userId, 'instagram_account', 'primary');
          const userSnap = await getDoc(userDocRef);
          if (userSnap.exists()) {
            accountData = userSnap.data() as InstagramAccount;
          }
        }
        if (!accountData) {
          const docRef = doc(db, 'instagram_account', 'primary');
          const snap = await getDoc(docRef);
          if (snap.exists()) {
            accountData = snap.data() as InstagramAccount;
          }
        }
        if (accountData?.access_token) {
          accountData.access_token = sanitizeAccessToken(accountData.access_token);
        }
        if (!userId || userId === 'guest') {
          connectedInstagramAccountMemory = accountData;
        }
      } catch (err) {
        console.warn('[GET_IG_ACCOUNT_DB_WARN]', err);
      }
    }
    if (!accountData && (!userId || userId === 'guest')) {
      accountData = connectedInstagramAccountMemory;
    }

    if (accountData) {
      const cleanToken = sanitizeAccessToken(accountData.access_token);
      // Return sanitized account object (mask sensitive token in client JSON response)
      const sanitizedAccount = {
        ...accountData,
        access_token: cleanToken ? `${cleanToken.slice(0, 8)}...masked` : '',
      };
      return res.json({ success: true, account: sanitizedAccount });
    }

    return res.json({ success: true, account: null });
  });

  app.post('/api/instagram/account', async (req: Request, res: Response) => {
    const userId = req.body?.userId as string | undefined;
    if (req.body && 'account' in req.body) {
      const acc = req.body.account;
      if (acc) {
        let incomingToken = sanitizeAccessToken(acc.access_token);
        // If incoming token is masked (e.g., contains 'masked' or '...'), DO NOT save masked string to DB
        if (!incomingToken || incomingToken.includes('masked') || incomingToken.includes('...')) {
          let existingToken = connectedInstagramAccountMemory?.access_token || '';
          if ((!existingToken || existingToken.includes('masked')) && db) {
            try {
              if (userId) {
                const userSnap = await getDoc(doc(db, 'users', userId, 'instagram_account', 'primary'));
                if (userSnap.exists()) {
                  existingToken = userSnap.data()?.access_token || '';
                }
              }
              if (!existingToken) {
                const snap = await getDoc(doc(db, 'instagram_account', 'primary'));
                if (snap.exists()) {
                  existingToken = snap.data()?.access_token || '';
                }
              }
            } catch (err) {
              console.warn('[POST_ACC_FETCH_DB_WARN]', err);
            }
          }
          if (existingToken && !existingToken.includes('masked')) {
            acc.access_token = existingToken;
          } else {
            delete acc.access_token;
          }
        } else {
          acc.access_token = incomingToken;
        }

        connectedInstagramAccountMemory = {
          ...connectedInstagramAccountMemory,
          ...acc,
        };
        cachedInstagramAccount = connectedInstagramAccountMemory;
        cachedInstagramAccountTimestamp = Date.now();

        if (db) {
          try {
            if (userId) {
              await setDoc(doc(db, 'users', userId, 'instagram_account', 'primary'), acc, { merge: true });
            }
            await setDoc(doc(db, 'instagram_account', 'primary'), acc, { merge: true });
            if (acc.access_token && !acc.access_token.includes('masked')) {
              subscribeAppToInstagramWebhooks(acc.ig_user_id, acc.access_token).catch(console.warn);
            }
          } catch (err) {
            console.warn('[POST_IG_ACCOUNT_DB_WARN]', err);
          }
        }
      } else {
        connectedInstagramAccountMemory = null;
        if (db) {
          try {
            if (userId) {
              await deleteDoc(doc(db, 'users', userId, 'instagram_account', 'primary'));
            }
            await deleteDoc(doc(db, 'instagram_account', 'primary'));
          } catch (err) {
            console.warn('[DELETE_IG_ACCOUNT_DB_WARN]', err);
          }
        }
      }
    }
    res.json({ success: true, account: connectedInstagramAccountMemory });
  });

  // Contacts Deletion Endpoints (Permanently deletes from Firestore)
  app.post('/api/contacts/delete', async (req: Request, res: Response) => {
    const { contactId, username, userId } = req.body || {};
    if (!contactId && !username) {
      return res.status(400).json({ success: false, error: 'contactId or username required' });
    }

    if (db) {
      try {
        if (contactId) {
          if (userId) await deleteDoc(doc(db, 'users', userId, 'contacts', contactId));
          await deleteDoc(doc(db, 'contacts', contactId));
          console.log('[PERMANENT_DELETE_CONTACT]', contactId);
        }
        if (username) {
          if (userId) {
            const userMsgsRef = collection(db, 'users', userId, 'inbox_messages');
            const q = query(userMsgsRef, where('from_username', '==', username));
            const snap = await getDocs(q);
            for (const d of snap.docs) {
              await deleteDoc(d.ref);
            }
          }
          const msgsRef = collection(db, 'inbox_messages');
          const q2 = query(msgsRef, where('from_username', '==', username));
          const snap2 = await getDocs(q2);
          for (const d of snap2.docs) {
            await deleteDoc(d.ref);
          }
          console.log('[PERMANENT_DELETE_MESSAGES_FOR_USER]', username);
        }
      } catch (err) {
        console.warn('[DELETE_CONTACT_DB_WARN]', err);
      }
    }
    return res.json({ success: true });
  });

  app.post('/api/contacts/bulk-delete', async (req: Request, res: Response) => {
    const { contactIds, usernames, userId } = req.body || {};
    const ids: string[] = Array.isArray(contactIds) ? contactIds : [];
    const unames: string[] = Array.isArray(usernames) ? usernames : [];

    if (db) {
      try {
        for (const cid of ids) {
          if (userId) await deleteDoc(doc(db, 'users', userId, 'contacts', cid));
          await deleteDoc(doc(db, 'contacts', cid));
        }
        for (const uname of unames) {
          if (userId) {
            const userMsgsRef = collection(db, 'users', userId, 'inbox_messages');
            const q = query(userMsgsRef, where('from_username', '==', uname));
            const snap = await getDocs(q);
            for (const d of snap.docs) {
              await deleteDoc(d.ref);
            }
          }
          const msgsRef = collection(db, 'inbox_messages');
          const q2 = query(msgsRef, where('from_username', '==', uname));
          const snap2 = await getDocs(q2);
          for (const d of snap2.docs) {
            await deleteDoc(d.ref);
          }
        }
        console.log('[PERMANENT_BULK_DELETE_CONTACTS]', { count: ids.length, usernamesCount: unames.length });
      } catch (err) {
        console.warn('[BULK_DELETE_CONTACTS_WARN]', err);
      }
    }
    return res.json({ success: true, deletedCount: ids.length });
  });

  // Inbox Threads Deletion Endpoints (Permanently deletes thread messages from Firestore)
  app.post('/api/inbox/delete-thread', async (req: Request, res: Response) => {
    const { username, userId } = req.body || {};
    if (!username) {
      return res.status(400).json({ success: false, error: 'username required' });
    }

    if (db) {
      try {
        if (userId) {
          const userMsgsRef = collection(db, 'users', userId, 'inbox_messages');
          const snapAll = await getDocs(userMsgsRef);
          for (const d of snapAll.docs) {
            const data = d.data();
            if (data?.from_username && data.from_username.toLowerCase() === username.toLowerCase()) {
              await deleteDoc(d.ref);
            }
          }
        }
        const msgsRef = collection(db, 'inbox_messages');
        const snapAll2 = await getDocs(msgsRef);
        for (const d of snapAll2.docs) {
          const data = d.data();
          if (data?.from_username && data.from_username.toLowerCase() === username.toLowerCase()) {
            await deleteDoc(d.ref);
          }
        }
        console.log('[PERMANENT_DELETE_THREAD]', username);
      } catch (err) {
        console.warn('[DELETE_THREAD_WARN]', err);
      }
    }
    return res.json({ success: true });
  });

  app.post('/api/inbox/bulk-delete-threads', async (req: Request, res: Response) => {
    const { usernames, userId } = req.body || {};
    const unames: string[] = Array.isArray(usernames) ? usernames : [];

    if (db) {
      try {
        const lowerSet = new Set(unames.map((u) => u.toLowerCase()));
        if (userId) {
          const userMsgsRef = collection(db, 'users', userId, 'inbox_messages');
          const snapAll = await getDocs(userMsgsRef);
          for (const d of snapAll.docs) {
            const data = d.data();
            if (data?.from_username && lowerSet.has(data.from_username.toLowerCase())) {
              await deleteDoc(d.ref);
            }
          }
        }
        const msgsRef = collection(db, 'inbox_messages');
        const snapAll = await getDocs(msgsRef);
        for (const d of snapAll.docs) {
          const data = d.data();
          if (data?.from_username && lowerSet.has(data.from_username.toLowerCase())) {
            await deleteDoc(d.ref);
          }
        }
        console.log('[PERMANENT_BULK_DELETE_THREADS]', unames.length);
      } catch (err) {
        console.warn('[BULK_DELETE_THREADS_WARN]', err);
      }
    }
    return res.json({ success: true, deletedCount: unames.length });
  });

  app.post('/api/instagram/subscribe', async (req: Request, res: Response) => {
    let accessToken = '';
    let igUserId = '';
    if (db) {
      try {
        const snap = await getDoc(doc(db, 'instagram_account', 'primary'));
        if (snap.exists()) {
          const accData = snap.data() as InstagramAccount;
          accessToken = sanitizeAccessToken(accData.access_token || '');
          igUserId = accData.ig_user_id || '';
        }
      } catch (err) {
        console.warn('[SUBSCRIBE_ENDPOINT_FETCH_ERR]', err);
      }
    }
    if (!accessToken && connectedInstagramAccountMemory) {
      accessToken = sanitizeAccessToken(connectedInstagramAccountMemory.access_token);
      igUserId = connectedInstagramAccountMemory.ig_user_id;
    }

    if (!accessToken) {
      return res.status(400).json({ success: false, error: 'No connected Instagram account access token found.' });
    }

    const result = await subscribeAppToInstagramWebhooks(igUserId, accessToken);
    return res.json({ success: result.success, result: result.response });
  });

  // 2. Meta Instagram Config Endpoints
  app.get('/api/meta-config', (req: Request, res: Response) => {
    res.json({
      app_id: metaConfigStore.app_id,
      webhook_verify_token: metaConfigStore.webhook_verify_token,
      redirect_uri: metaConfigStore.redirect_uri,
      is_configured: Boolean(metaConfigStore.app_id && metaConfigStore.app_secret),
    });
  });

  app.post('/api/meta-config', (req: Request, res: Response) => {
    const { app_id, app_secret, webhook_verify_token, redirect_uri } = req.body;
    if (app_id) metaConfigStore.app_id = app_id;
    if (app_secret) metaConfigStore.app_secret = app_secret;
    if (webhook_verify_token) metaConfigStore.webhook_verify_token = webhook_verify_token;
    if (redirect_uri) metaConfigStore.redirect_uri = redirect_uri;

    res.json({ success: true, metaConfig: metaConfigStore });
  });

  // 3. Instagram Meta OAuth Auth Flow Endpoint (Instagram Business Login)
  app.get('/api/auth/instagram', (req: Request, res: Response) => {
    const appId = (req.query.app_id as string) || metaConfigStore.app_id || '2300969844066002';
    const host = req.get('host') || 'localhost:3000';
    const proto = req.get('x-forwarded-proto') || (req.secure ? 'https' : 'http');
    const autoRedirectUri = `${proto}://${host}/api/auth/instagram/callback`;
    const redirectUri =
      (req.query.redirect_uri as string) ||
      (metaConfigStore.redirect_uri.includes('localhost') && !host.includes('localhost')
        ? autoRedirectUri
        : metaConfigStore.redirect_uri) ||
      autoRedirectUri;

    const scopes = [
      'instagram_business_basic',
      'instagram_business_manage_messages',
      'instagram_business_manage_comments',
      'instagram_business_content_publish',
    ].join(',');

    const instagramAuthUrl = `https://www.instagram.com/oauth/authorize?client_id=${appId}&redirect_uri=${encodeURIComponent(
      redirectUri
    )}&scope=${encodeURIComponent(scopes)}&response_type=code`;

    console.log('[INSTAGRAM_OAUTH_REDIRECT]', { appId, redirectUri, instagramAuthUrl });
    res.redirect(instagramAuthUrl);
  });

  // 4. Instagram Meta OAuth Callback Endpoint
  app.get('/api/auth/instagram/callback', async (req: Request, res: Response) => {
    const { code, error, error_reason, error_description } = req.query;

    if (error || error_reason) {
      console.warn('[INSTAGRAM_OAUTH_ERROR]', { error, error_reason, error_description });
      return res.status(400).send(`
        <!DOCTYPE html>
        <html>
          <head><title>Instagram OAuth Error</title></head>
          <body style="font-family: sans-serif; padding: 40px; text-align: center; background: #f8fafc;">
            <div style="max-width: 440px; margin: 0 auto; background: white; padding: 32px; border-radius: 16px; box-shadow: 0 4px 20px rgba(0,0,0,0.06);">
              <h2 style="color: #dc2626; margin-top: 0;">Instagram OAuth Error</h2>
              <p style="color: #4b5563; font-size: 14px; line-height: 1.5;">${error_description || error_reason || error}</p>
              <a href="/" style="display: inline-block; margin-top: 16px; background: #3b5bff; color: white; padding: 10px 20px; border-radius: 8px; text-decoration: none; font-weight: 600;">Return to Dashboard</a>
            </div>
          </body>
        </html>
      `);
    }

    let shortLivedToken: string | null = null;
    let longLivedToken: string | null = null;
    let userId: string | null = null;
    let accountUsername = '';
    let accountName = '';
    let profilePicUrl = '';
    let followersCount = 0;

    if (code) {
      try {
        const formData = new URLSearchParams();
        formData.append('client_id', metaConfigStore.app_id);
        formData.append('client_secret', metaConfigStore.app_secret);
        formData.append('grant_type', 'authorization_code');
        formData.append('redirect_uri', metaConfigStore.redirect_uri);
        formData.append('code', String(code));

        const tokenRes = await fetch('https://api.instagram.com/oauth/access_token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: formData.toString(),
        });

        if (tokenRes.ok) {
          const tokenData = await tokenRes.json();
          shortLivedToken = sanitizeAccessToken(tokenData.access_token);
          userId = tokenData.user_id ? String(tokenData.user_id) : null;
          console.log('[INSTAGRAM_SHORT_TOKEN_EXCHANGE_SUCCESS]', { userId, hasToken: Boolean(shortLivedToken) });
        } else {
          const errText = await tokenRes.text();
          console.warn('[INSTAGRAM_SHORT_TOKEN_EXCHANGE_WARNING]', errText);
        }
      } catch (err) {
        console.error('[INSTAGRAM_OAUTH_TOKEN_EXCHANGE_ERROR]', err);
      }

      if (shortLivedToken) {
        try {
          const longTokenUrl = `https://graph.instagram.com/access_token?grant_type=ig_exchange_token&client_secret=${encodeURIComponent(
            metaConfigStore.app_secret
          )}&access_token=${encodeURIComponent(shortLivedToken)}`;

          const longRes = await fetch(longTokenUrl);
          if (longRes.ok) {
            const longData = await longRes.json();
            longLivedToken = sanitizeAccessToken(longData.access_token) || shortLivedToken;
          } else {
            longLivedToken = shortLivedToken;
          }
        } catch (longErr) {
          console.warn('[INSTAGRAM_LONG_TOKEN_EXCHANGE_ERROR]', longErr);
          longLivedToken = shortLivedToken;
        }
      }

      const activeToken = sanitizeAccessToken(longLivedToken || shortLivedToken);
      if (activeToken) {
        try {
          const meRes = await fetch(
            `https://graph.instagram.com/v21.0/me?fields=id,username,name,profile_picture_url,followers_count&access_token=${encodeURIComponent(
              activeToken
            )}`,
            {
              headers: {
                'Authorization': `Bearer ${activeToken}`,
              },
            }
          );

          if (meRes.ok) {
            const meData = await meRes.json();
            if (meData.username) accountUsername = meData.username;
            if (meData.name) accountName = meData.name;
            if (meData.id) userId = String(meData.id);
            if (meData.profile_picture_url) profilePicUrl = meData.profile_picture_url;
            if (typeof meData.followers_count === 'number') followersCount = meData.followers_count;
            console.log('[INSTAGRAM_USER_DETAILS_SUCCESS]', meData);
          }
        } catch (userErr) {
          console.warn('[INSTAGRAM_USER_DETAILS_ERROR]', userErr);
        }
      }
    }

    if (!accountUsername) {
      accountUsername = userId ? `creator_${userId.slice(-6)}` : 'connected_creator';
    }
    if (!accountName) {
      accountName = accountUsername;
    }
    if (!profilePicUrl) {
      profilePicUrl = `https://api.dicebear.com/7.x/avataaars/svg?seed=${accountUsername}`;
    }

    const cleanFinalToken = sanitizeAccessToken(longLivedToken || shortLivedToken);

    const connectedAccount: InstagramAccount = {
      id: 'primary',
      ig_user_id: String(userId || `ig_user_${accountUsername}`),
      username: accountUsername,
      profile_pic_url: profilePicUrl,
      followers_count: followersCount,
      access_token: cleanFinalToken,
      token_expires_at: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString(),
      connected_at: new Date().toISOString(),
      status: 'connected',
    };

    connectedInstagramAccountMemory = connectedAccount;
    cachedInstagramAccount = connectedAccount;
    cachedInstagramAccountTimestamp = Date.now();

    if (db) {
      try {
        console.log('[FIRESTORE_TOKEN_SAVE_CHECK] OAuth Callback writing unmasked token to Firestore:', {
          isRealUnmaskedToken: Boolean(connectedAccount.access_token && !connectedAccount.access_token.includes('masked')),
          startsWithIGAA: Boolean(connectedAccount.access_token && connectedAccount.access_token.startsWith('IGAA')),
          tokenLength: connectedAccount.access_token ? connectedAccount.access_token.length : 0,
          tokenPreview: connectedAccount.access_token ? `${connectedAccount.access_token.slice(0, 10)}...[LEN:${connectedAccount.access_token.length}]` : 'EMPTY',
          containsMaskedSubstring: Boolean(connectedAccount.access_token && connectedAccount.access_token.includes('masked')),
        });
        await setDoc(doc(db, 'instagram_account', 'primary'), connectedAccount, { merge: true });
        console.log('[INSTAGRAM_OAUTH_SAVED_TO_FIRESTORE]', connectedAccount.username);
      } catch (dbErr) {
        console.error('[INSTAGRAM_OAUTH_FIRESTORE_SAVE_ERROR]', dbErr);
      }
    }

    if (connectedAccount.access_token) {
      // Trigger Webhook Subscribed Apps API Call!
      subscribeAppToInstagramWebhooks(connectedAccount.ig_user_id, connectedAccount.access_token).catch((err) =>
        console.warn('[CALLBACK_SUBSCRIBE_ERR]', err)
      );
    }

    res.send(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>AutoReply.io - Instagram Connected</title>
          <style>
            body { font-family: system-ui, -apple-system, sans-serif; display: flex; align-items: center; justify-content: center; min-height: 100vh; background: #f7f6fb; margin: 0; }
            .card { background: white; padding: 32px; border-radius: 16px; box-shadow: 0 4px 20px rgba(0,0,0,0.06); text-align: center; max-width: 440px; }
            .badge { background: #eef2ff; color: #3b5bff; display: inline-block; padding: 8px 16px; border-radius: 99px; font-weight: 600; margin-bottom: 16px; font-size: 13px; }
            .avatar { width: 64px; height: 64px; border-radius: 50%; object-fit: cover; margin: 0 auto 16px auto; border: 3px solid #3b5bff; }
            button { background: #3b5bff; color: white; border: none; padding: 12px 24px; border-radius: 10px; font-weight: 600; cursor: pointer; font-size: 14px; width: 100%; }
          </style>
        </head>
        <body>
          <div class="card">
            <img src="${profilePicUrl}" class="avatar" alt="${accountUsername}" />
            <div class="badge">Instagram Business API Connected</div>
            <h2 style="margin: 0 0 8px 0; color: #111827;">@${accountUsername} Connected!</h2>
            <p style="color: #6b7280; margin-bottom: 24px; font-size: 14px;">Instagram Graph API access token exchanged & stored securely in Firestore.</p>
            <button onclick="navigateDashboard()">Go to Dashboard</button>
          </div>
          <script>
            function sendConnectMessage() {
              if (window.opener) {
                window.opener.postMessage('ig_connected', '*');
              }
            }

            function navigateDashboard() {
              sendConnectMessage();
              window.location.href = '/?tab=settings&status=ig_connected';
            }

            sendConnectMessage();
            setTimeout(() => {
              navigateDashboard();
            }, 1200);
          </script>
        </body>
      </html>
    `);
  });

  // 5. Meta Webhook Verification Endpoint (GET)
  const handleWebhookVerification = (req: Request, res: Response) => {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    console.log('[WEBHOOK VERIFY REQUEST]', { mode, token, challenge });

    const acceptedTokens = [
      metaConfigStore.webhook_verify_token,
      'autoreply_meta_verify_secret_token_2026',
      process.env.WEBHOOK_VERIFY_TOKEN,
      process.env.VERIFY_TOKEN,
    ].filter(Boolean);

    const isTokenValid = Boolean(
      token && (acceptedTokens.includes(String(token)) || acceptedTokens.length === 0)
    );

    if (mode === 'subscribe' && isTokenValid) {
      console.log('WEBHOOK_VERIFIED successfully! Challenge:', challenge);
      res.setHeader('Content-Type', 'text/plain');
      return res.status(200).send(String(challenge || ''));
    } else {
      console.warn('WEBHOOK_VERIFICATION_FAILED: Token mismatch or invalid mode', {
        mode,
        token,
        acceptedTokens,
      });
      return res.status(403).send('Forbidden');
    }
  };

  const webhookPaths = [
    '/webhook',
    '/webhook/',
    '/api/webhook',
    '/api/webhook/',
    '/api/instagram/webhook',
    '/api/instagram/webhook/',
  ];

  webhookPaths.forEach((pathUrl) => {
    app.get(pathUrl, handleWebhookVerification);
  });

  // --- ULTRA-FAST IN-MEMORY CACHE ENGINE WITH STALE-WHILE-REVALIDATE ---
  let cachedInstagramAccount: InstagramAccount | null = null;
  let cachedInstagramAccountTimestamp = 0;

  let cachedAutomations: Automation[] = [];
  let cachedAutomationsTimestamp = 0;
  const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes TTL
  let isFetchingAccountInBackground = false;
  let isFetchingAutomationsInBackground = false;

  async function primeCacheOnBoot() {
    if (!db) return;
    try {
      const [accTopSnap, accUserSnap, autoTopSnap, autoUserSnap] = await Promise.all([
        getDoc(doc(db, 'instagram_account', 'primary')).catch(() => null),
        getDoc(doc(db, 'users', 'primary_user', 'instagram_account', 'primary')).catch(() => null),
        getDocs(collection(db, 'automations')).catch(() => null),
        getDocs(collection(db, 'users', 'primary_user', 'automations')).catch(() => null),
      ]);

      if (accTopSnap && accTopSnap.exists()) {
        cachedInstagramAccount = accTopSnap.data() as InstagramAccount;
        cachedInstagramAccountTimestamp = Date.now();
        connectedInstagramAccountMemory = cachedInstagramAccount;
      } else if (accUserSnap && accUserSnap.exists()) {
        cachedInstagramAccount = accUserSnap.data() as InstagramAccount;
        cachedInstagramAccountTimestamp = Date.now();
        connectedInstagramAccountMemory = cachedInstagramAccount;
      }

      const activeList: Automation[] = [];
      const seenIds = new Set<string>();

      if (autoTopSnap) {
        autoTopSnap.forEach((d) => {
          const item = { id: d.id, ...d.data() } as Automation;
          if (item.status === 'active' && !seenIds.has(item.id)) {
            seenIds.add(item.id);
            activeList.push(item);
          }
        });
      }

      if (autoUserSnap) {
        autoUserSnap.forEach((d) => {
          const item = { id: d.id, ...d.data() } as Automation;
          if (item.status === 'active' && !seenIds.has(item.id)) {
            seenIds.add(item.id);
            activeList.push(item);
          }
        });
      }

      if (activeList.length > 0) {
        cachedAutomations = activeList;
        cachedAutomationsTimestamp = Date.now();
      }

      console.log('⚡ [IN_MEMORY_CACHE_READY] Primed Token & Automations in RAM on boot!');
    } catch (e) {
      console.warn('[PRIME_CACHE_WARN]', e);
    }
  }

  function refreshInstagramAccountCacheInBackground() {
    if (isFetchingAccountInBackground || !db) return;
    isFetchingAccountInBackground = true;
    Promise.all([
      getDoc(doc(db, 'instagram_account', 'primary')).catch(() => null),
      getDoc(doc(db, 'users', 'primary_user', 'instagram_account', 'primary')).catch(() => null),
    ])
      .then(([topSnap, userSnap]) => {
        if (topSnap && topSnap.exists()) {
          const accData = topSnap.data() as InstagramAccount;
          cachedInstagramAccount = accData;
          cachedInstagramAccountTimestamp = Date.now();
          connectedInstagramAccountMemory = accData;
        } else if (userSnap && userSnap.exists()) {
          const accData = userSnap.data() as InstagramAccount;
          cachedInstagramAccount = accData;
          cachedInstagramAccountTimestamp = Date.now();
          connectedInstagramAccountMemory = accData;
        }
      })
      .catch((err) => console.warn('[BG_CACHE_ACCOUNT_WARN]', err))
      .finally(() => {
        isFetchingAccountInBackground = false;
      });
  }

  function refreshAutomationsCacheInBackground() {
    if (isFetchingAutomationsInBackground || !db) return;
    isFetchingAutomationsInBackground = true;
    Promise.all([
      getDocs(collection(db, 'automations')).catch(() => null),
      getDocs(collection(db, 'users', 'primary_user', 'automations')).catch(() => null),
    ])
      .then(([topSnap, userSnap]) => {
        const list: Automation[] = [];
        const seen = new Set<string>();
        if (topSnap) {
          topSnap.forEach((docSnap) => {
            const item = { id: docSnap.id, ...docSnap.data() } as Automation;
            if (item.status === 'active' && !seen.has(item.id)) {
              seen.add(item.id);
              list.push(item);
            }
          });
        }
        if (userSnap) {
          userSnap.forEach((docSnap) => {
            const item = { id: docSnap.id, ...docSnap.data() } as Automation;
            if (item.status === 'active' && !seen.has(item.id)) {
              seen.add(item.id);
              list.push(item);
            }
          });
        }
        if (list.length > 0) {
          cachedAutomations = list;
          cachedAutomationsTimestamp = Date.now();
        }
      })
      .catch((err) => console.warn('[BG_CACHE_AUTOMATIONS_WARN]', err))
      .finally(() => {
        isFetchingAutomationsInBackground = false;
      });
  }

  // Synchronous, zero-latency In-Memory Account Resolver
  async function getCachedInstagramAccount(): Promise<{ accessToken: string; igUsername: string; profilePicUrl: string }> {
    const now = Date.now();

    // 1. Instant RAM Cache hit (0ms)
    if (cachedInstagramAccount && cachedInstagramAccount.access_token) {
      if (now - cachedInstagramAccountTimestamp >= CACHE_TTL_MS) {
        refreshInstagramAccountCacheInBackground();
      }
      return {
        accessToken: sanitizeAccessToken(cachedInstagramAccount.access_token || ''),
        igUsername: cachedInstagramAccount.username || '',
        profilePicUrl: cachedInstagramAccount.profile_pic_url || '',
      };
    }

    // 2. Fallback to in-memory connected account (0ms)
    if (connectedInstagramAccountMemory && connectedInstagramAccountMemory.access_token) {
      cachedInstagramAccount = connectedInstagramAccountMemory;
      cachedInstagramAccountTimestamp = now;
      return {
        accessToken: sanitizeAccessToken(connectedInstagramAccountMemory.access_token || ''),
        igUsername: connectedInstagramAccountMemory.username || '',
        profilePicUrl: connectedInstagramAccountMemory.profile_pic_url || '',
      };
    }

    // 3. Cold startup parallel fetch with bounded 400ms timeout race (runs only if cache empty on initial cold hit)
    if (db) {
      try {
        const fetchPromise = Promise.all([
          getDoc(doc(db, 'instagram_account', 'primary')).catch(() => null),
          getDoc(doc(db, 'users', 'primary_user', 'instagram_account', 'primary')).catch(() => null),
        ]);
        const timeoutPromise = new Promise<null[]>((resolve) => setTimeout(() => resolve([null, null]), 400));
        const [accSnap, userSnap] = await Promise.race([fetchPromise, timeoutPromise]);

        const targetSnap = (accSnap && accSnap.exists()) ? accSnap : (userSnap && userSnap.exists()) ? userSnap : null;
        if (targetSnap) {
          const accData = targetSnap.data() as InstagramAccount;
          cachedInstagramAccount = accData;
          cachedInstagramAccountTimestamp = now;
          connectedInstagramAccountMemory = accData;
          return {
            accessToken: sanitizeAccessToken(accData.access_token || ''),
            igUsername: accData.username || '',
            profilePicUrl: accData.profile_pic_url || '',
          };
        }
      } catch (err) {
        console.warn('[CACHE_ACCOUNT_COLD_FETCH_WARN]', err);
      }
    }

    const fallbackToken = sanitizeAccessToken(process.env.INSTAGRAM_ACCESS_TOKEN || '');
    return { accessToken: fallbackToken, igUsername: '', profilePicUrl: '' };
  }

  // Synchronous, zero-latency In-Memory Automations Resolver
  async function getCachedAutomations(): Promise<Automation[]> {
    const now = Date.now();

    // 1. Instant RAM Cache hit (0ms)
    if (cachedAutomations.length > 0) {
      if (now - cachedAutomationsTimestamp >= CACHE_TTL_MS) {
        refreshAutomationsCacheInBackground();
      }
      return cachedAutomations;
    }

    // 2. Cold startup Firestore fetch with bounded 400ms timeout race
    if (db) {
      try {
        const fetchPromise = Promise.all([
          getDocs(collection(db, 'automations')).catch(() => null),
          getDocs(collection(db, 'users', 'primary_user', 'automations')).catch(() => null),
        ]);
        const timeoutPromise = new Promise<null[]>((resolve) => setTimeout(() => resolve([null, null]), 400));
        const [topSnap, userSnap] = await Promise.race([fetchPromise, timeoutPromise]);

        const list: Automation[] = [];
        const seen = new Set<string>();
        if (topSnap) {
          topSnap.forEach((docSnap) => {
            const item = { id: docSnap.id, ...docSnap.data() } as Automation;
            if (item.status === 'active' && !seen.has(item.id)) {
              seen.add(item.id);
              list.push(item);
            }
          });
        }
        if (userSnap) {
          userSnap.forEach((docSnap) => {
            const item = { id: docSnap.id, ...docSnap.data() } as Automation;
            if (item.status === 'active' && !seen.has(item.id)) {
              seen.add(item.id);
              list.push(item);
            }
          });
        }
        if (list.length > 0) {
          cachedAutomations = list;
          cachedAutomationsTimestamp = now;
        }
        return list;
      } catch (err) {
        console.warn('[CACHE_AUTOMATIONS_COLD_FETCH_WARN]', err);
      }
    }
    return cachedAutomations;
  }

  // 6. Meta Webhook Engine - Ultra Fast High-Priority DM Response Execution (< 1s Response Time)
  async function processSingleMessageEvent(params: {
    triggerType: 'dm' | 'comment' | 'story_reply';
    senderId: string;
    senderUsername?: string;
    recipientId: string;
    messageText: string;
    commentId?: string;
    rawEvent?: any;
    webhookReceivedAt?: string;
    webhookReceivedAtMs?: number;
    metaEventTimestamp?: number | string | null;
  }) {
    const t0_start = Date.now();
    const { triggerType, senderId, recipientId, messageText, commentId } = params;
    const webhookReceivedAt = params.webhookReceivedAt || new Date().toISOString();
    const webhookReceivedAtMs = params.webhookReceivedAtMs || t0_start;
    const metaEventTimestamp = params.metaEventTimestamp || null;
    const metaTransitDelayMs = metaEventTimestamp ? Math.max(0, webhookReceivedAtMs - Number(metaEventTimestamp)) : null;

    console.log(`\n================== [ULTRA_FAST_WEBHOOK_EXECUTION] ==================`);
    console.log(`📥 1. Webhook Server Ingress:   ${webhookReceivedAt} (${webhookReceivedAtMs}ms)`);
    if (metaEventTimestamp) {
      console.log(`⏱️    Meta Event Timestamp:      ${new Date(Number(metaEventTimestamp)).toISOString()} (${metaEventTimestamp}ms)`);
      console.log(`⚡   Meta -> Backend Transit:   ${metaTransitDelayMs}ms`);
    }
    console.log(`⏱️    Trigger: ${triggerType.toUpperCase()} | From: ${senderId} | "${messageText}"`);

    // STEP 1: Fetch Account Token & Automations from RAM in parallel (~0-1ms)
    const t1_cache_start = Date.now();
    const [{ accessToken, igUsername, profilePicUrl: accountProfilePic }, activeAutomations] = await Promise.all([
      getCachedInstagramAccount(),
      getCachedAutomations(),
    ]);
    const t1_cache_end = Date.now();
    const cache_lookup_duration_ms = t1_cache_end - t1_cache_start;

    console.log(`⏱️ 2. Cache Lookup Duration:    ${cache_lookup_duration_ms}ms (Active Rules: ${activeAutomations.length}, Token Present: ${Boolean(accessToken)})`);

    // STEP 2: Match Automation Rules (In-Memory, < 0.1ms)
    const t2_rules_start = Date.now();
    let matchedAutomation: Automation | null = null;
    let isExplicitAiConversation = false;
    const textLower = messageText.toLowerCase().trim();

    for (const auto of activeAutomations) {
      const isTypeCompatible =
        auto.trigger_type === triggerType ||
        auto.trigger_type === 'dm_ai_conversation' ||
        (auto.trigger_type === 'comment' && triggerType === 'comment') ||
        (auto.trigger_type === 'dm' && triggerType === 'dm');

      if (!isTypeCompatible) continue;

      const config = auto.trigger_config || { all_or_keywords: 'all', keywords: [] };
      const keywords = config.keywords || [];

      if (auto.trigger_type === 'dm_ai_conversation' || config.all_or_keywords === 'ai_conversation') {
        matchedAutomation = auto;
        isExplicitAiConversation = true;
        break;
      } else if (config.all_or_keywords === 'all') {
        matchedAutomation = auto;
        break;
      } else if (keywords.length > 0) {
        const hasMatch = keywords.some((kw) => kw && textLower.includes(kw.toLowerCase().trim()));
        if (hasMatch) {
          matchedAutomation = auto;
          break;
        }
      } else {
        matchedAutomation = auto;
        break;
      }
    }
    const t2_rules_end = Date.now();
    const rule_matching_duration_ms = t2_rules_end - t2_rules_start;

    console.log(`⏱️ 3. Rule Matching Duration:   ${rule_matching_duration_ms}ms (Matched: "${matchedAutomation?.name || 'Default'}")`);

    // STEP 3: Determine Reply Text — PREVENT AI CALL FOR ALL STATIC KEYWORD AUTOMATIONS!
    const t3_reply_start = Date.now();
    let replyText = '';
    let systemPrompt = '';
    let ai_gen_duration_ms = 0;

    if (matchedAutomation) {
      const sendDmAction = matchedAutomation.actions?.find((a) => a.type === 'send_dm' || a.type === 'ai_chatbot');
      if (sendDmAction) {
        if (sendDmAction.type === 'ai_chatbot' || (sendDmAction.ai_system_instruction && !sendDmAction.message_text)) {
          isExplicitAiConversation = true;
          systemPrompt = sendDmAction.ai_system_instruction || 'You are an Instagram AI Assistant. Answer questions helpfully and politely.';
        } else if (sendDmAction.message_text) {
          replyText = sendDmAction.message_text; // STATIC MATCH: Instant 0ms text resolution!
        }
      }

      if (!replyText && !isExplicitAiConversation) {
        const commentAction = matchedAutomation.actions?.find((a) => a.comment_reply_text);
        if (commentAction?.comment_reply_text) {
          replyText = commentAction.comment_reply_text; // STATIC COMMENT MATCH: Instant 0ms resolution!
        }
      }
    }

    // Call Gemini AI ONLY if specifically configured as an AI Conversation automation
    if (!replyText && isExplicitAiConversation) {
      const ai_start = Date.now();
      console.log(`🤖 4. AI Generation Started:   gemini-3.1-flash-lite ultra-fast stream with 1.4s deadline...`);
      try {
        const promptToUse = systemPrompt || 'You are a concise Instagram assistant. Reply politely and directly in 1 short sentence under 15 words.';
        const aiRes = await generateGeminiChatReply({
          history: [], // Keep zero DB queries in critical path for maximum sub-second speed
          incomingText: messageText,
          systemInstruction: promptToUse,
          model: 'gemini-3.1-flash-lite',
          maxOutputTokens: 40,
        });
        replyText = aiRes.reply || 'Thank you for reaching out! How can I help you today?';
      } catch (aiErr) {
        console.error('[GEMINI_REPLY_GEN_ERROR]', aiErr);
        replyText = 'Thanks for reaching out! How can I help you today?';
      }
      const ai_end = Date.now();
      ai_gen_duration_ms = ai_end - ai_start;
      console.log(`🤖    AI Generation Completed: ${ai_gen_duration_ms}ms`);
    } else if (!replyText) {
      // Fallback default message if no specific static rule or AI conversation matched
      replyText = 'Thanks for your message! How can we help you today?';
    }

    const t3_reply_end = Date.now();
    const reply_prep_duration_ms = t3_reply_end - t3_reply_start;

    console.log(`⏱️ 4. Reply Prep Total:        ${reply_prep_duration_ms}ms (AI Gen: ${ai_gen_duration_ms}ms) -> "${replyText}"`);

    // STEP 4: ABSOLUTE TOP PRIORITY CRITICAL PATH — DISPATCH INSTAGRAM DM IMMEDIATELY!
    // No logging, no profile fetching, no Firestore blocking before this line!
    const t4_dispatch_start = Date.now();
    let apiSuccess = false;
    let apiLogResult: any = null;
    let dispatchMetrics = {
      reply_api_call_start: new Date().toISOString(),
      reply_api_call_start_ms: t4_dispatch_start,
      reply_api_call_end: new Date().toISOString(),
      reply_api_call_end_ms: t4_dispatch_start,
      ig_api_duration_ms: 0,
      endpointUsed: '',
    };

    if (accessToken && !accessToken.includes('encrypted_token') && !accessToken.includes('sandbox_token')) {
      try {
        if (triggerType === 'comment' && commentId) {
          const commentRes = await sendInstagramCommentReplyWithFallback({
            accessToken,
            commentId,
            messageText: replyText,
          });
          apiSuccess = commentRes.success;
          apiLogResult = commentRes.result;
          dispatchMetrics = {
            reply_api_call_start: commentRes.reply_api_call_start,
            reply_api_call_start_ms: commentRes.reply_api_call_start_ms,
            reply_api_call_end: commentRes.reply_api_call_end,
            reply_api_call_end_ms: commentRes.reply_api_call_end_ms,
            ig_api_duration_ms: commentRes.ig_api_duration_ms,
            endpointUsed: commentRes.endpointUsed || '',
          };
        } else {
          const dmRes = await sendInstagramDirectMessageWithFallback({
            accessToken,
            senderId,
            recipientId,
            messageText: replyText,
          });
          apiSuccess = dmRes.success;
          apiLogResult = dmRes.result;
          dispatchMetrics = {
            reply_api_call_start: dmRes.reply_api_call_start,
            reply_api_call_start_ms: dmRes.reply_api_call_start_ms,
            reply_api_call_end: dmRes.reply_api_call_end,
            reply_api_call_end_ms: dmRes.reply_api_call_end_ms,
            ig_api_duration_ms: dmRes.ig_api_duration_ms,
            endpointUsed: dmRes.endpointUsed || '',
          };
        }
      } catch (sendErr: any) {
        console.error('[INSTAGRAM_GRAPH_API_CALL_ERROR]', sendErr);
        apiLogResult = { error: String(sendErr?.message || sendErr) };
        apiSuccess = false;
      }
    } else {
      apiLogResult = { note: 'Processed and saved to database (Simulation mode / Test event).' };
      apiSuccess = true;
    }

    const t4_dispatch_end = Date.now();
    const totalProcessingDurationMs = t4_dispatch_end - t0_start;
    const totalPipelineDurationMs = t4_dispatch_end - webhookReceivedAtMs;

    console.log(`\n================== [DISPATCH METRICS BREAKDOWN] ==================`);
    console.log(`⏱️ 1. Ingress Delay:            ${t0_start - webhookReceivedAtMs}ms`);
    console.log(`⏱️ 2. Cache Lookup:             ${cache_lookup_duration_ms}ms`);
    console.log(`⏱️ 3. Rule Matching:            ${rule_matching_duration_ms}ms`);
    console.log(`⏱️ 4. Reply Prep (AI):          ${reply_prep_duration_ms}ms (AI: ${ai_gen_duration_ms}ms)`);
    console.log(`⏱️ 5. Instagram Graph API:      ${dispatchMetrics.ig_api_duration_ms}ms`);
    console.log(`==================================================================`);
    console.log(`🚀 TOTAL BACKEND EXECUTION:     ${totalProcessingDurationMs}ms (End-to-End Pipeline: ${totalPipelineDurationMs}ms)`);
    console.log(`==================================================================\n`);

    // STEP 5: COMPLETELY DETACHED BACKGROUND WORKER (Profile Fetch + Firestore Writes in Parallel)
    // Uses setImmediate so the HTTP loop and caller return instantly without awaiting!
    setImmediate(() => {
      (async () => {
        let senderUsername = params.senderUsername || '';
        let fetchedProfilePic = '';
        let profileFetchError: any = null;

        // 5A. Asynchronous Profile Fetch from Instagram API (does NOT delay reply)
        if (accessToken && !accessToken.includes('encrypted_token')) {
          const cleanToken = sanitizeAccessToken(accessToken);
          try {
            const igProfUrl = `https://graph.instagram.com/v21.0/${senderId}?fields=name,username,profile_pic&access_token=${encodeURIComponent(cleanToken)}`;
            const pRes = await fetch(igProfUrl, {
              headers: { 'Authorization': `Bearer ${cleanToken}` },
              signal: AbortSignal.timeout(3000),
            });
            if (pRes.ok) {
              const pData = await pRes.json();
              senderUsername = pData.username || pData.name || senderUsername;
              fetchedProfilePic = pData.profile_pic || pData.profile_picture_url || '';
            } else {
              profileFetchError = await pRes.json().catch(() => ({ status: pRes.status, statusText: pRes.statusText }));
            }
          } catch (pErr: any) {
            profileFetchError = { error: String(pErr?.message || pErr) };
          }
        }

        if (!senderUsername) {
          senderUsername = `user_${senderId.slice(-6)}`;
        }
        const senderAvatar = fetchedProfilePic || `https://api.dicebear.com/7.x/avataaars/svg?seed=${senderUsername}`;

        // 5B. Parallel Firestore Dual-Writes (top-level and users/primary_user/)
        if (db) {
          const nowIso = new Date().toISOString();
          const inMsgId = `msg_in_${Date.now()}`;
          const outMsgId = `msg_out_${Date.now() + 1}`;
          const contactId = `contact_${senderUsername}`;
          const logId = `log_${Date.now()}`;

          const inMsgDoc: InboxMessage = {
            id: inMsgId,
            from_ig_id: senderId,
            from_username: senderUsername,
            from_avatar: senderAvatar,
            message_text: messageText,
            direction: 'in',
            timestamp: nowIso,
          };

          const outMsgDoc: InboxMessage = {
            id: outMsgId,
            from_ig_id: senderId,
            from_username: senderUsername,
            from_avatar: accountProfilePic || `https://api.dicebear.com/7.x/avataaars/svg?seed=${igUsername || 'autoreply_ai'}`,
            message_text: replyText,
            direction: 'out',
            is_automated: true,
            automation_id: matchedAutomation?.id,
            timestamp: new Date(Date.now() + 1000).toISOString(),
          };

          const logDoc: WebhookLogEvent = {
            id: logId,
            timestamp: nowIso,
            trigger_type: triggerType,
            from_username: senderUsername,
            incoming_text: messageText,
            status: apiSuccess ? 'triggered' : 'error',
            matched_automation_name: matchedAutomation?.name || (isExplicitAiConversation ? 'AI Assistant' : 'Keyword Automation'),
            response_sent: replyText,
            webhook_received_at: webhookReceivedAt,
            webhook_received_at_ms: webhookReceivedAtMs,
            meta_event_timestamp: metaEventTimestamp,
            meta_transit_delay_ms: metaTransitDelayMs,
            reply_api_call_start: dispatchMetrics.reply_api_call_start,
            reply_api_call_start_ms: dispatchMetrics.reply_api_call_start_ms,
            reply_api_call_end: dispatchMetrics.reply_api_call_end,
            reply_api_call_end_ms: dispatchMetrics.reply_api_call_end_ms,
            ig_api_duration_ms: dispatchMetrics.ig_api_duration_ms,
            total_processing_duration_ms: totalProcessingDurationMs,
            instance_uptime_seconds: Math.floor((webhookReceivedAtMs - SERVER_BOOT_TIMESTAMP) / 1000),
            instance_is_warm: true,
            timing_breakdown: {
              meta_transit_delay_ms: metaTransitDelayMs,
              cache_lookup_duration_ms,
              rule_matching_duration_ms,
              reply_prep_duration_ms,
              ai_gen_duration_ms,
              ig_api_duration_ms: dispatchMetrics.ig_api_duration_ms,
              total_pipeline_duration_ms: totalPipelineDurationMs,
            },
            api_response: {
              response_time_ms: totalProcessingDurationMs,
              meta_transit_delay_ms: metaTransitDelayMs,
              ig_api_duration_ms: dispatchMetrics.ig_api_duration_ms,
              endpoint_used: dispatchMetrics.endpointUsed,
              send_reply_result: apiLogResult,
              profile_fetch_error: profileFetchError || null,
              timing_breakdown: {
                cache_lookup_duration_ms,
                rule_matching_duration_ms,
                reply_prep_duration_ms,
                ai_gen_duration_ms,
                ig_api_duration_ms: dispatchMetrics.ig_api_duration_ms,
                total_pipeline_duration_ms: totalPipelineDurationMs,
              },
            },
          };

          const contactDoc: any = {
            id: contactId,
            ig_username: senderUsername,
            ig_user_id: senderId,
            avatar_url: senderAvatar,
            first_interaction_at: nowIso,
            last_interaction_at: nowIso,
            interactions: {
              comments: triggerType === 'comment' ? 1 : 0,
              dms: triggerType === 'dm' ? 1 : 0,
              stories: triggerType === 'story_reply' ? 1 : 0,
            },
            status: 'converted',
            profile_fetch_error: profileFetchError || null,
          };

          const dbTasks: Promise<any>[] = [
            setDoc(doc(db, 'inbox_messages', inMsgId), inMsgDoc),
            setDoc(doc(db, 'inbox_messages', outMsgId), outMsgDoc),
            setDoc(doc(db, 'webhook_logs', logId), logDoc),
            setDoc(doc(db, 'contacts', contactId), contactDoc, { merge: true }),
            setDoc(doc(db, 'users', 'primary_user', 'inbox_messages', inMsgId), inMsgDoc),
            setDoc(doc(db, 'users', 'primary_user', 'inbox_messages', outMsgId), outMsgDoc),
            setDoc(doc(db, 'users', 'primary_user', 'webhook_logs', logId), logDoc),
            setDoc(doc(db, 'users', 'primary_user', 'contacts', contactId), contactDoc, { merge: true }),
          ];

          if (matchedAutomation?.id) {
            const autoRef = doc(db, 'automations', matchedAutomation.id);
            const userAutoRef = doc(db, 'users', 'primary_user', 'automations', matchedAutomation.id);
            dbTasks.push(
              getDoc(autoRef).then((autoSnap) => {
                if (autoSnap.exists()) {
                  const cur = autoSnap.data() as Automation;
                  const curStats = cur.stats || { runs: 0, dms_sent: 0, unique_users: 0, open_rate: 98.5 };
                  const updatedPayload = {
                    stats: {
                      ...curStats,
                      runs: (curStats.runs || 0) + 1,
                      dms_sent: (curStats.dms_sent || 0) + 1,
                      last_run_at: nowIso,
                    },
                    updated_at: nowIso,
                  };
                  return Promise.all([
                    setDoc(autoRef, updatedPayload, { merge: true }),
                    setDoc(userAutoRef, updatedPayload, { merge: true }),
                  ]);
                }
              })
            );
          }

          await Promise.all(dbTasks);
          console.log(`✅ [BACKGROUND_ASYNC_FIRESTORE] Saved log and messages to Firestore.`);
        }
      })().catch((bgErr) => console.error('[DETACHED_BACKGROUND_ERR]', bgErr));
    });
  }

  // Webhook POST receiver
  const handleWebhookEvent = (req: Request, res: Response) => {
    const webhookReceivedAtMs = Date.now();
    const webhookReceivedAt = new Date().toISOString();
    const uptimeSeconds = Math.floor((webhookReceivedAtMs - SERVER_BOOT_TIMESTAMP) / 1000);

    console.log(`\n================================================================================`);
    console.log(`📥 [META_WEBHOOK_POST_RECEIVED] Server Timestamp: ${webhookReceivedAt} (${webhookReceivedAtMs}ms)`);
    console.log(`   Instance Uptime: ${uptimeSeconds}s | Warm Instance: Active | Request Path: ${req.path}`);
    console.log(`================================================================================`);

    // Acknowledge receipt to Meta immediately (must respond 200 within 20s)
    res.setHeader('Content-Type', 'text/plain');
    res.status(200).send('EVENT_RECEIVED');

    const body = req.body;
    console.log('[INCOMING_META_WEBHOOK_BODY]', JSON.stringify(body, null, 2));

    // Process webhook events asynchronously
    if (body && typeof body === 'object') {
      const entries = body.entry || [];
      for (const entry of entries) {
        const entryTime = entry.time || null;

        // 1. DMs in messaging array
        const messagingList = entry.messaging || [];
        for (const msgEvent of messagingList) {
          const senderId = msgEvent.sender?.id;
          const recipientId = msgEvent.recipient?.id;
          const messageText = msgEvent.message?.text;
          const isEcho = msgEvent.message?.is_echo;
          const metaMsgTimestamp = msgEvent.timestamp || entryTime || null;

          if (senderId && messageText && !isEcho) {
            processSingleMessageEvent({
              triggerType: 'dm',
              senderId: String(senderId),
              recipientId: String(recipientId || entry.id || ''),
              messageText: String(messageText),
              rawEvent: msgEvent,
              webhookReceivedAt,
              webhookReceivedAtMs,
              metaEventTimestamp: metaMsgTimestamp,
            }).catch((err) => console.error('[ASYNC_DM_PROCESS_ERR]', err));
          }
        }

        // 2. Changes array (Comments or Messages)
        const changesList = entry.changes || [];
        for (const change of changesList) {
          const field = change.field;
          const val = change.value || {};

          if (field === 'comments' || field === 'comment') {
            const commentId = val.id;
            const commentText = val.text;
            const senderId = val.from?.id;
            const senderUsername = val.from?.username || '';
            const metaCommentTimestamp = val.created_time ? (typeof val.created_time === 'number' ? (val.created_time > 1e11 ? val.created_time : val.created_time * 1000) : Date.parse(val.created_time)) : (entryTime || null);

            if (commentText && senderId) {
              processSingleMessageEvent({
                triggerType: 'comment',
                senderId: String(senderId),
                senderUsername,
                recipientId: String(entry.id || ''),
                messageText: String(commentText),
                commentId: commentId ? String(commentId) : undefined,
                rawEvent: change,
                webhookReceivedAt,
                webhookReceivedAtMs,
                metaEventTimestamp: metaCommentTimestamp,
              }).catch((err) => console.error('[ASYNC_COMMENT_PROCESS_ERR]', err));
            }
          }

          if (field === 'messages' || field === 'messaging') {
            const senderId = val.sender?.id || val.from?.id;
            const recipientId = val.recipient?.id;
            const messageText = val.message?.text || val.text;
            const isEcho = val.message?.is_echo || val.is_echo;
            const metaMsgTimestamp = val.timestamp || entryTime || null;

            if (senderId && messageText && !isEcho) {
              processSingleMessageEvent({
                triggerType: 'dm',
                senderId: String(senderId),
                senderUsername: val.from?.username || '',
                recipientId: String(recipientId || entry.id || ''),
                messageText: String(messageText),
                rawEvent: change,
                webhookReceivedAt,
                webhookReceivedAtMs,
                metaEventTimestamp: metaMsgTimestamp,
              }).catch((err) => console.error('[ASYNC_DM_CHANGES_PROCESS_ERR]', err));
            }
          }
        }
      }
    }
  };

  webhookPaths.forEach((pathUrl) => {
    app.post(pathUrl, handleWebhookEvent);
  });

  // 7. Test Webhook Engine API Endpoint
  app.post('/api/test-webhook', async (req: Request, res: Response) => {
    const { trigger_type, username, text } = req.body;

    if (!trigger_type || !username || !text) {
      return res.status(400).json({ error: 'Missing required parameters: trigger_type, username, text' });
    }

    const cleanUsername = String(username).replace(/^@/, '').trim();
    const mockSenderId = `user_id_${cleanUsername}`;

    console.log(`[TEST WEBHOOK ENGINE] Trigger: ${trigger_type} | User: @${cleanUsername} | Text: "${text}"`);

    await processSingleMessageEvent({
      triggerType: (trigger_type as 'dm' | 'comment' | 'story_reply') || 'dm',
      senderId: mockSenderId,
      senderUsername: cleanUsername,
      recipientId: 'ig_business_id_main',
      messageText: String(text),
    });

    return res.json({
      success: true,
      processed_event: {
        trigger_type,
        username: cleanUsername,
        text,
        timestamp: new Date().toISOString(),
      },
      status: 'processed_and_saved_to_firestore',
    });
  });

  // 7.5. Send Manual DM API Endpoint (for Inbox manual replies)
  app.post('/api/instagram/send-dm', async (req: Request, res: Response) => {
    try {
      const { recipientUsername, messageText } = req.body;
      if (!recipientUsername || !messageText) {
        return res.status(400).json({ error: 'Missing recipientUsername or messageText' });
      }

      const cleanUsername = String(recipientUsername).replace(/^@/, '').toLowerCase().trim();

      let accessToken = '';
      if (db) {
        try {
          const accSnap = await getDoc(doc(db, 'instagram_account', 'primary'));
          if (accSnap.exists()) {
            const accData = accSnap.data() as InstagramAccount;
            accessToken = sanitizeAccessToken(accData.access_token || '');
          }
        } catch (err) {
          console.warn('[SEND_DM_DB_TOKEN_FETCH_WARN]', err);
        }
      }
      if (!accessToken && connectedInstagramAccountMemory?.access_token) {
        accessToken = sanitizeAccessToken(connectedInstagramAccountMemory.access_token);
      }

      let apiResult: any = null;
      let apiSuccess = false;

      if (accessToken && !accessToken.includes('encrypted_token') && !accessToken.includes('sandbox_token')) {
        let recipientIgId = cleanUsername;
        if (db) {
          try {
            const contactRef = doc(db, 'contacts', `contact_${cleanUsername}`);
            const cSnap = await getDoc(contactRef);
            if (cSnap.exists()) {
              recipientIgId = cSnap.data().ig_user_id || cleanUsername;
            }
          } catch (e) {
            console.warn('[RECIPIENT_ID_LOOKUP_WARN]', e);
          }
        }

        const dmRes = await sendInstagramDirectMessageWithFallback({
          accessToken,
          senderId: recipientIgId,
          messageText,
        });
        apiResult = dmRes.result;
        apiSuccess = dmRes.success;
      }

      const nowIso = new Date().toISOString();
      if (db) {
        const outMsgId = `msg_manual_${Date.now()}`;
        const outMsgDoc: InboxMessage = {
          id: outMsgId,
          from_ig_id: cleanUsername,
          from_username: cleanUsername,
          message_text: messageText,
          direction: 'out',
          is_automated: false,
          timestamp: nowIso,
        };
        await setDoc(doc(db, 'inbox_messages', outMsgId), outMsgDoc);
        await setDoc(doc(db, 'users', 'primary_user', 'inbox_messages', outMsgId), outMsgDoc);
        const reqUserId = req.body?.userId;
        if (reqUserId && reqUserId !== 'primary_user') {
          await setDoc(doc(db, 'users', reqUserId, 'inbox_messages', outMsgId), outMsgDoc);
        }
      }

      return res.json({ success: true, apiSuccess, apiResult });
    } catch (err: any) {
      console.error('[SEND_DM_API_ERROR]', err);
      return res.status(500).json({ error: String(err?.message || err) });
    }
  });

  // 8. Gemini Multi-Key Rotation Chat API Endpoint
  app.post('/api/gemini/chat', async (req: Request, res: Response) => {
    try {
      const { username, text, history, systemInstruction, model } = req.body;

      if (!text) {
        return res.status(400).json({ error: 'Missing required parameter: text' });
      }

      console.log(`[GEMINI CHAT API] Request from @${username || 'guest'}: "${text}"`);

      const result = await generateGeminiChatReply({
        history: history || [],
        incomingText: text,
        systemInstruction,
        model,
      });

      return res.json({
        success: true,
        reply: result.reply,
        usedKeyLabel: result.usedKeyLabel,
        rotatedCount: result.rotatedCount,
        timestamp: new Date().toISOString(),
      });
    } catch (err: any) {
      console.error('[GEMINI CHAT API ERROR]', err);
      return res.status(500).json({
        error: 'Failed to process Gemini chat request',
        details: String(err?.message || err),
      });
    }
  });

  // 8.5. Gemini Streaming Response API Endpoint
  app.post('/api/gemini/stream', async (req: Request, res: Response) => {
    try {
      const { text, history, systemInstruction, model } = req.body;
      if (!text) {
        return res.status(400).json({ error: 'Missing required parameter: text' });
      }

      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');

      const generator = generateGeminiChatStream({
        history: history || [],
        incomingText: text,
        systemInstruction,
        model,
      });

      for await (const data of generator) {
        res.write(`data: ${JSON.stringify(data)}\n\n`);
      }

      res.write('data: [DONE]\n\n');
      res.end();
    } catch (err: any) {
      console.error('[GEMINI STREAM API ERROR]', err);
      res.status(500).json({ error: 'Streaming error', details: String(err?.message || err) });
    }
  });

  // 9. Gemini Multi-Key Pool Management Endpoints
  app.get('/api/gemini/keys', (req: Request, res: Response) => {
    const keys = getLocalKeyPool();
    const sanitizedKeys = keys.map((k) => ({
      ...k,
      maskedKey: k.key.length > 8 ? `${k.key.slice(0, 6)}...${k.key.slice(-4)}` : '••••••••',
    }));
    return res.json({ keys: sanitizedKeys });
  });

  app.post('/api/gemini/keys', (req: Request, res: Response) => {
    const { key, label } = req.body;
    if (!key || !label) {
      return res.status(400).json({ error: 'Missing key or label' });
    }

    const currentPool = getLocalKeyPool();
    const keyId = `key_${Date.now()}`;
    const newKeyItem: GeminiApiKeyItem = {
      id: keyId,
      key: key.trim(),
      label: label.trim(),
      status: 'active',
      cooldownUntil: null,
      requestCount: 0,
      errorCount: 0,
      lastUsedAt: new Date().toISOString(),
    };

    const updated = [newKeyItem, ...currentPool];
    setLocalKeyPool(updated);

    return res.json({ success: true, keys: updated });
  });

  app.delete('/api/gemini/keys/:id', (req: Request, res: Response) => {
    const { id } = req.params;
    const currentPool = getLocalKeyPool();
    const updated = currentPool.filter((k) => k.id !== id);
    setLocalKeyPool(updated);
    return res.json({ success: true, keys: updated });
  });

  // Vite Middleware or Static Production File Serving
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`AutoReply.io Express Backend Server running on http://0.0.0.0:${PORT}`);
    // Pre-warm RAM cache for instantaneous sub-second webhook responses
    primeCacheOnBoot()
      .then(() => console.log('🔥 [CACHE_WARMUP_SUCCESS] In-Memory Instagram Token & Automations pre-warmed!'))
      .catch((e) => console.warn('[CACHE_WARMUP_WARN]', e));
  });
}

startServer();
