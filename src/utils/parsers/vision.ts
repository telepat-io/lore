import Replicate from 'replicate';
import fs from 'fs/promises';

/** Parse images via Replicate vision model for OCR/captioning */
export async function parseImage(filePath: string): Promise<string> {
  const apiToken = process.env['REPLICATE_API_TOKEN'];
  if (!apiToken) {
    throw new Error(
      'Replicate API token required for image parsing. Set REPLICATE_API_TOKEN or run `lore settings`.'
    );
  }

  const replicate = new Replicate({ auth: apiToken });
  const fileData = await fs.readFile(filePath);
  const base64 = fileData.toString('base64');
  const ext = filePath.split('.').pop()?.toLowerCase() ?? 'png';
  const mimeMap: Record<string, string> = {
    png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg',
    webp: 'image/webp', gif: 'image/gif', bmp: 'image/bmp',
  };
  const mimeType = mimeMap[ext] ?? 'image/png';
  const dataUri = `data:${mimeType};base64,${base64}`;

  const output = await replicate.run('yorickvp/llava-13b:80537f9eead1a5bfa72d5ac6ea6414379be41d4d4f6679fd776e9535d1eb58bb', {
    input: {
      image: dataUri,
      prompt: 'Describe this image in detail. If there is any text visible, transcribe it accurately.',
    },
  });

  const result = output as unknown;
  const description = Array.isArray(result) ? (result as string[]).join('') : String(result);
  return `# Image Analysis\n\nSource: ${filePath}\n\n${description}`;
}
