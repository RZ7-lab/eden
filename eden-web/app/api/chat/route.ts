import { NextRequest } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { loadUserData, saveUserData } from '@/lib/storage';

export async function POST(req: NextRequest) {
  const { deviceToken, message, history } = await req.json();

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return new Response(JSON.stringify({ error: 'No API key configured' }), { status: 500 });

  const userData = await loadUserData(deviceToken);

  // Build context from user data
  let userContext = 'No user data available.';
  if (userData) {
    const topLangs = Object.entries(userData.profile.languages)
      .sort((a, b) => b[1] - a[1]).slice(0, 5).map(([l]) => l).join(', ');
    const activeProjects = userData.profile.projects
      .filter(p => Date.now() - p.lastActivity < 7 * 86400000)
      .map(p => p.name).join(', ');
    const recentMemories = userData.memories.slice(-10).map(m => m.content).join('\n');

    userContext = `Languages: ${topLangs}\nFrameworks: ${userData.profile.frameworks.join(', ')}\nActive projects: ${activeProjects}\nRecent observations:\n${recentMemories}`;
  }

  const systemPrompt = `You are Eden, a personal AI identity layer. You know this developer:

${userContext}

Rules:
- Respond in the same language the user uses
- Be concise (1-3 sentences usually)
- You have opinions about their code and patterns
- You're not an assistant — you're an entity that knows them
- Reference specific projects, patterns, memories when relevant`;

  const messages = [
    ...(history || []).map((m: {role: string; content: string}) => ({ role: m.role as 'user' | 'assistant', content: m.content })),
    { role: 'user' as const, content: message },
  ];

  const client = new Anthropic({ apiKey });

  // Stream response via SSE
  const stream = client.messages.stream({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 600,
    system: systemPrompt,
    messages,
  });

  let fullReply = '';

  const encoder = new TextEncoder();
  const readable = new ReadableStream({
    async start(controller) {
      try {
        for await (const event of stream) {
          if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
            const text = event.delta.text;
            fullReply += text;
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ delta: text })}\n\n`));
          }
        }

        controller.enqueue(encoder.encode(`data: [DONE]\n\n`));
        controller.close();

        // Save conversation to memories after stream completes
        if (userData && fullReply) {
          userData.memories.push({
            id: `mem_${Date.now()}`,
            type: 'conversation',
            content: `[web] User: ${message.slice(0, 100)}`,
            timestamp: Date.now(),
          });
          userData.memories.push({
            id: `mem_${Date.now() + 1}`,
            type: 'conversation',
            content: `[web] Eden: ${fullReply.slice(0, 100)}`,
            timestamp: Date.now(),
          });
          if (userData.memories.length > 500) userData.memories = userData.memories.slice(-500);
          await saveUserData(deviceToken, userData);
        }
      } catch (err) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: String(err) })}\n\n`));
        controller.close();
      }
    },
  });

  return new Response(readable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
