/** @type {import('@docusaurus/types').Config} */
const config = {
  title: 'Lore',
  tagline: 'Build and maintain persistent LLM knowledge bases from any content.',
  favicon: 'img/favicon.ico',
  url: 'https://docs.telepat.io',
  baseUrl: '/lore/',
  organizationName: 'telepat-io',
  projectName: 'lore',
  onBrokenLinks: 'throw',
  onBrokenMarkdownLinks: 'warn',

  i18n: {
    defaultLocale: 'en',
    locales: ['en'],
  },

  presets: [
    [
      'classic',
      /** @type {import('@docusaurus/preset-classic').Options} */
      ({
        docs: {
          routeBasePath: '/',
          sidebarPath: './sidebars.mjs',
          editUrl: 'https://github.com/telepat-io/lore/tree/main/docs-site/',
        },
        blog: false,
        theme: {
          customCss: './src/css/custom.css',
        },
      }),
    ],
  ],

  themeConfig:
    /** @type {import('@docusaurus/preset-classic').ThemeConfig} */
    ({
      colorMode: {
        defaultMode: 'light',
        respectPrefersColorScheme: true,
      },
      navbar: {
        title: 'Lore',
        logo: {
          alt: 'Lore Logo',
          src: 'img/lore-avatar.webp',
        },
        items: [
          { type: 'docSidebar', sidebarId: 'docs', position: 'left', label: 'Docs' },
          { href: 'https://github.com/telepat-io/lore', label: 'GitHub', position: 'right' },
        ],
      },
      footer: {
        style: 'dark',
        links: [
          {
            title: 'Docs',
            items: [
              { label: 'Getting Started', to: '/getting-started/overview' },
              { label: 'CLI Reference', to: '/reference/cli-reference' },
            ],
          },
          {
            title: 'More',
            items: [
              { label: 'GitHub', href: 'https://github.com/telepat-io/lore' },
            ],
          },
        ],
        copyright: `Copyright ${new Date().getFullYear()} Telepat. Built with Docusaurus.`,
      },
    }),
};

export default config;
