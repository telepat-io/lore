import type { OptionValues } from 'commander';
import { exportWiki, type ExportFormat } from '../core/export.js';

const VALID_FORMATS: ExportFormat[] = ['bundle', 'slides', 'pdf', 'docx', 'web', 'canvas', 'graphml'];

export async function exportCommand(format: string, opts: OptionValues): Promise<void> {
  // TODO: Generate output artifact in requested format
  if (!VALID_FORMATS.includes(format as ExportFormat)) {
    process.stderr.write(`Unknown format "${format}". Valid: ${VALID_FORMATS.join(', ')}\n`);
    process.exit(1);
  }
  const result = await exportWiki(process.cwd(), format as ExportFormat, { outDir: opts['out'] });
  if (opts['json']) {
    process.stdout.write(JSON.stringify(result) + '\n');
  } else {
    process.stderr.write(`Exported: ${result.outputPath}\n`);
  }
}
