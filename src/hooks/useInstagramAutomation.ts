import { useState, useCallback } from 'react';
import { useApp } from '../context/AppContext';
import { generateGeminiChatReply } from '../lib/geminiKeyRotator';
import { Automation, InboxMessage } from '../types';

export interface UseInstagramAutomationReturn {
  isProcessing: boolean;
  lastResponseLatencyMs: number | null;
  sendFastTestMessage: (username: string, text: string, triggerType?: 'dm' | 'comment' | 'story_reply') => Promise<{
    success: boolean;
    replyText: string;
    latencyMs: number;
  }>;
  generateInstantAiReply: (incomingText: string, senderUsername: string, systemInstruction?: string) => Promise<{
    reply: string;
    latencyMs: number;
    usedKeyLabel: string;
  }>;
}

/**
 * Custom React Hook for Sub-Second Instagram Automation & Instant AI DM Handling
 */
export function useInstagramAutomation(): UseInstagramAutomationReturn {
  const { automations, inboxMessages, simulateWebhookEvent } = useApp();
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastResponseLatencyMs, setLastResponseLatencyMs] = useState<number | null>(null);

  /**
   * Fast Simulation Dispatch (via Express / Cloud Functions backend)
   */
  const sendFastTestMessage = useCallback(
    async (username: string, text: string, triggerType: 'dm' | 'comment' | 'story_reply' = 'dm') => {
      setIsProcessing(true);
      const start = performance.now();
      try {
        const res = await simulateWebhookEvent(triggerType, username, text);
        const elapsed = Math.round(performance.now() - start);
        setLastResponseLatencyMs(elapsed);
        return {
          success: res.status !== 'error',
          replyText: res.response_sent || '',
          latencyMs: elapsed,
        };
      } finally {
        setIsProcessing(false);
      }
    },
    [simulateWebhookEvent]
  );

  /**
   * Ultra-Fast Direct AI Reply Generator (< 1s Response)
   * Uses gemini-1.5-flash + maxOutputTokens: 120 + minimal context history (last 2 messages)
   */
  const generateInstantAiReply = useCallback(
    async (incomingText: string, senderUsername: string, systemInstruction?: string) => {
      setIsProcessing(true);
      const start = performance.now();
      try {
        const cleanUser = senderUsername.replace(/^@/, '').toLowerCase().trim();

        // Optimized Context: Fetch ONLY the last 2 conversation messages
        const recentHistory = (inboxMessages || [])
          .filter((m: InboxMessage) => m?.from_username?.toLowerCase() === cleanUser)
          .sort((a, b) => new Date(a?.timestamp || 0).getTime() - new Date(b?.timestamp || 0).getTime())
          .slice(-2)
          .map((m) => ({
            role: (m.direction === 'in' ? 'user' : 'model') as 'user' | 'model',
            text: m.message_text || '',
          }));

        const result = await generateGeminiChatReply({
          history: recentHistory,
          incomingText,
          systemInstruction:
            systemInstruction ||
            'You are a friendly Instagram assistant. Reply politely and concisely in 1-2 short sentences (under 180 characters).',
          model: 'gemini-1.5-flash',
          maxOutputTokens: 120,
        });

        const elapsed = Math.round(performance.now() - start);
        setLastResponseLatencyMs(elapsed);

        return {
          reply: result.reply,
          latencyMs: elapsed,
          usedKeyLabel: result.usedKeyLabel,
        };
      } finally {
        setIsProcessing(false);
      }
    },
    [inboxMessages]
  );

  return {
    isProcessing,
    lastResponseLatencyMs,
    sendFastTestMessage,
    generateInstantAiReply,
  };
}
