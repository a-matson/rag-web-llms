import type { Message } from "../app/page";

export const MAX_CONTEXT_TOKENS = 4096;

// Rough estimation: 1 token ≈ 4 chars
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

export function getSlidingWindow(
  messages: Message[],
  maxTokens: number,
): Message[] {
  let currentTokens = 0;
  const window: Message[] = [];

  // Iterate backwards to keep the most recent context
  for (let i = messages.length - 1; i >= 0; i--) {
    const msgTokens = estimateTokens(messages[i].content);
    if (currentTokens + msgTokens > maxTokens) break;
    window.unshift(messages[i]);
    currentTokens += msgTokens;
  }

  return window;
}
