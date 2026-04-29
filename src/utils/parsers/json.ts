/** Convert JSON or JSONL content to structured markdown */
export function parseJson(input: string): string {
  const transcript = tryParseConversationExport(input);
  if (transcript) {
    return `# Conversation Transcript\n\n${transcript}`;
  }

  // TODO: Detect JSON vs JSONL
  // TODO: Serialize keys → headers, values → body text
  // TODO: Handle nested objects/arrays

  try {
    const data = JSON.parse(input) as unknown;
    return jsonToMarkdown(data, 1);
  } catch {
    // Try JSONL
    const lines = input.trim().split('\n');
    return lines
      .map((line, i) => {
        const obj = JSON.parse(line) as unknown;
        return `## Entry ${i + 1}\n\n${jsonToMarkdown(obj, 3)}`;
      })
      .join('\n\n');
  }
}

type ConversationRole = 'user' | 'assistant';

interface ConversationMessage {
  role: ConversationRole;
  text: string;
}

function tryParseConversationExport(input: string): string | null {
  const fromJsonl = parseJsonlConversation(input);
  if (fromJsonl) {
    return fromJsonl;
  }

  try {
    const parsed = JSON.parse(input) as unknown;
    const fromJson = parseJsonConversation(parsed);
    return fromJson;
  } catch {
    return null;
  }
}

function parseJsonConversation(data: unknown): string | null {
  const fromRoleMessages = extractRoleContentMessages(data);
  if (fromRoleMessages) {
    return toTranscript(fromRoleMessages);
  }

  const fromClaudePrivacy = extractClaudePrivacyMessages(data);
  if (fromClaudePrivacy) {
    return toTranscript(fromClaudePrivacy);
  }

  const fromChatGpt = extractChatGptMappingMessages(data);
  if (fromChatGpt) {
    return toTranscript(fromChatGpt);
  }

  const fromSlack = extractSlackMessages(data);
  if (fromSlack) {
    return toTranscript(fromSlack);
  }

  return null;
}

function parseJsonlConversation(input: string): string | null {
  const lines = input
    .trim()
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  if (lines.length < 2) {
    return null;
  }

  const entries: Record<string, unknown>[] = [];
  for (const line of lines) {
    try {
      const parsed = JSON.parse(line) as unknown;
      if (!isRecord(parsed)) {
        return null;
      }
      entries.push(parsed);
    } catch {
      return null;
    }
  }

  const claudeMessages: ConversationMessage[] = [];
  for (const entry of entries) {
    const type = asString(entry.type);
    const message = isRecord(entry.message) ? entry.message : null;
    if (!type || !message) {
      continue;
    }
    if (type === 'human' || type === 'user') {
      const text = extractText(message.content);
      if (text) claudeMessages.push({ role: 'user', text });
    } else if (type === 'assistant') {
      const text = extractText(message.content);
      if (text) claudeMessages.push({ role: 'assistant', text });
    }
  }
  if (hasConversationShape(claudeMessages)) {
    return toTranscript(claudeMessages);
  }

  let hasSessionMeta = false;
  const codexMessages: ConversationMessage[] = [];
  for (const entry of entries) {
    const type = asString(entry.type);
    if (type === 'session_meta') {
      hasSessionMeta = true;
      continue;
    }
    if (type !== 'event_msg') {
      continue;
    }
    const payload = isRecord(entry.payload) ? entry.payload : null;
    if (!payload) {
      continue;
    }
    const payloadType = asString(payload.type);
    const message = asString(payload.message);
    if (!message) {
      continue;
    }
    if (payloadType === 'user_message') {
      codexMessages.push({ role: 'user', text: message });
    } else if (payloadType === 'agent_message') {
      codexMessages.push({ role: 'assistant', text: message });
    }
  }
  if (hasSessionMeta && hasConversationShape(codexMessages)) {
    return toTranscript(codexMessages);
  }

  return null;
}

function extractRoleContentMessages(data: unknown): ConversationMessage[] | null {
  if (Array.isArray(data)) {
    const messages = mapRoleContentMessages(data);
    return hasConversationShape(messages) ? messages : null;
  }

  if (isRecord(data)) {
    const messages = Array.isArray(data.messages) ? mapRoleContentMessages(data.messages) : [];
    return hasConversationShape(messages) ? messages : null;
  }

  return null;
}

function extractClaudePrivacyMessages(data: unknown): ConversationMessage[] | null {
  if (!Array.isArray(data)) {
    return null;
  }
  const messages: ConversationMessage[] = [];
  for (const convo of data) {
    if (!isRecord(convo) || !Array.isArray(convo.chat_messages)) {
      continue;
    }
    messages.push(...mapRoleContentMessages(convo.chat_messages));
  }
  return hasConversationShape(messages) ? messages : null;
}

function extractChatGptMappingMessages(data: unknown): ConversationMessage[] | null {
  if (!isRecord(data) || !isRecord(data.mapping)) {
    return null;
  }

  const mapping: Record<string, unknown> = data.mapping;
  let rootId: string | null = null;
  let fallbackRootId: string | null = null;

  for (const [nodeId, rawNode] of Object.entries(mapping)) {
    if (!isRecord(rawNode) || rawNode.parent !== null) {
      continue;
    }
    if (rawNode.message === null) {
      rootId = nodeId;
      break;
    }
    if (!fallbackRootId) {
      fallbackRootId = nodeId;
    }
  }

  const startId = rootId ?? fallbackRootId;
  if (!startId) {
    return null;
  }

  const messages: ConversationMessage[] = [];
  const visited = new Set<string>();
  let currentId: string | null = startId;

  while (currentId && !visited.has(currentId)) {
    visited.add(currentId);
    const node: unknown = mapping[currentId];
    if (!isRecord(node)) {
      break;
    }

    if (isRecord(node.message)) {
      const message = node.message;
      const role = isRecord(message.author) ? asString(message.author.role) : null;
      const text = extractChatGptParts(message.content);
      if (role === 'user' && text) {
        messages.push({ role: 'user', text });
      } else if (role === 'assistant' && text) {
        messages.push({ role: 'assistant', text });
      }
    }

    const children: unknown[] = Array.isArray(node.children) ? node.children : [];
    currentId = typeof children[0] === 'string' ? children[0] : null;
  }

  return hasConversationShape(messages) ? messages : null;
}

function extractSlackMessages(data: unknown): ConversationMessage[] | null {
  if (!Array.isArray(data)) {
    return null;
  }

  const userRoles = new Map<string, ConversationRole>();
  const messages: ConversationMessage[] = [];

  for (const item of data) {
    if (!isRecord(item) || asString(item.type) !== 'message') {
      continue;
    }
    const speaker = asString(item.user) ?? asString(item.username);
    const text = asString(item.text);
    if (!speaker || !text) {
      continue;
    }

    if (!userRoles.has(speaker)) {
      userRoles.set(speaker, userRoles.size % 2 === 0 ? 'user' : 'assistant');
    }
    const role = userRoles.get(speaker)!;
    messages.push({ role, text });
  }

  return hasConversationShape(messages) ? messages : null;
}

function mapRoleContentMessages(items: unknown[]): ConversationMessage[] {
  const messages: ConversationMessage[] = [];
  for (const item of items) {
    if (!isRecord(item)) {
      continue;
    }
    const roleRaw = asString(item.role);
    const role = normalizeRole(roleRaw);
    if (!role) {
      continue;
    }
    const text = extractText(item.content);
    if (!text) {
      continue;
    }
    messages.push({ role, text });
  }
  return messages;
}

function normalizeRole(role: string | null): ConversationRole | null {
  if (!role) {
    return null;
  }
  if (role === 'user' || role === 'human') {
    return 'user';
  }
  if (role === 'assistant' || role === 'ai') {
    return 'assistant';
  }
  return null;
}

function extractText(content: unknown): string | null {
  if (typeof content === 'string') {
    return content.trim() || null;
  }

  if (Array.isArray(content)) {
    const parts: string[] = [];
    for (const item of content) {
      if (typeof item === 'string') {
        parts.push(item);
      } else if (isRecord(item) && asString(item.type) === 'text') {
        const text = asString(item.text);
        if (text) {
          parts.push(text);
        }
      }
    }
    const joined = parts.join(' ').trim();
    return joined || null;
  }

  if (isRecord(content)) {
    return asString(content.text) ?? null;
  }

  return null;
}

function extractChatGptParts(content: unknown): string | null {
  if (!isRecord(content) || !Array.isArray(content.parts)) {
    return null;
  }
  const joined = content.parts
    .filter((part): part is string => typeof part === 'string' && part.length > 0)
    .join(' ')
    .trim();
  return joined || null;
}

function hasConversationShape(messages: ConversationMessage[]): boolean {
  if (messages.length < 2) {
    return false;
  }
  const hasUser = messages.some((m) => m.role === 'user');
  const hasAssistant = messages.some((m) => m.role === 'assistant');
  return hasUser && hasAssistant;
}

function toTranscript(messages: ConversationMessage[]): string {
  const lines: string[] = [];
  let index = 0;

  while (index < messages.length) {
    const current = messages[index];
    if (current.role === 'user') {
      lines.push(`> ${current.text}`);
      const next = messages[index + 1];
      if (next && next.role === 'assistant') {
        lines.push('');
        lines.push(next.text);
        index += 2;
      } else {
        index += 1;
      }
    } else {
      lines.push(current.text);
      index += 1;
    }
    lines.push('');
  }

  return lines.join('\n').trim();
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function asString(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;
}

function jsonToMarkdown(data: unknown, headingLevel: number): string {
  if (data === null || data === undefined) return '';
  if (typeof data !== 'object') return String(data);
  if (Array.isArray(data)) {
    return data.map((item, i) => `${i + 1}. ${jsonToMarkdown(item, headingLevel + 1)}`).join('\n');
  }
  const prefix = '#'.repeat(Math.min(headingLevel, 6));
  return Object.entries(data as Record<string, unknown>)
    .map(([key, value]) => {
      if (typeof value === 'object' && value !== null) {
        return `${prefix} ${key}\n\n${jsonToMarkdown(value, headingLevel + 1)}`;
      }
      return `**${key}:** ${String(value)}`;
    })
    .join('\n\n');
}
