import { ingest } from './ingest.js';
import {
  getSessionAdapter,
  isSessionFramework,
  listSessionFrameworks,
} from './sessionAdapters/index.js';
import type { RunLogger } from './logger.js';
import type { SessionFramework } from './sessionAdapters/types.js';

export interface IngestSessionsOptions {
  frameworks?: SessionFramework[];
  roots?: string[];
  maxFiles: number;
  dryRun?: boolean;
  logger?: RunLogger;
}

export interface FrameworkIngestStats {
  framework: SessionFramework;
  discovered: number;
  ingested: number;
  duplicates: number;
  failed: number;
}

export interface IngestSessionsResult {
  frameworks: FrameworkIngestStats[];
  discovered: number;
  ingested: number;
  duplicates: number;
  failed: number;
  dryRun: boolean;
}

export function resolveFrameworkInput(value: string | undefined): SessionFramework[] {
  if (!value || value === 'all') {
    return listSessionFrameworks();
  }

  if (!isSessionFramework(value)) {
    const valid = ['all', ...listSessionFrameworks()].join(', ');
    throw new Error(`Unknown framework: ${value}. Use one of: ${valid}`);
  }

  return [value];
}

export async function ingestSessions(cwd: string, options: IngestSessionsOptions): Promise<IngestSessionsResult> {
  const frameworks = options.frameworks && options.frameworks.length > 0
    ? options.frameworks
    : listSessionFrameworks();
  const dryRun = Boolean(options.dryRun);

  const results: FrameworkIngestStats[] = [];
  let discovered = 0;
  let ingested = 0;
  let duplicates = 0;
  let failed = 0;

  for (const framework of frameworks) {
    const adapter = getSessionAdapter(framework);
    options.logger?.stepStart('ingest-sessions.discover', { framework });
    const sources = await adapter.discover({
      roots: options.roots,
      maxFiles: options.maxFiles,
      logger: options.logger,
    });
    options.logger?.stepEnd('ingest-sessions.discover', { framework, discovered: sources.length });

    const stats: FrameworkIngestStats = {
      framework,
      discovered: sources.length,
      ingested: 0,
      duplicates: 0,
      failed: 0,
    };

    discovered += sources.length;
    if (dryRun) {
      results.push(stats);
      continue;
    }

    for (const source of sources) {
      try {
        const ingestion = await ingest(cwd, source.filePath, {
          logger: options.logger,
          sessionMeta: source.sessionMeta,
        });
        if (ingestion.duplicate) {
          duplicates += 1;
          stats.duplicates += 1;
        } else {
          ingested += 1;
          stats.ingested += 1;
        }
      } catch (error) {
        failed += 1;
        stats.failed += 1;
        options.logger?.error('ingest-sessions.ingest', error, {
          framework,
          filePath: source.filePath,
        });
      }
    }

    results.push(stats);
  }

  return {
    frameworks: results,
    discovered,
    ingested,
    duplicates,
    failed,
    dryRun,
  };
}