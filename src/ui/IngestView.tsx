import React, { useState, useCallback } from 'react';
import { Box, Text } from 'ink';
import { TextInput, Spinner } from '@inkjs/ui';
import { ingest, type IngestResult } from '../core/ingest.js';

export function IngestView(): React.ReactElement {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<IngestResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = useCallback(async (value: string) => {
    if (!value.trim()) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const r = await ingest(process.cwd(), value);
      setResult(r);
    } catch (err) {
      setError((err as Error).message);
    }
    setLoading(false);
  }, []);

  return (
    <Box flexDirection="column" gap={1}>
      <Text bold>Ingest</Text>
      <Box>
        <Text color="gray">Path or URL: </Text>
        <TextInput placeholder="./file.md or https://..." onSubmit={onSubmit} />
      </Box>
      {loading && <Spinner label="Ingesting..." />}
      {result && (
        <Box flexDirection="column">
          <Text color="green">Ingested successfully!</Text>
          <Text>SHA256: {result.sha256.slice(0, 12)}...</Text>
          <Text>Format: {result.format}</Text>
          <Text>Title: {result.title}</Text>
        </Box>
      )}
      {error && <Text color="red">Error: {error}</Text>}
    </Box>
  );
}
