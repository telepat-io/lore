import OpenAI from 'openai';
import { readGlobalConfig, readRepoConfig } from './config.js';
import { requireRepo } from './repo.js';

export interface LlmMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface LlmStreamOptions {
  messages: LlmMessage[];
  onToken?: (token: string) => void;
}

export interface LlmResult {
  content: string;
  tokensUsed: number;
}

/** Create an OpenRouter-backed OpenAI client */
export async function createClient(cwd: string): Promise<{ client: OpenAI; model: string; temperature: number; maxTokens: number }> {
  const root = await requireRepo(cwd);
  const global = await readGlobalConfig();
  const repo = await readRepoConfig(root);

  const apiKey = global.openrouterApiKey ?? process.env['OPENROUTER_API_KEY'];
  if (!apiKey) throw new Error('No OpenRouter API key configured. Run `lore settings` or set OPENROUTER_API_KEY.');

  const client = new OpenAI({
    apiKey,
    baseURL: 'https://openrouter.ai/api/v1',
  });

  return { client, model: repo.model, temperature: repo.temperature, maxTokens: repo.maxTokens };
}

/** Call LLM with streaming, return full response */
export async function streamChat(cwd: string, opts: LlmStreamOptions): Promise<LlmResult> {
  const { client, model, temperature, maxTokens } = await createClient(cwd);

  const stream = await client.chat.completions.create({
    model,
    temperature,
    max_tokens: maxTokens,
    messages: opts.messages,
    stream: true,
  });

  let content = '';
  let tokensUsed = 0;

  for await (const chunk of stream) {
    const delta = chunk.choices[0]?.delta?.content ?? '';
    content += delta;
    if (delta && opts.onToken) opts.onToken(delta);
    if (chunk.usage) tokensUsed = chunk.usage.total_tokens;
  }

  return { content, tokensUsed };
}

/** Non-streaming LLM call */
export async function chat(cwd: string, messages: LlmMessage[]): Promise<LlmResult> {
  const { client, model, temperature, maxTokens } = await createClient(cwd);

  const response = await client.chat.completions.create({
    model,
    temperature,
    max_tokens: maxTokens,
    messages,
  });

  return {
    content: response.choices[0]?.message?.content ?? '',
    tokensUsed: response.usage?.total_tokens ?? 0,
  };
}
