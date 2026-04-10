import type { RunLogger } from '../logger.js';

export const SESSION_FRAMEWORKS = [
  'claude-code',
  'codex-cli',
  'copilot-cli',
  'copilot-chat',
  'cursor',
  'gemini-cli',
  'obsidian',
] as const;

export type SessionFramework = typeof SESSION_FRAMEWORKS[number];

export interface SessionSource {
  filePath: string;
  sessionMeta: Record<string, unknown>;
}

export interface SessionDiscoverOptions {
  roots?: string[];
  maxFiles: number;
  logger?: RunLogger;
}

export interface SessionAdapter {
  framework: SessionFramework;
  discover(options: SessionDiscoverOptions): Promise<SessionSource[]>;
}