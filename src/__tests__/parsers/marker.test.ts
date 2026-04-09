import { beforeEach, describe, expect, it, jest } from '@jest/globals';

const mockRun = jest.fn<(...args: any[]) => any>();
const mockReplicate = jest.fn<(...args: any[]) => any>();
const mockReadFile = jest.fn<(...args: any[]) => any>();

async function loadMarkerModule() {
  jest.resetModules();

  jest.unstable_mockModule('replicate', () => ({
    default: mockReplicate,
  }));

  jest.unstable_mockModule('fs/promises', () => ({
    default: {
      readFile: mockReadFile,
    },
  }));

  return import('../../utils/parsers/marker.js');
}

describe('parseWithMarker', () => {
  beforeEach(() => {
    jest.restoreAllMocks();
    mockRun.mockReset();
    mockReplicate.mockReset();
    mockReadFile.mockReset();

    process.env['REPLICATE_API_TOKEN'] = 'replicate-token';
    mockReadFile.mockResolvedValue(Buffer.from('file-bytes'));
    mockReplicate.mockImplementation(() => ({ run: mockRun }));
  });

  it('sends file to Replicate cuuupid/marker model', async () => {
    mockRun.mockResolvedValue('# Parsed doc');
    const { parseWithMarker } = await loadMarkerModule();

    await parseWithMarker('/tmp/doc.pdf');

    expect(mockReplicate).toHaveBeenCalledWith({ auth: 'replicate-token' });
    expect(String(mockRun.mock.calls[0]?.[0] ?? '')).toContain('cuuupid/marker');
  });

  it('returns markdown output', async () => {
    mockRun.mockResolvedValue('# Parsed doc');
    const { parseWithMarker } = await loadMarkerModule();

    const result = await parseWithMarker('/tmp/doc.pdf');
    expect(result).toBe('# Parsed doc');
  });

  it('handles API errors by rejecting', async () => {
    mockRun.mockRejectedValue(new Error('replicate failed'));
    const { parseWithMarker } = await loadMarkerModule();

    await expect(parseWithMarker('/tmp/doc.pdf')).rejects.toThrow('replicate failed');
  });
});
