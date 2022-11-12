import { defineManifest } from '@crxjs/vite-plugin'
import { version } from './package.json'
import icons from './src/icons'

// Convert from Semver (example: 0.1.0-beta6)
const [major, minor, patch, label = '0'] = version
  // can only contain digits, dots, or dash
  .replace(/[^\d.-]+/g, '')
  // split into version parts
  .split(/[.-]/)

export default defineManifest(env => ({
  manifest_version: 3,
  name: `${env.mode === 'production' ? '' : '[DEV] '}Solid Devtools`,
  description: 'Chrome Developer Tools extension for debugging SolidJS applications.',
  homepage_url: 'https://github.com/thetarnav/solid-devtools',
  // up to four numbers separated by dots
  version: `${major}.${minor}.${patch}.${label}`,
  // semver is OK in "version_name"
  version_name: version,
  author: 'Damian Tarnawski',
  minimum_chrome_version: '94',
  devtools_page: 'devtools/devtools.html',
  content_scripts: [
    {
      matches: ['*://*/*'],
      js: ['content/content.ts'],
      run_at: 'document_start',
    },
  ],
  background: {
    service_worker: 'background/background.ts',
    type: 'module',
  },
  permissions: [],
  action: {
    default_icon: icons.disabled,
    default_title: 'Solid Devtools',
    default_popup: 'popup/popup.html',
  },
  icons: icons.normal,
}))
