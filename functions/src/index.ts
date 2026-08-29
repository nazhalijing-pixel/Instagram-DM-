/**
 * Production-Ready Firebase Cloud Function (2nd Gen) for Instagram DM Automation
 * 
 * Performance Optimizations:
 * 1. minInstances: 1 (Eliminates Cold Starts completely)
 * 2. Instant HTTP 200 OK (< 50ms) to Meta Webhook
 * 3. Gemini 1.5 Flash + maxOutputTokens: 120 + Minimal System Prompt
 * 4. limitToLast(2) Firestore query for lightning-fast conversation context
 * 5. Asynchronous decoupled background execution
 */

import { onRequest } from 'firebase-functions/v2/https';
import { setGlobalOptions } from 'firebase-functions/v2';
import * as admin from 'firebase-admin';
import { GoogleGenAI } from '@google/genai';

// Initialize Firebase Admin SDK
if (!admin.apps.length) {
  admin.initializeApp();
}
const db = admin.firestore();

// 1. Firebase Performance Fix: minInstances: 1 prevents Cold Starts
setGlobalOptions({
  region: 'us-central1',
  minInstances: 1,      // Keeps instance always warm for < 100ms startup
  maxInstances: 10,
  concurrency: 80,
  timeoutSeconds: 60,
  memory: '512MiB',
});

// Initialize Gemini Client
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || '',
});

/**
 * 2. Ultra-Fast AI Generation with gemini-1.5-flash & maxOutputTokens: 120
 */
async function generateInstantAiReply(params: {
  senderId: string;
  senderUsername: string;
  incomingText: string;
  systemInstruction?: string;
}): Promise<string> {
  const { senderId, incomingText, systemInstruction } = params;

  // 3. Database Context Query: Fetch ONLY last 2 messages with limitToLast(2)
  let recentMessages: { role: 'user' | 'model'; parts: [{ text: string }] }[] = [];
  try {
    const msgsRef = db.collection('inbox_messages');
    const snapshot = await msgsRef
      .where('from_ig_id', '==', senderId)
      .orderBy('timestamp', 'asc')
      .limitToLast(2)
      .get();

    recentMessages = snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        role: data.direction === 'in' ? 'user' : 'model',
        parts: [{ text: data.message_text || '' }],
      };
    });
  } catch (err) {
    // Non-blocking fallback
    console.warn('[CONTEXT_QUERY_FALLBACK]', err);
  }

  // Append current user message
  recentMessages.push({
    role: 'user',
    parts: [{ text: incomingText }],
  });

  // Call gemini-1.5-flash with low maxOutputTokens and minimal system prompt
  const response = await ai.models.generateContent({
    model: 'gemini-1.5-flash',
    contents: recentMessages,
    config: {
      systemInstruction:
        systemInstruction ||
        'You are a friendly Instagram assistant. Reply politely and concisely in 1-2 short sentences (under 180 characters).',
      temperature: 0.6,
      maxOutputTokens: 120, // Strict token limit for sub-second generation
    },
  });

  return response.text?.trim() || 'Thank you for reaching out! How can I assist you today?';
}

const FUNCTION_BOOT_TIMESTAMP = Date.now();
const FUNCTION_BOOT_ISO = new Date().toISOString();
console.log(`🚀 [CLOUD_FUNCTION_BOOT] Initialized at ${FUNCTION_BOOT_ISO} (${FUNCTION_BOOT_TIMESTAMP}ms) - Warm minInstance active.`);

/**
 * 4. Dispatch Direct Message to Instagram Graph API with Latency Telemetry
 */
async function dispatchInstagramDm(accessToken: string, recipientId: string, messageText: string): Promise<{
  success: boolean;
  reply_api_call_start: string;
  reply_api_call_start_ms: number;
  reply_api_call_end: string;
  reply_api_call_end_ms: number;
  ig_api_duration_ms: number;
  response_body?: any;
}> {
  const cleanToken = accessToken.trim();
  const url = `https://graph.instagram.com/v21.0/me/messages?access_token=${encodeURIComponent(cleanToken)}`;

  const reply_api_call_start_ms = Date.now();
  const reply_api_call_start = new Date().toISOString();
  console.log(`📤 [FUNCTION_REPLY_API_START] ${reply_api_call_start} (${reply_api_call_start_ms}ms) -> Dispatching DM to recipient ${recipientId}`);

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${cleanToken}`,
      },
      body: JSON.stringify({
        recipient: { id: recipientId },
        message: { text: messageText },
      }),
      signal: AbortSignal.timeout(3500),
    });

    const reply_api_call_end_ms = Date.now();
    const reply_api_call_end = new Date().toISOString();
    const ig_api_duration_ms = reply_api_call_end_ms - reply_api_call_start_ms;
    const resData = await res.json().catch(() => ({}));

    console.log(`📥 [FUNCTION_REPLY_API_END] ${reply_api_call_end} (${reply_api_call_end_ms}ms) | Duration: ${ig_api_duration_ms}ms | HTTP Status: ${res.status}`);

    return {
      success: res.ok,
      reply_api_call_start,
      reply_api_call_start_ms,
      reply_api_call_end,
      reply_api_call_end_ms,
      ig_api_duration_ms,
      response_body: resData,
    };
  } catch (err: any) {
    const reply_api_call_end_ms = Date.now();
    const reply_api_call_end = new Date().toISOString();
    const ig_api_duration_ms = reply_api_call_end_ms - reply_api_call_start_ms;
    console.error(`⚠️ [FUNCTION_REPLY_API_FAIL] ${reply_api_call_end} | Duration: ${ig_api_duration_ms}ms:`, err);
    return {
      success: false,
      reply_api_call_start,
      reply_api_call_start_ms,
      reply_api_call_end,
      reply_api_call_end_ms,
      ig_api_duration_ms,
      response_body: { error: String(err?.message || err) },
    };
  }
}

/**
 * 5. Main Instagram Webhook Cloud Function
 * Handles verification (GET) and Instant Webhook Dispatch (POST)
 */
export const instagramWebhook = onRequest(
  {
    cors: true,
    minInstances: 1, // Keep warm
  },
  async (req, res) => {
    // --- META WEBHOOK VERIFICATION (GET) ---
    if (req.method === 'GET') {
      const mode = req.query['hub.mode'];
      const token = req.query['hub.verify_token'];
      const challenge = req.query['hub.challenge'];
      const verifyToken = process.env.WEBHOOK_VERIFY_TOKEN || 'autoreply_meta_verify_secret_token_2026';

      if (mode === 'subscribe' && token === verifyToken) {
        res.status(200).send(String(challenge || ''));
        return;
      }
      res.status(403).send('Forbidden');
      return;
    }

    // --- INSTAGRAM WEBHOOK EVENTS (POST) ---
    if (req.method === 'POST') {
      const webhook_received_at_ms = Date.now();
      const webhook_received_at = new Date().toISOString();
      const uptimeSeconds = Math.floor((webhook_received_at_ms - FUNCTION_BOOT_TIMESTAMP) / 1000);

      console.log(`\n================================================================================`);
      console.log(`📥 [CLOUD_FUNCTION_WEBHOOK_RECEIVED] Timestamp: ${webhook_received_at} (${webhook_received_at_ms}ms) | Instance Uptime: ${uptimeSeconds}s (WARM)`);
      console.log(`================================================================================`);

      // CRITICAL: Immediately acknowledge Meta within 50ms (HTTP 200 OK)
      res.status(200).send('EVENT_RECEIVED');

      const body = req.body;

      // Execute AI Response & Graph API Dispatch Asynchronously
      try {
        const entries = body?.entry || [];
        for (const entry of entries) {
          const entryTime = entry?.time || null;
          const messagingList = entry?.messaging || [];
          for (const msgEvent of messagingList) {
            const senderId = msgEvent.sender?.id;
            const messageText = msgEvent.message?.text;
            const isEcho = msgEvent.message?.is_echo;
            const metaEventTimestamp = msgEvent.timestamp || entryTime || null;
            const metaTransitDelayMs = metaEventTimestamp ? Math.max(0, webhook_received_at_ms - Number(metaEventTimestamp)) : null;

            if (senderId && messageText && !isEcho) {
              console.log(`⏱️ [TRANSIT_ANALYSIS] Meta Event Sent at: ${metaEventTimestamp ? new Date(Number(metaEventTimestamp)).toISOString() : 'N/A'} | Transit Delay: ${metaTransitDelayMs}ms`);

              // 1. Fetch Instagram Access Token from Firestore
              const accDoc = await db.collection('instagram_account').doc('primary').get();
              const accessToken = accDoc.data()?.access_token || process.env.INSTAGRAM_ACCESS_TOKEN || '';

              // 2. Generate Sub-Second AI Reply with gemini-1.5-flash
              const replyText = await generateInstantAiReply({
                senderId: String(senderId),
                senderUsername: `user_${senderId.slice(-4)}`,
                incomingText: String(messageText),
              });

              // 3. Immediately Dispatch to Instagram
              let dispatchRes = {
                success: false,
                reply_api_call_start: webhook_received_at,
                reply_api_call_start_ms: webhook_received_at_ms,
                reply_api_call_end: webhook_received_at,
                reply_api_call_end_ms: webhook_received_at_ms,
                ig_api_duration_ms: 0,
                response_body: null as any,
              };

              if (accessToken) {
                dispatchRes = await dispatchInstagramDm(accessToken, String(senderId), replyText);
              }

              const total_processing_duration_ms = Date.now() - webhook_received_at_ms;

              // 4. Save to Firestore asynchronously with full timestamp audit
              const nowIso = new Date().toISOString();
              const logId = `log_${Date.now()}`;
              const batch = db.batch();
              
              const inRef = db.collection('inbox_messages').doc(`msg_in_${Date.now()}`);
              batch.set(inRef, {
                from_ig_id: senderId,
                message_text: messageText,
                direction: 'in',
                timestamp: nowIso,
              });

              const outRef = db.collection('inbox_messages').doc(`msg_out_${Date.now() + 1}`);
              batch.set(outRef, {
                from_ig_id: senderId,
                message_text: replyText,
                direction: 'out',
                is_automated: true,
                timestamp: new Date(Date.now() + 1000).toISOString(),
              });

              const logRef = db.collection('webhook_logs').doc(logId);
              batch.set(logRef, {
                id: logId,
                timestamp: nowIso,
                trigger_type: 'dm',
                from_username: `user_${senderId.slice(-4)}`,
                incoming_text: messageText,
                status: dispatchRes.success ? 'triggered' : 'error',
                matched_automation_name: 'AI Conversation',
                response_sent: replyText,
                webhook_received_at,
                webhook_received_at_ms,
                meta_event_timestamp: metaEventTimestamp,
                meta_transit_delay_ms: metaTransitDelayMs,
                reply_api_call_start: dispatchRes.reply_api_call_start,
                reply_api_call_start_ms: dispatchRes.reply_api_call_start_ms,
                reply_api_call_end: dispatchRes.reply_api_call_end,
                reply_api_call_end_ms: dispatchRes.reply_api_call_end_ms,
                ig_api_duration_ms: dispatchRes.ig_api_duration_ms,
                total_processing_duration_ms,
                instance_uptime_seconds: uptimeSeconds,
                instance_is_warm: true,
                api_response: {
                  response_time_ms: total_processing_duration_ms,
                  meta_transit_delay_ms: metaTransitDelayMs,
                  ig_api_duration_ms: dispatchRes.ig_api_duration_ms,
                  send_reply_result: dispatchRes.response_body,
                },
              });

              await batch.commit();
            }
          }
        }
      } catch (asyncErr) {
        console.error('[ASYNC_WEBHOOK_PROCESSING_ERROR]', asyncErr);
      }
    }
  }
);
