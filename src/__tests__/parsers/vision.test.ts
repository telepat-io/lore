import { beforeEach, describe, expect, it, jest } from '@jest/globals';

const mockRun = jest.fn();
const mockReplicate = jest.fn();
const mockReadFile = jest.fn();

async function loadVisionModule() {
  jest.resetModules();

  jest.unstable_mockModule('replicate', () => ({
    default: mockReplicate,
  }));

  jest.unstable_mockModule('fs/promises', () => ({
    default: {
      readFile: mockReadFile,
    },
  }));

  return import('../../utils/parsers/vision.js');
}

describe('parseImage', () => {
  beforeEach(() => {
    jest.restoreAllMocks();
    mockRun.mockReset();
    mockReplicate.mockReset();
    mockReadFile.mockReset();

    process.env['REPLICATE_API_TOKEN'] = 'replicate-token';
    mockReadFile.mockResolvedValue(Buffer.from('image-bytes'));
    mockReplicate.mockImplementation(() => ({ run: mockRun }));
  });

  it('sends image to Replicate vision model', async () => {
    mockRun.mockResolvedValue('A diagram');
    const { parseImage } = await loadVisionModule();

    await parseImage('/tmp/image.png');

    expect(mockReplicate).toHaveBeenCalledWith({ auth: 'replicate-token' });
    expect(String(mockRun.mock.calls[0]?.[0] ?? '')).toContain('yorickvp/llava-13b');
  });

  it('returns structured markdown with description', async () => {
    mockRun.mockResolvedValue('A whiteboard sketch');
    const { parseImage } = await loadVisionModule();

    const result = await parseImage('/tmp/diagram.png');
    expect(result).toContain('# Image Analysis');
    expect(result).toContain('/tmp/diagram.png');
    expect(result).toContain('A whiteboard sketch');
  });

  it('handles OCR-like array output by joining text', async () => {
    mockRun.mockResolvedValue(['Line 1', ' and line 2']);
    const { parseImage } = await loadVisionModule();

    const result = await parseImage('/tmp/scan.jpg');
    expect(result).toContain('Line 1 and line 2');
  });
});
