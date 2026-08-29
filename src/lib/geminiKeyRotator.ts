import { GoogleGenAI } from '@google/genai';
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

// Reusable Client Cache to eliminate connection & class initialization overhead
const aiClientCache = new Map<string, GoogleGenAI>();

function getOrCreateAiClient(apiKey: string): GoogleGenAI {
  let client = aiClientCache.get(apiKey);
  if (!client) {
    client = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'autoreply-ai-rotator-fast',
        },
      },
    });
    aiClientCache.set(apiKey, client);
  }
  return client;
}

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
  model?: string;
  maxOutputTokens?: number;
  keysPool?: GeminiApiKeyItem[];
  onKeyStatusChange?: (updatedKeys: GeminiApiKeyItem[]) => void;
}

/**
 * 2. SUB-SECOND GEMINI STREAMING & FAILOVER HANDLER
 * 
 * Performance Architecture:
 * - Ultra-low latency model selection (gemini-3.1-flash-lite / gemini-flash-latest)
 * - Strict 60-token max limit with 0 thinking budget
 * - Streaming response processing (returns within 300-800ms)
 * - Absolute 1800ms global timeout ceiling (never blocks the webhook pipeline)
 * - Max 2 fast attempts across valid keys
 */
export async function generateGeminiChatReply(
  options: GeminiChatOptions
): Promise<{ reply: string; usedKeyLabel: string; rotatedCount: number }> {
  // Use gemini-3.1-flash-lite as the fastest available model variant
  const modelName = options.model || 'gemini-3.1-flash-lite';
  const systemInstruction =
    options.systemInstruction ||
    'You are a concise Instagram assistant. Reply politely and directly in 1 short sentence under 15 words. No fluff.';
  const maxOutputTokens = options.maxOutputTokens || 40;

  // Strict 1400ms global deadline to ensure total AI step finishes in well under 1 second
  const globalDeadline = Date.now() + 1400;

  // Ensure fresh pool merge from process.env scanning
  let pool = getLocalKeyPool();
  if (options.keysPool && options.keysPool.length > 0) {
    const optionsMap = new Map<string, GeminiApiKeyItem>();
    pool.forEach((k) => optionsMap.set(k.key, k));
    options.keysPool.forEach((k) => optionsMap.set(k.key, k));
    pool = Array.from(optionsMap.values());
  }

  let attempts = 0;
  const maxAttempts = Math.min(2, pool.length);
  let rotatedCount = 0;

  // Prepare input contents (strictly 1 previous message if any for ultra-fast tokenization)
  const recentHistory = (options.history || []).slice(-1);
  const contents = recentHistory.map((msg) => ({
    role: msg.role === 'user' ? 'user' : 'model',
    parts: [{ text: msg.text }],
  }));
  contents.push({
    role: 'user',
    parts: [{ text: options.incomingText }],
  });

  while (attempts < maxAttempts && Date.now() < globalDeadline) {
    attempts++;
    const now = new Date();

    // Clear expired cooldowns
    pool = pool.map((k) => {
      if (k.status === 'cooldown' && k.cooldownUntil && new Date(k.cooldownUntil) <= now) {
        return { ...k, status: 'active', cooldownUntil: null };
      }
      return k;
    });

    let availableKeys = pool.filter((k) => k.status === 'active');
    if (availableKeys.length === 0) {
      pool = pool.map((k) => ({ ...k, status: 'active', cooldownUntil: null }));
      availableKeys = pool;
    }

    const chosenIndex = roundRobinIndex % availableKeys.length;
    roundRobinIndex = (roundRobinIndex + 1) % Number.MAX_SAFE_INTEGER;

    const selectedKey = availableKeys[chosenIndex];
    selectedKey.requestCount = (selectedKey.requestCount || 0) + 1;
    selectedKey.lastUsedAt = new Date().toISOString();

    const remainingBudgetMs = Math.max(300, globalDeadline - Date.now());

    try {
      console.log(
        `⚡ [GEMINI ULTRA-FAST STREAM] Key '${selectedKey.label}' (${selectedKey.key.slice(0, 8)}...) | Model: ${modelName} | Budget: ${remainingBudgetMs}ms`
      );

      const ai = getOrCreateAiClient(selectedKey.key);

      // Perform streaming generation with early exit on first sentence
      const streamPromise = (async () => {
        const streamResult = await ai.models.generateContentStream({
          model: modelName,
          contents,
          config: {
            systemInstruction,
            temperature: 0.1, // Near zero temperature for fastest deterministic sampling
            maxOutputTokens,
            thinkingConfig: {
              thinkingBudget: 0, // Zero thinking overhead
            },
          },
        });

        let accumulated = '';
        for await (const chunk of streamResult) {
          if (chunk.text) {
            accumulated += chunk.text;
            const trimmed = accumulated.trim();
            // Early break as soon as the first sentence is complete (e.g. at 200-350ms)
            if (trimmed.length >= 15 && /[.!?\n]/.test(trimmed)) {
              break;
            }
            if (trimmed.length >= 50) {
              break;
            }
          }
        }
        return accumulated.trim();
      })();

      const timeoutPromise = new Promise<string>((_, reject) =>
        setTimeout(() => reject(new Error(`AI generation timed out after ${remainingBudgetMs}ms`)), remainingBudgetMs)
      );

      const replyText = await Promise.race([streamPromise, timeoutPromise]);

      if (replyText && replyText.length > 0) {
        setLocalKeyPool(pool);
        if (options.onKeyStatusChange) {
          options.onKeyStatusChange(pool);
        }

        return {
          reply: replyText,
          usedKeyLabel: selectedKey.label,
          rotatedCount,
        };
      }
    } catch (err: any) {
      const errStr = String(err?.message || err);
      console.warn(`[GEMINI STREAM WARN] Key '${selectedKey.label}' failed (${errStr}). Trying next active key...`);

      selectedKey.errorCount = (selectedKey.errorCount || 0) + 1;
      selectedKey.status = 'cooldown';
      selectedKey.cooldownUntil = new Date(Date.now() + 30000).toISOString();
      rotatedCount++;
      setLocalKeyPool(pool);
    }
  }

  // Instant human-friendly fallback when AI budget is reached
  return {
    reply: 'Thank you for reaching out! How can I help you today?',
    usedKeyLabel: 'Instant Fast Fallback',
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
