import Replicate from 'replicate';
import fs from 'fs/promises';

/** Parse PDF, DOCX, PPTX, XLSX, EPUB via Replicate cuuupid/marker API */
export async function parseWithMarker(filePath: string): Promise<string> {
  const apiToken = process.env['REPLICATE_API_TOKEN'];
  if (!apiToken) {
    throw new Error(
      'Replicate API token required for document parsing. Set REPLICATE_API_TOKEN or run `lore settings`.'
    );
  }

  const replicate = new Replicate({ auth: apiToken });
  const fileData = await fs.readFile(filePath);
  const base64 = fileData.toString('base64');
  const mimeType = getMimeType(filePath);
  const dataUri = `data:${mimeType};base64,${base64}`;

  const output = await replicate.run('cuuupid/marker:4a585858ee1b04dcdd07649e1a76debc0e8e69b8f10783e22e3c087e98e3e510', {
    input: { document: dataUri },
  });

  const result = output as unknown;
  return typeof result === 'string' ? result : JSON.stringify(result);
}

function getMimeType(filePath: string): string {
  const ext = filePath.split('.').pop()?.toLowerCase();
  const mimeMap: Record<string, string> = {
    pdf: 'application/pdf',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    epub: 'application/epub+zip',
  };
  return mimeMap[ext ?? ''] ?? 'application/octet-stream';
}
