import { GoogleGenAI, GenerateContentResponse } from '@google/genai';
import { GeminiApiKeyItem } from '../types';

/**
 * 1. AUTOMATIC DYNAMIC .ENV SCANNER
 * Scans process.env for all variables starting with GEMINI_API_KEY_ or GEMINI_KEY_
 * (e.g. GEMINI_API_KEY_1, GEMINI_API_KEY_2, GEMINI_API_KEY_3, etc.) plus GEMINI_API_KEY.
 * Filters out empty or placeholder strings and returns an array of structured key objects.
 */
export function loadGeminiApiKeysFromEnv(): GeminiApiKeyItem[] {
  const keysMap = new Map<string, GeminiApiKeyItem>();

  // A. Primary default GEMINI_API_KEY
  if (process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim()) {
    const primaryVal = process.env.GEMINI_API_KEY.trim();
    if (!primaryVal.includes('MY_GEMINI_API_KEY') && !primaryVal.includes('your_key_here')) {
      keysMap.set(primaryVal, {
        id: 'env_gemini_api_key_primary',
        key: primaryVal,
        label: 'GEMINI_API_KEY (Primary .env)',
        status: 'active',
        cooldownUntil: null,
        requestCount: 0,
        errorCount: 0,
        lastUsedAt: null,
      });
    }
  }

  // B. Dynamic Scanning of process.env for GEMINI_API_KEY_* or GEMINI_KEY_*
  Object.keys(process.env).forEach((envVarName) => {
    if (
      (envVarName.startsWith('GEMINI_API_KEY_') || envVarName.startsWith('GEMINI_KEY_')) &&
      process.env[envVarName]
    ) {
      const val = process.env[envVarName]!.trim();
      if (val && !val.includes('your_key_here') && !keysMap.has(val)) {
        keysMap.set(val, {
          id: `env_${envVarName.toLowerCase()}`,
          key: val,
          label: `${envVarName} (.env)`,
          status: 'active',
          cooldownUntil: null,
          requestCount: 0,
          errorCount: 0,
          lastUsedAt: null,
        });
      }
    }
  });

  const scannedKeys = Array.from(keysMap.values());

  // Safe fallback if process.env contains no keys
  if (scannedKeys.length === 0) {
    const fallbackVal = process.env.GEMINI_API_KEY || 'AIzaSy_demo_default_key_primary';
    return [
      {
        id: 'default_fallback_key',
        key: fallbackVal,
        label: 'GEMINI_API_KEY (Default)',
        status: 'active',
        cooldownUntil: null,
        requestCount: 0,
        errorCount: 0,
        lastUsedAt: null,
      },
    ];
  }

  return scannedKeys;
}

// Global in-memory Key Pool & Round-Robin Pointer
let localKeyPool: GeminiApiKeyItem[] = loadGeminiApiKeysFromEnv();
let roundRobinIndex = 0; // Cycles on every single message request

export function getLocalKeyPool(): GeminiApiKeyItem[] {
  // Sync pool with dynamic .env variables on fetch
  const envKeys = loadGeminiApiKeysFromEnv();
  
  // Merge envKeys into localKeyPool to preserve existing cooldown states & stats
  envKeys.forEach((envK) => {
    if (!localKeyPool.some((existingK) => existingK.key === envK.key)) {
      localKeyPool.push(envK);
    }
  });

  return localKeyPool;
}

export function setLocalKeyPool(keys: GeminiApiKeyItem[]) {
  localKeyPool = keys;
}

export interface ChatHistoryMessage {
  role: 'user' | 'model';
  text: string;
}

export interface GeminiChatOptions {
  history: ChatHistoryMessage[];
  incomingText: string;
  systemInstruction?: string;
  model?: 'gemini-3.6-flash' | 'gemini-3.1-flash-lite';
  keysPool?: GeminiApiKeyItem[];
  onKeyStatusChange?: (updatedKeys: GeminiApiKeyItem[]) => void;
}

/**
 * 2. EVERY MESSAGE ROUND-ROBIN ROTATION & FAILOVER HANDLER
 * 
 * Requirements met:
 * - Message-by-Message Rotation: Cycles through available active keys using a global round-robin pointer.
 * - Automatic 429 Failover: Catches HTTP 429 / Rate Limit / Quota Exhaustion, marks key in cooldown, and immediately retries using the next key seamlessly.
 * - Context Support: Preserves multi-turn chat history.
 */
export async function generateGeminiChatReply(
  options: GeminiChatOptions
): Promise<{ reply: string; usedKeyLabel: string; rotatedCount: number }> {
  const modelName = options.model || 'gemini-3.6-flash';
  const systemInstruction =
    options.systemInstruction ||
    'You are AutoReply.io AI Instagram Assistant. Reply politely, concisely (under 250 characters suitable for Instagram DM), and answer user inquiries accurately.';

  // Ensure fresh pool merge from process.env scanning
  let pool = getLocalKeyPool();
  if (options.keysPool && options.keysPool.length > 0) {
    // Merge provided options pool with env keys
    const optionsMap = new Map<string, GeminiApiKeyItem>();
    pool.forEach((k) => optionsMap.set(k.key, k));
    options.keysPool.forEach((k) => optionsMap.set(k.key, k));
    pool = Array.from(optionsMap.values());
  }

  let attempts = 0;
  const maxAttempts = Math.max(pool.length * 2, 5);
  let rotatedCount = 0;

  while (attempts < maxAttempts) {
    attempts++;
    const now = new Date();

    // Clear expired cooldowns
    pool = pool.map((k) => {
      if (k.status === 'cooldown' && k.cooldownUntil && new Date(k.cooldownUntil) <= now) {
        return { ...k, status: 'active', cooldownUntil: null };
      }
      return k;
    });

    // Filter active keys
    const activeKeys = pool.filter((k) => k.status === 'active');

    // If ALL keys are in cooldown state
    if (activeKeys.length === 0) {
      const sortedByExpiry = [...pool].sort((a, b) => {
        const tA = a.cooldownUntil ? new Date(a.cooldownUntil).getTime() : 0;
        const tB = b.cooldownUntil ? new Date(b.cooldownUntil).getTime() : 0;
        return tA - tB;
      });

      const earliestKey = sortedByExpiry[0];
      const expiryMs = earliestKey.cooldownUntil ? new Date(earliestKey.cooldownUntil).getTime() : Date.now();
      const waitTimeMs = Math.max(100, expiryMs - Date.now());

      console.warn(`[GEMINI ROTATOR] All ${pool.length} keys in cooldown! Waiting ${waitTimeMs}ms for key '${earliestKey.label}' cooldown reset...`);
      await new Promise((resolve) => setTimeout(resolve, Math.min(waitTimeMs + 50, 8000)));

      pool = pool.map((k) => (k.id === earliestKey.id ? { ...k, status: 'active', cooldownUntil: null } : k));
      continue;
    }

    // --- ROUND ROBIN SELECTION (Every Message hits the next key) ---
    const chosenIndex = roundRobinIndex % activeKeys.length;
    roundRobinIndex = (roundRobinIndex + 1) % Number.MAX_SAFE_INTEGER; // Advance index for next message!

    const selectedKey = activeKeys[chosenIndex];
    selectedKey.requestCount = (selectedKey.requestCount || 0) + 1;
    selectedKey.lastUsedAt = new Date().toISOString();

    try {
      console.log(
        `[GEMINI ROUND-ROBIN ROTATOR] Message hit key #${chosenIndex + 1}/${activeKeys.length}: '${selectedKey.label}' (${selectedKey.key.slice(0, 8)}...)`
      );

      const ai = new GoogleGenAI({
        apiKey: selectedKey.key,
        httpOptions: {
          headers: {
            'User-Agent': 'autoreply-ai-rotator',
          },
        },
      });

      // Construct multi-turn contents preserving context history
      const contents = options.history.map((msg) => ({
        role: msg.role === 'user' ? 'user' : 'model',
        parts: [{ text: msg.text }],
      }));

      // Append incoming message
      contents.push({
        role: 'user',
        parts: [{ text: options.incomingText }],
      });

      const response: GenerateContentResponse = await ai.models.generateContent({
        model: modelName,
        contents,
        config: {
          systemInstruction,
          temperature: 0.7,
        },
      });

      const replyText = response.text ? response.text.trim() : 'Thank you for messaging us! How can I assist you today?';

      // Persist state updates
      setLocalKeyPool(pool);
      if (options.onKeyStatusChange) {
        options.onKeyStatusChange(pool);
      }

      return {
        reply: replyText,
        usedKeyLabel: selectedKey.label,
        rotatedCount,
      };
    } catch (err: any) {
      const errStr = String(err?.message || err);
      console.warn(`[GEMINI FAILOVER TRIGGERED] Key '${selectedKey.label}' failed:`, errStr);

      selectedKey.errorCount = (selectedKey.errorCount || 0) + 1;

      const isRateLimit =
        errStr.includes('429') ||
        errStr.includes('RESOURCE_EXHAUSTED') ||
        errStr.includes('quota') ||
        errStr.includes('rate limit') ||
        errStr.includes('Too Many Requests');

      if (isRateLimit) {
        // Mark key in cooldown for 60 seconds
        selectedKey.status = 'cooldown';
        selectedKey.cooldownUntil = new Date(Date.now() + 60000).toISOString();
        rotatedCount++;

        console.warn(
          `[GEMINI FAILOVER] HTTP 429 Rate Limit hit on '${selectedKey.label}'. Placed on 60s cooldown until ${selectedKey.cooldownUntil}. Retrying seamlessly with next key...`
        );
      } else {
        // Generic error cooldown
        selectedKey.status = 'cooldown';
        selectedKey.cooldownUntil = new Date(Date.now() + 15000).toISOString();
        rotatedCount++;
      }

      setLocalKeyPool(pool);
      if (options.onKeyStatusChange) {
        options.onKeyStatusChange(pool);
      }
    }
  }

  // Graceful fallback response
  return {
    reply: 'Hello! Thank you for messaging us. Our AI Assistant is experiencing high inquiry traffic and will get back to you shortly!',
    usedKeyLabel: 'Fallback System',
    rotatedCount,
  };
}

/**
 * 3. STREAMING CHAT GENERATION WITH ROUND-ROBIN & FAILOVER SUPPORT
 */
export async function* generateGeminiChatStream(
  options: GeminiChatOptions
): AsyncGenerator<{ chunk: string; usedKeyLabel: string }, void, unknown> {
  const modelName = options.model || 'gemini-3.6-flash';
  const systemInstruction =
    options.systemInstruction ||
    'You are AutoReply.io AI Assistant. Reply politely and answer user questions.';

  let pool = getLocalKeyPool();
  let attempts = 0;
  const maxAttempts = Math.max(pool.length * 2, 5);

  while (attempts < maxAttempts) {
    attempts++;
    const now = new Date();

    pool = pool.map((k) => {
      if (k.status === 'cooldown' && k.cooldownUntil && new Date(k.cooldownUntil) <= now) {
        return { ...k, status: 'active', cooldownUntil: null };
      }
      return k;
    });

    const activeKeys = pool.filter((k) => k.status === 'active');
    if (activeKeys.length === 0) {
      await new Promise((r) => setTimeout(r, 2000));
      continue;
    }

    const chosenIndex = roundRobinIndex % activeKeys.length;
    roundRobinIndex = (roundRobinIndex + 1) % Number.MAX_SAFE_INTEGER;
    const selectedKey = activeKeys[chosenIndex];

    try {
      const ai = new GoogleGenAI({
        apiKey: selectedKey.key,
        httpOptions: { headers: { 'User-Agent': 'autoreply-ai-rotator-stream' } },
      });

      const contents = options.history.map((msg) => ({
        role: msg.role === 'user' ? 'user' : 'model',
        parts: [{ text: msg.text }],
      }));
      contents.push({ role: 'user', parts: [{ text: options.incomingText }] });

      const streamResult = await ai.models.generateContentStream({
        model: modelName,
        contents,
        config: { systemInstruction, temperature: 0.7 },
      });

      for await (const chunk of streamResult) {
        if (chunk.text) {
          yield { chunk: chunk.text, usedKeyLabel: selectedKey.label };
        }
      }
      return; // Stream completed successfully!
    } catch (err: any) {
      const errStr = String(err?.message || err);
      console.warn(`[GEMINI STREAM FAILOVER] Key '${selectedKey.label}' stream error:`, errStr);

      selectedKey.errorCount = (selectedKey.errorCount || 0) + 1;
      selectedKey.status = 'cooldown';
      selectedKey.cooldownUntil = new Date(Date.now() + 60000).toISOString();
      setLocalKeyPool(pool);
    }
  }

  yield { chunk: 'Fallback: Our AI Assistant is busy. Please try again shortly.', usedKeyLabel: 'Fallback System' };
}
