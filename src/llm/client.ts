// Claude API 客户端

import Anthropic from '@anthropic-ai/sdk';
import type { EdenConfig } from '../persistence/config.js';

let client: Anthropic | null = null;

export function getClient(config: EdenConfig): Anthropic {
  if (!client) {
    client = new Anthropic({ apiKey: config.apiKey });
  }
  return client;
}

export interface ThinkResult {
  thought: string;        // Eden 的内心想法
  speak: string | null;   // 要说出来的话（null = 保持沉默）
  mood: string;           // 情绪关键词
  moodIntensity: number;  // 情绪强度 0-1
  nextAction: string;     // 下一个行为提示
}

export async function think(
  config: EdenConfig,
  systemPrompt: string,
  userMessage: string,
): Promise<ThinkResult> {
  const api = getClient(config);

  const response = await api.messages.create({
    model: config.model,
    max_tokens: 500,
    system: systemPrompt,
    messages: [{ role: 'user', content: userMessage }],
  });

  const text = response.content[0].type === 'text' ? response.content[0].text : '';

  return parseThinkResult(text);
}

export async function chat(
  config: EdenConfig,
  systemPrompt: string,
  messages: Array<{ role: 'user' | 'assistant'; content: string }>,
): Promise<string> {
  const api = getClient(config);

  const response = await api.messages.create({
    model: config.model,
    max_tokens: 300,
    system: systemPrompt,
    messages,
  });

  return response.content[0].type === 'text' ? response.content[0].text : '';
}

function parseThinkResult(text: string): ThinkResult {
  // LLM 返回 JSON 格式
  try {
    // 尝试从文本中提取 JSON
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        thought: parsed.thought || text,
        speak: parsed.speak || null,
        mood: parsed.mood || 'peaceful',
        moodIntensity: typeof parsed.moodIntensity === 'number' ? parsed.moodIntensity : 0.5,
        nextAction: parsed.nextAction || 'idle',
      };
    }
  } catch { /* fallback */ }

  // 解析失败时把整段文字当作想法
  return {
    thought: text,
    speak: text.length < 100 ? text : null,
    mood: 'peaceful',
    moodIntensity: 0.5,
    nextAction: 'idle',
  };
}
