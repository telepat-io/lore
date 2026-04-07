/** @type {import('@docusaurus/plugin-content-docs').SidebarsConfig} */
const sidebars = {
  docs: [
    'index',
    {
      type: 'category',
      label: 'Getting Started',
      items: [
        'getting-started/overview',
        'getting-started/installation',
        'getting-started/quickstart',
      ],
    },
    {
      type: 'category',
      label: 'Guides',
      items: [
        'guides/configuration',
        'guides/credentials-and-secrets',
        'guides/ingesting-content',
        'guides/compiling-your-wiki',
        'guides/searching-and-querying',
        'guides/exporting',
        'guides/linting-and-health',
        'guides/lore-angela',
        'guides/mcp-server',
      ],
    },
    {
      type: 'category',
      label: 'Reference',
      items: [
        'reference/cli-reference',
        'reference/supported-formats',
        'reference/environment-variables',
        'reference/llm-models',
      ],
    },
    {
      type: 'category',
      label: 'Technical',
      items: [
        'technical/architecture',
        'technical/llm-pipeline',
        'technical/ingest-pipeline',
      ],
    },
    {
      type: 'category',
      label: 'Contributing',
      items: [
        'contributing/development',
        'contributing/releasing-and-docs-deploy',
      ],
    },
  ],
};

export default sidebars;
