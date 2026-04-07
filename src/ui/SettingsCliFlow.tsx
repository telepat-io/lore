import React, { useMemo, useState } from 'react';
import { Box, Text, useApp, useInput } from 'ink';
import type { GlobalConfig, RepoConfig } from '../core/config.js';

type MenuAction =
  | 'openrouterApiKey'
  | 'replicateApiToken'
  | 'cloudflareAccountId'
  | 'cloudflareToken'
  | 'model'
  | 'temperature'
  | 'maxTokens'
  | 'webExporter'
  | 'save'
  | 'cancel';

interface MenuItem {
  label: string;
  action: MenuAction;
}

interface EditState {
  action: Exclude<MenuAction, 'save' | 'cancel'>;
  label: string;
  value: string;
  isSecret: boolean;
}

export interface SettingsCliResult {
  global: Partial<Record<'openrouterApiKey' | 'replicateApiToken' | 'cloudflareAccountId' | 'cloudflareToken', string | null>>;
  repo: Partial<Record<'model' | 'temperature' | 'maxTokens' | 'webExporter', string | number | undefined>>;
}

interface SettingsCliFlowProps {
  initialGlobal: GlobalConfig;
  initialRepo: RepoConfig | null;
  onDone: (result: SettingsCliResult | null) => void;
}

export function SettingsCliFlow({ initialGlobal, initialRepo, onDone }: SettingsCliFlowProps): React.JSX.Element {
  const { exit } = useApp();
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [editing, setEditing] = useState<EditState | null>(null);
  const [draft, setDraft] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [globalEdits, setGlobalEdits] = useState<SettingsCliResult['global']>({});
  const [repoEdits, setRepoEdits] = useState<SettingsCliResult['repo']>({});

  const effectiveGlobal = useMemo(() => {
    const resolve = (key: keyof GlobalConfig): string | undefined => {
      if (Object.prototype.hasOwnProperty.call(globalEdits, key)) {
        const edited = globalEdits[key as keyof typeof globalEdits];
        return edited === null || edited === undefined ? undefined : String(edited);
      }
      return initialGlobal[key];
    };

    return {
      openrouterApiKey: resolve('openrouterApiKey'),
      replicateApiToken: resolve('replicateApiToken'),
      cloudflareAccountId: resolve('cloudflareAccountId'),
      cloudflareToken: resolve('cloudflareToken'),
    } satisfies GlobalConfig;
  }, [globalEdits, initialGlobal]);

  const effectiveRepo = useMemo(() => {
    if (!initialRepo) return null;

    const resolve = <K extends keyof RepoConfig>(key: K): RepoConfig[K] => {
      if (Object.prototype.hasOwnProperty.call(repoEdits, key)) {
        return repoEdits[key as keyof typeof repoEdits] as RepoConfig[K];
      }
      return initialRepo[key];
    };

    return {
      model: resolve('model'),
      temperature: resolve('temperature'),
      maxTokens: resolve('maxTokens'),
      webExporter: resolve('webExporter'),
    } satisfies RepoConfig;
  }, [initialRepo, repoEdits]);

  const items = useMemo<MenuItem[]>(() => {
    const base: MenuItem[] = [
      {
        action: 'openrouterApiKey',
        label: `OpenRouter API key: ${effectiveGlobal.openrouterApiKey ? 'configured' : 'not set'}`,
      },
      {
        action: 'replicateApiToken',
        label: `Replicate API token: ${effectiveGlobal.replicateApiToken ? 'configured' : 'not set'}`,
      },
      {
        action: 'cloudflareAccountId',
        label: `Cloudflare account ID: ${effectiveGlobal.cloudflareAccountId ?? 'not set'}`,
      },
      {
        action: 'cloudflareToken',
        label: `Cloudflare token: ${effectiveGlobal.cloudflareToken ? 'configured' : 'not set'}`,
      },
    ];

    if (effectiveRepo) {
      base.push(
        { action: 'model', label: `Model: ${effectiveRepo.model}` },
        { action: 'temperature', label: `Temperature: ${effectiveRepo.temperature}` },
        { action: 'maxTokens', label: `Max tokens: ${effectiveRepo.maxTokens ?? 'not set'}` },
        { action: 'webExporter', label: `Web exporter: ${effectiveRepo.webExporter ?? 'not set'}` },
      );
    }

    base.push({ action: 'save', label: 'Save and exit' }, { action: 'cancel', label: 'Cancel' });
    return base;
  }, [effectiveGlobal, effectiveRepo]);

  useInput((input, key) => {
    if (key.ctrl && input === 'c') {
      onDone(null);
      exit();
      return;
    }

    if (editing) {
      if (key.return) {
        applyEdit(draft);
        return;
      }

      if (key.backspace || key.delete) {
        setDraft((prev) => prev.slice(0, -1));
        return;
      }

      if (key.escape) {
        setEditing(null);
        setDraft('');
        setError(null);
        return;
      }

      if (!key.ctrl && !key.meta && input.length > 0) {
        setDraft((prev) => prev + input);
      }
      return;
    }

    if (key.upArrow) {
      setSelectedIndex((prev) => (prev - 1 + items.length) % items.length);
      return;
    }

    if (key.downArrow) {
      setSelectedIndex((prev) => (prev + 1) % items.length);
      return;
    }

    if (key.return) {
      const selected = items[selectedIndex];
      if (!selected) return;
      handleAction(selected.action);
    }
  });

  function handleAction(action: MenuAction): void {
    if (action === 'save') {
      onDone({ global: globalEdits, repo: repoEdits });
      exit();
      return;
    }

    if (action === 'cancel') {
      onDone(null);
      exit();
      return;
    }

    setError(null);
    if (action === 'openrouterApiKey' || action === 'replicateApiToken' || action === 'cloudflareToken') {
      setEditing({ action, label: action, value: '', isSecret: true });
      setDraft('');
      return;
    }

    if (action === 'cloudflareAccountId') {
      const current = effectiveGlobal.cloudflareAccountId ?? '';
      setEditing({ action, label: action, value: current, isSecret: false });
      setDraft(current);
      return;
    }

    if (action === 'model' && effectiveRepo) {
      setEditing({ action, label: action, value: effectiveRepo.model, isSecret: false });
      setDraft(effectiveRepo.model);
      return;
    }

    if (action === 'temperature' && effectiveRepo) {
      const current = String(effectiveRepo.temperature);
      setEditing({ action, label: action, value: current, isSecret: false });
      setDraft(current);
      return;
    }

    if (action === 'maxTokens' && effectiveRepo) {
      const current = effectiveRepo.maxTokens === undefined ? '' : String(effectiveRepo.maxTokens);
      setEditing({ action, label: action, value: current, isSecret: false });
      setDraft(current);
      return;
    }

    if (action === 'webExporter' && effectiveRepo) {
      const current = effectiveRepo.webExporter ?? '';
      setEditing({ action, label: action, value: current, isSecret: false });
      setDraft(current);
    }
  }

  function applyEdit(submitted: string): void {
    if (!editing) return;

    const value = submitted.trim();
    const action = editing.action;

    if (action === 'openrouterApiKey' || action === 'replicateApiToken' || action === 'cloudflareToken') {
      if (value === '') {
        setEditing(null);
        setDraft('');
        return;
      }

      setGlobalEdits((prev) => ({
        ...prev,
        [action]: value === '-' ? null : value,
      }));
      setEditing(null);
      setDraft('');
      return;
    }

    if (action === 'cloudflareAccountId') {
      if (value === '') {
        setEditing(null);
        setDraft('');
        return;
      }

      setGlobalEdits((prev) => ({
        ...prev,
        cloudflareAccountId: value === '-' ? null : value,
      }));
      setEditing(null);
      setDraft('');
      return;
    }

    if (action === 'model') {
      if (!value) {
        setError('Model cannot be empty.');
        return;
      }

      setRepoEdits((prev) => ({ ...prev, model: value }));
      setEditing(null);
      setDraft('');
      return;
    }

    if (action === 'temperature') {
      const parsed = Number(value);
      if (!Number.isFinite(parsed) || parsed < 0 || parsed > 2) {
        setError('Temperature must be a number in the range 0..2.');
        return;
      }

      setRepoEdits((prev) => ({ ...prev, temperature: parsed }));
      setEditing(null);
      setDraft('');
      return;
    }

    if (action === 'maxTokens') {
      if (value === '') {
        setEditing(null);
        setDraft('');
        return;
      }

      if (value === '-') {
        setRepoEdits((prev) => ({ ...prev, maxTokens: undefined }));
        setEditing(null);
        setDraft('');
        return;
      }

      const parsed = Number.parseInt(value, 10);
      if (!Number.isFinite(parsed) || parsed <= 0) {
        setError('Max tokens must be a positive integer.');
        return;
      }

      setRepoEdits((prev) => ({ ...prev, maxTokens: parsed }));
      setEditing(null);
      setDraft('');
      return;
    }

    if (action === 'webExporter') {
      if (value === '') {
        setEditing(null);
        setDraft('');
        return;
      }

      if (value === '-') {
        setRepoEdits((prev) => ({ ...prev, webExporter: undefined }));
        setEditing(null);
        setDraft('');
        return;
      }

      if (value !== 'starlight' && value !== 'vitepress') {
        setError('Web exporter must be starlight, vitepress, or - to unset.');
        return;
      }

      setRepoEdits((prev) => ({ ...prev, webExporter: value }));
      setEditing(null);
      setDraft('');
    }
  }

  if (editing) {
    return (
      <Box flexDirection="column">
        <Text bold color="cyanBright">Edit {editing.label}</Text>
        <Text color="gray">Enter saves. Empty keeps current. Use - to unset when supported. Esc cancels.</Text>
        {error ? <Text color="red">{error}</Text> : null}
        <Box marginTop={1}>
          <Text>{'> '}{editing.isSecret ? '•'.repeat(draft.length) : draft}</Text>
        </Box>
        {editing.isSecret ? <Text color="gray">{`Secret characters: ${draft.length}`}</Text> : null}
      </Box>
    );
  }

  return (
    <Box flexDirection="column">
      <Text bold color="cyanBright">Lore Settings</Text>
      <Text color="gray">Use up/down arrows and Enter. Ctrl+C cancels.</Text>
      {error ? <Text color="red">{error}</Text> : null}
      <Box marginTop={1} flexDirection="column">
        {items.map((item, index) => (
          <Text key={item.action} color={selectedIndex === index ? 'green' : 'white'}>
            {selectedIndex === index ? '› ' : '  '}
            {item.label}
          </Text>
        ))}
      </Box>
    </Box>
  );
}