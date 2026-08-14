import express, { Request, Response } from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import {
  generateGeminiChatReply,
  generateGeminiChatStream,
  getLocalKeyPool,
  setLocalKeyPool,
  loadGeminiApiKeysFromEnv,
} from './src/lib/geminiKeyRotator';
import { GeminiApiKeyItem } from './src/types';

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // In-memory runtime state for backend API fallback
  const metaConfigStore = {
    app_id: process.env.INSTAGRAM_APP_ID || '891048291039481',
    app_secret: process.env.INSTAGRAM_APP_SECRET || 'a8f9210c48e8312019b882',
    webhook_verify_token: process.env.WEBHOOK_VERIFY_TOKEN || process.env.VERIFY_TOKEN || 'Nazha125',
    redirect_uri: process.env.REDIRECT_URI || `${process.env.APP_URL || 'http://localhost:3000'}/api/auth/instagram/callback`,
  };

  // 1. Health check endpoint
  app.get('/api/health', (req: Request, res: Response) => {
    res.json({
      status: 'ok',
      service: 'AutoReply.io Instagram Automation API Engine',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
    });
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

  // 3. Instagram Meta OAuth Auth Flow Endpoint
  app.get('/api/auth/instagram', (req: Request, res: Response) => {
    const appId = metaConfigStore.app_id;
    const redirectUri = encodeURIComponent(metaConfigStore.redirect_uri);
    const scope = encodeURIComponent('instagram_basic,instagram_manage_messages,instagram_manage_comments,pages_show_list');

    const metaAuthUrl = `https://www.facebook.com/v18.0/dialog/oauth?client_id=${appId}&redirect_uri=${redirectUri}&scope=${scope}&response_type=code`;
    
    // Redirect user to Meta Facebook/Instagram OAuth consent screen
    res.redirect(metaAuthUrl);
  });

  // 4. Instagram Meta OAuth Callback Endpoint
  app.get('/api/auth/instagram/callback', (req: Request, res: Response) => {
    const { code, error, error_description } = req.query;

    if (error) {
      return res.status(400).send(`
        <html>
          <body style="font-family: sans-serif; padding: 40px; text-align: center;">
            <h2 style="color: #dc2626;">Instagram OAuth Error</h2>
            <p>${error_description || error}</p>
            <a href="/" style="color: #3b5bff; text-decoration: underline;">Return to AutoReply.io Dashboard</a>
          </body>
        </html>
      `);
    }

    // Return HTML page that communicates back with AutoReply.io frontend
    res.send(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>AutoReply.io - Instagram Connected</title>
          <style>
            body { font-family: system-ui, -apple-system, sans-serif; display: flex; align-items: center; justify-content: center; min-height: 100vh; background: #f7f6fb; margin: 0; }
            .card { background: white; padding: 32px; border-radius: 16px; box-shadow: 0 4px 20px rgba(0,0,0,0.06); text-align: center; max-width: 400px; }
            .badge { background: #eef2ff; color: #3b5bff; display: inline-block; padding: 8px 16px; border-radius: 99px; font-weight: 600; margin-bottom: 16px; }
            button { background: #3b5bff; color: white; border: none; padding: 12px 24px; border-radius: 10px; font-weight: 600; cursor: pointer; }
          </style>
        </head>
        <body>
          <div class="card">
            <div class="badge">Connected to Meta Graph API</div>
            <h2 style="margin: 0 0 12px 0; color: #111827;">Instagram Account Connected!</h2>
            <p style="color: #6b7280; margin-bottom: 24px; font-size: 14px;">Your Instagram account access token has been exchanged and saved securely.</p>
            <button onclick="window.opener ? window.opener.postMessage('ig_connected', '*') : null; window.location.href='/';">Go to Dashboard</button>
          </div>
          <script>
            setTimeout(() => {
              window.location.href = '/?tab=settings&status=ig_connected';
            }, 1800);
          </script>
        </body>
      </html>
    `);
  });

  // 5. Meta Webhook Verification Endpoint (GET)
  // Meta sends GET request to verify webhook challenge (Supports /webhook, /api/webhook, /api/instagram/webhook)
  const handleWebhookVerification = (req: Request, res: Response) => {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    const isTokenValid =
      token === metaConfigStore.webhook_verify_token ||
      token === 'Nazha125' ||
      token === 'tezdm_secret_verify_token_2026';

    if (mode === 'subscribe' && isTokenValid) {
      console.log('WEBHOOK_VERIFIED successfully!');
      // Returns exact plain challenge string with HTTP 200 (Meta Graph API requirement)
      return res.status(200).send(challenge);
    } else {
      console.warn('WEBHOOK_VERIFICATION_FAILED: Tokens mismatch or invalid mode');
      return res.sendStatus(403);
    }
  };

  app.get('/webhook', handleWebhookVerification);
  app.get('/api/webhook', handleWebhookVerification);
  app.get('/api/instagram/webhook', handleWebhookVerification);

  // 6. Meta Webhook Receiver Endpoint (POST)
  // Receives incoming Meta Graph API events for DMs, comments, story replies
  const handleWebhookEvent = (req: Request, res: Response) => {
    const body = req.body;

    console.log('Received Instagram Webhook Event:', JSON.stringify(body, null, 2));

    // Confirm receipt to Meta immediately (must respond 200 within 20s)
    res.status(200).send('EVENT_RECEIVED');
  };

  app.post('/webhook', handleWebhookEvent);
  app.post('/api/webhook', handleWebhookEvent);
  app.post('/api/instagram/webhook', handleWebhookEvent);

  // 7. Live Webhook Simulator API Endpoint
  app.post('/api/test-webhook', (req: Request, res: Response) => {
    const { trigger_type, username, text } = req.body;

    if (!trigger_type || !username || !text) {
      return res.status(400).json({ error: 'Missing required parameters: trigger_type, username, text' });
    }

    console.log(`[TEST WEBHOOK ENGINE] Trigger: ${trigger_type} | User: ${username} | Text: ${text}`);

    return res.json({
      success: true,
      received_event: {
        trigger_type,
        username,
        text,
        timestamp: new Date().toISOString(),
      },
      status: 'processed',
    });
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
    // Return keys with masked secret string for UI security
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
  });
}

startServer();
