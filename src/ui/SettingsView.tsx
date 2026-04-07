import React, { useState, useEffect } from 'react';
import { Box, Text } from 'ink';
import { readGlobalConfig, type GlobalConfig } from '../core/config.js';

export function SettingsView(): React.ReactElement {
  const [config, setConfig] = useState<GlobalConfig>({});

  useEffect(() => {
    readGlobalConfig().then(setConfig);
  }, []);

  return (
    <Box flexDirection="column" gap={1}>
      <Text bold>Settings</Text>
      <Box flexDirection="column">
        <Text>OpenRouter API Key: <Text color="yellow">{config.openrouterApiKey ? '***configured***' : 'not set'}</Text></Text>
        <Text>Replicate API Token: <Text color="yellow">{config.replicateApiToken ? '***configured***' : 'not set'}</Text></Text>
        <Text>Cloudflare Account: <Text color="yellow">{config.cloudflareAccountId ?? 'not set'}</Text></Text>
        <Text>Cloudflare Token: <Text color="yellow">{config.cloudflareToken ? '***configured***' : 'not set'}</Text></Text>
      </Box>
      <Text color="gray">Use `lore settings` in CLI mode to edit keys interactively.</Text>
    </Box>
  );
}
