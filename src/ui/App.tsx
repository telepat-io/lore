import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import { Dashboard } from './Dashboard.js';
import { WikiBrowser } from './WikiBrowser.js';
import { SearchView } from './SearchView.js';
import { IngestView } from './IngestView.js';
import { SettingsView } from './SettingsView.js';

type Tab = 'dashboard' | 'wiki' | 'search' | 'ingest' | 'settings';

const TABS: { key: Tab; label: string; shortcut: string }[] = [
  { key: 'dashboard', label: 'Dashboard', shortcut: '1' },
  { key: 'wiki', label: 'Wiki', shortcut: '2' },
  { key: 'search', label: 'Search', shortcut: '3' },
  { key: 'ingest', label: 'Ingest', shortcut: '4' },
  { key: 'settings', label: 'Settings', shortcut: '5' },
];

export function App(): React.ReactElement {
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');

  useInput((input, key) => {
    if (key.tab || key.rightArrow) {
      const idx = TABS.findIndex(t => t.key === activeTab);
      setActiveTab(TABS[(idx + 1) % TABS.length]!.key);
    }
    if (key.leftArrow) {
      const idx = TABS.findIndex(t => t.key === activeTab);
      setActiveTab(TABS[(idx - 1 + TABS.length) % TABS.length]!.key);
    }
    // Number keys for direct tab access
    const tab = TABS.find(t => t.shortcut === input);
    if (tab) setActiveTab(tab.key);
  });

  return (
    <Box flexDirection="column" padding={1}>
      <Box gap={2} marginBottom={1}>
        <Text bold color="cyan">lore</Text>
        {TABS.map(tab => (
          <Text key={tab.key} color={activeTab === tab.key ? 'green' : 'gray'} bold={activeTab === tab.key}>
            [{tab.shortcut}] {tab.label}
          </Text>
        ))}
      </Box>
      <Box flexDirection="column">
        {activeTab === 'dashboard' && <Dashboard />}
        {activeTab === 'wiki' && <WikiBrowser />}
        {activeTab === 'search' && <SearchView />}
        {activeTab === 'ingest' && <IngestView />}
        {activeTab === 'settings' && <SettingsView />}
      </Box>
    </Box>
  );
}
