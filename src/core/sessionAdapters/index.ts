import { ClaudeCodeAdapter } from './claudeCode.js';
import { CodexCliAdapter } from './codexCli.js';
import { CopilotCliAdapter } from './copilotCli.js';
import { CopilotChatAdapter } from './copilotChat.js';
import { CursorAdapter } from './cursor.js';
import { GeminiCliAdapter } from './geminiCli.js';
import { ObsidianAdapter } from './obsidian.js';
import { SESSION_FRAMEWORKS, type SessionAdapter, type SessionFramework } from './types.js';

const ADAPTERS: Record<SessionFramework, SessionAdapter> = {
  'claude-code': new ClaudeCodeAdapter(),
  'codex-cli': new CodexCliAdapter(),
  'copilot-cli': new CopilotCliAdapter(),
  'copilot-chat': new CopilotChatAdapter(),
  'cursor': new CursorAdapter(),
  'gemini-cli': new GeminiCliAdapter(),
  'obsidian': new ObsidianAdapter(),
};

export function listSessionFrameworks(): SessionFramework[] {
  return [...SESSION_FRAMEWORKS];
}

export function isSessionFramework(value: string): value is SessionFramework {
  return SESSION_FRAMEWORKS.includes(value as SessionFramework);
}

export function getSessionAdapter(framework: SessionFramework): SessionAdapter {
  return ADAPTERS[framework];
}