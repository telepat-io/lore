import { createHash } from 'crypto';
import fs from 'fs/promises';

/** Compute SHA-256 hash of a file's contents */
export async function hashFile(filePath: string): Promise<string> {
  const data = await fs.readFile(filePath);
  return createHash('sha256').update(data).digest('hex');
}

/** Compute SHA-256 hash of a string/buffer */
export function hashContent(content: string | Buffer): string {
  return createHash('sha256').update(content).digest('hex');
}
