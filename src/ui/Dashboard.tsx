import React, { useState, useEffect } from 'react';
import { Box, Text } from 'ink';
import { getStatus, type RepoStatus } from '../core/repo.js';

export function Dashboard(): React.ReactElement {
  const [status, setStatus] = useState<RepoStatus | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getStatus(process.cwd())
      .then(setStatus)
      .catch((err: Error) => setError(err.message));
  }, []);

  if (error) {
    return (
      <Box flexDirection="column">
        <Text color="red">Error: {error}</Text>
        <Text color="gray">Run `lore init` to create a repository.</Text>
      </Box>
    );
  }

  if (!status) {
    return <Text color="gray">Loading...</Text>;
  }

  return (
    <Box flexDirection="column" gap={1}>
      <Text bold>Repository Dashboard</Text>
      <Box flexDirection="column">
        <Text>Articles: <Text color="green" bold>{status.articleCount}</Text></Text>
        <Text>Raw sources: <Text color="yellow" bold>{status.rawCount}</Text></Text>
        <Text>Last compile: <Text color="cyan">{status.lastCompile ?? 'never'}</Text></Text>
      </Box>
      <Box flexDirection="column" marginTop={1}>
        <Text bold color="gray">Quick actions:</Text>
        <Text color="gray">  lore ingest &lt;file|url&gt;  - Add content</Text>
        <Text color="gray">  lore compile             - Compile wiki</Text>
        <Text color="gray">  lore search &lt;term&gt;       - Search</Text>
      </Box>
    </Box>
  );
}
