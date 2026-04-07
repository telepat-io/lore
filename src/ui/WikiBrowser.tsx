import React, { useState, useEffect } from 'react';
import { Box, Text, useInput } from 'ink';
import fs from 'fs/promises';
import path from 'path';
import { findRepo } from '../core/repo.js';

export function WikiBrowser(): React.ReactElement {
  const [articles, setArticles] = useState<string[]>([]);
  const [selected, setSelected] = useState(0);
  const [preview, setPreview] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const root = await findRepo(process.cwd());
      if (!root) { setError('Not in a lore repository'); return; }
      const dir = path.join(root, '.lore', 'wiki', 'articles');
      try {
        const files = (await fs.readdir(dir)).filter(f => f.endsWith('.md')).sort();
        setArticles(files);
      } catch {
        setArticles([]);
      }
    })();
  }, []);

  useEffect(() => {
    if (articles.length === 0) return;
    (async () => {
      const root = await findRepo(process.cwd());
      if (!root) return;
      const file = articles[selected];
      if (!file) return;
      const content = await fs.readFile(
        path.join(root, '.lore', 'wiki', 'articles', file), 'utf-8'
      );
      setPreview(content.slice(0, 1000));
    })();
  }, [selected, articles]);

  useInput((_input, key) => {
    if (key.upArrow && selected > 0) setSelected(s => s - 1);
    if (key.downArrow && selected < articles.length - 1) setSelected(s => s + 1);
  });

  if (error) return <Text color="red">{error}</Text>;
  if (articles.length === 0) return <Text color="gray">No articles. Run `lore compile` first.</Text>;

  return (
    <Box>
      <Box flexDirection="column" width="30%">
        <Text bold>Articles ({articles.length})</Text>
        {articles.map((file, i) => (
          <Text key={file} color={i === selected ? 'green' : 'white'} bold={i === selected}>
            {i === selected ? '>' : ' '} {file.replace('.md', '')}
          </Text>
        ))}
      </Box>
      <Box flexDirection="column" width="70%" paddingLeft={2}>
        <Text bold>{articles[selected]?.replace('.md', '')}</Text>
        <Text>{preview}</Text>
      </Box>
    </Box>
  );
}
