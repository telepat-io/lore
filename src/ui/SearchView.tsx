import React, { useState, useCallback } from 'react';
import { Box, Text } from 'ink';
import { TextInput } from '@inkjs/ui';
import { search, type SearchResult } from '../core/search.js';

export function SearchView(): React.ReactElement {
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [searched, setSearched] = useState(false);

  const onSubmit = useCallback(async (value: string) => {
    if (!value.trim()) return;
    setSearching(true);
    try {
      const r = await search(process.cwd(), value);
      setResults(r);
    } catch {
      setResults([]);
    }
    setSearching(false);
    setSearched(true);
  }, []);

  return (
    <Box flexDirection="column" gap={1}>
      <Text bold>Search</Text>
      <Box>
        <Text color="gray">Query: </Text>
        <TextInput placeholder="Type a search term and press Enter..." onSubmit={onSubmit} />
      </Box>
      {searching && <Text color="yellow">Searching...</Text>}
      {results.length > 0 && (
        <Box flexDirection="column">
          <Text color="gray">{results.length} result(s)</Text>
          {results.map(r => (
            <Box key={r.slug} flexDirection="column" marginBottom={1}>
              <Text bold color="green">{r.title}</Text>
              <Text color="gray">{r.snippet}</Text>
            </Box>
          ))}
        </Box>
      )}
      {!searching && results.length === 0 && searched && (
        <Text color="gray">No results found.</Text>
      )}
    </Box>
  );
}
