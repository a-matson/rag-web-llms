import type { Message } from "../app/page";

export const MAX_CONTEXT_TOKENS = 4096;

// Rough estimation: 1 token ≈ 4 chars
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

export function getSlidingWindow(messages: Message[], maxTokens: number): Message[] {
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

export async function summarizeOldMessages(
  engine: any, 
  oldMessages: Message[], 
  currentSummary: string
): Promise<string> {
  if (oldMessages.length === 0) return currentSummary;

  const conversationText = oldMessages
    .map(m => `${m.role}: ${m.content}`)
    .join("\n");

  const prompt = `Summarize the following older conversation details. 
  Incorporate this existing summary: "${currentSummary}".
  
  New conversation to summarize:
  ${conversationText}`;

  const response = await engine.chat.completions.create({
    messages: [{ role: "user", content: prompt }],
    temperature: 0.3,
  });

  return response.choices[0].message.content;
}