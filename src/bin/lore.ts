#!/usr/bin/env node
import { Command } from 'commander/esm.mjs';
import { render } from 'ink';
import React from 'react';
import { initCommand } from '../commands/init.js';
import { ingestCommand } from '../commands/ingest.js';
import { compileCommand } from '../commands/compile.js';
import { indexCommand } from '../commands/index.js';
import { queryCommand } from '../commands/query.js';
import { searchCommand } from '../commands/search.js';
import { pathCommand } from '../commands/path.js';
import { explainCommand } from '../commands/explain.js';
import { lintCommand } from '../commands/lint.js';
import { watchCommand } from '../commands/watch.js';
import { angelaCommand } from '../commands/angela.js';
import { exportCommand } from '../commands/export.js';
import { mcpCommand } from '../commands/mcp.js';
import { statusCommand } from '../commands/status.js';
import {
  settingsCommand,
  settingsGetCommand,
  settingsListCommand,
  settingsSetCommand,
  settingsUnsetCommand,
} from '../commands/settings.js';
import { App } from '../ui/App.js';

const program = new Command();

program
  .name('lore')
  .description('Build and maintain persistent LLM knowledge bases from any content.')
  .version('0.1.0');

program
  .command('init')
  .description('Initialize a lore repository in the current directory')
  .option('--json', 'Output JSON')
  .action(initCommand);

program
  .command('ingest <path>')
  .description('Ingest a file or URL into the knowledge base')
  .option('--json', 'Output JSON')
  .action(ingestCommand);

program
  .command('compile')
  .description('Compile raw sources into wiki articles using LLM')
  .option('--force', 'Recompile all, ignoring manifest')
  .option('--json', 'Output JSON')
  .action(compileCommand);

program
  .command('index')
  .description('Rebuild the FTS5 search index and regenerate index.md')
  .option('--repair', 'Repair missing manifest entries from .lore/raw before indexing')
  .option('--json', 'Output JSON')
  .action(indexCommand);

program
  .command('query <question>')
  .description('Answer a question from the wiki via BFS/DFS + LLM')
  .option('--no-file-back', 'Do not file the answer back into derived/qa/')
  .option('--normalize-question', 'Apply conservative query text cleanup before retrieval')
  .option('--json', 'Output JSON')
  .action(queryCommand);

program
  .command('search <term>')
  .description('Full-text search the wiki (FTS5/BM25)')
  .option('--limit <n>', 'Max results', '10')
  .option('--json', 'Output JSON')
  .action(searchCommand);

program
  .command('path <from> <to>')
  .description('Find the shortest conceptual path between two wiki articles')
  .option('--json', 'Output JSON')
  .action(pathCommand);

program
  .command('explain <concept>')
  .description('Deep-dive on a concept with full context from related articles')
  .option('--json', 'Output JSON')
  .action(explainCommand);

program
  .command('lint')
  .description('Run wiki health checks: orphans, gaps, ambiguous claims, suggested questions')
  .option('--json', 'Output JSON')
  .action(lintCommand);

program
  .command('watch')
  .description('Watch raw/ for changes and recompile automatically')
  .action(watchCommand);

program
  .command('angela [subcommand]')
  .description('Git commit capture: install hook or run manually (subcommand: install | run)')
  .option('--json', 'Output JSON')
  .action(angelaCommand);

program
  .command('export <format>')
  .description('Export the wiki (formats: bundle, slides, pdf, docx, web, canvas, graphml)')
  .option('--out <dir>', 'Output directory (default: .lore/exports/)')
  .option('--json', 'Output JSON')
  .action(exportCommand);

program
  .command('mcp')
  .description('Start the MCP server on stdio for agent access')
  .action(mcpCommand);

program
  .command('status')
  .description('Show repository health dashboard')
  .option('--json', 'Output JSON')
  .action(statusCommand);

const settings = program
  .command('settings')
  .description('Configure API keys, model, and parameters');

settings
  .option('--scope <scope>', 'Scope for command: global|repo|all', 'all')
  .option('--json', 'Output JSON')
  .action(settingsCommand);

settings
  .command('list')
  .description('List settings values')
  .option('--scope <scope>', 'Scope for command: global|repo|all', 'all')
  .option('--json', 'Output JSON')
  .action(settingsListCommand);

settings
  .command('get [key]')
  .description('Get a setting by key, or all when key omitted')
  .option('--scope <scope>', 'Scope for command: global|repo|all', 'all')
  .option('--json', 'Output JSON')
  .action(settingsGetCommand);

settings
  .command('set <key> <value>')
  .description('Set a setting value')
  .option('--scope <scope>', 'Scope for command: global|repo|all', 'all')
  .action(settingsSetCommand);

settings
  .command('unset <key>')
  .description('Unset a global setting key')
  .option('--scope <scope>', 'Scope for command: global|repo|all', 'all')
  .action(settingsUnsetCommand);

// No subcommand + TTY → launch TUI
if (process.argv.length === 2 && process.stdout.isTTY) {
  render(React.createElement(App));
} else {
  program.parse();
}
