import * as crx from '@crxjs/vite-plugin'
import fs from 'node:fs'
import module from 'node:module'
import path from 'node:path'
import * as vite from 'vite'
import solidPlugin from 'vite-plugin-solid'
import ext_pkg from './package.json'
import { icons } from './shared/icons.js'

const require = module.createRequire(import.meta.url)
const cwd = process.cwd()

const browser = process.env['BROWSER'] ?? 'chrome'
if (browser !== 'chrome' && browser !== 'firefox') {
    throw new Error('browser arg must be "chrome" or "firefox", was ' + browser)
}
const is_chrome = browser === 'chrome'

const manifest_version = (() => {
    // Convert from Semver (example: 0.1.0-beta6)
    const [major, minor, patch, label = '0'] = ext_pkg.version
        // can only contain digits, dots, or dash
        .replace(/[^\d.-]+/g, '')
        // split into version parts
        .split(/[.-]/)

    return `${major}.${minor}.${patch}.${label}`
})()

const manifest = crx.defineManifest(env => ({
    manifest_version: 3,
    name: `${env.mode === 'development' ? '[DEV] ' : ''}Solid Devtools`,
    description: 'Chrome Developer Tools extension for debugging SolidJS applications.',
    homepage_url: 'https://github.com/thetarnav/solid-devtools',
    version: manifest_version,
    version_name: is_chrome ? ext_pkg.version : undefined,
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
    background: is_chrome
        ? {
              service_worker: 'background/background.ts',
              type: 'module',
          }
        : {
              scripts: ['background/background.ts'],
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

export default vite.defineConfig(config => {
    const is_dev = config.mode === 'development'

    const sdt_pkg = JSON.parse(
        fs.readFileSync(require.resolve('solid-devtools/package.json'), 'utf-8'),
    ) as { version: string }

    const sdt_version = JSON.stringify(sdt_pkg.version.match(/\d+.\d+.\d+/)![0])

    return {
        server: { port: 3333 },
        resolve: {
            alias: {
                'solid-js/web': path.resolve(cwd, 'node_modules/solid-js/web/dist/web.js'),
                'solid-js/store': path.resolve(cwd, 'node_modules/solid-js/store/dist/store.js'),
                'solid-js': path.resolve(cwd, 'node_modules/solid-js/dist/solid.js'),
            },
        },
        plugins: [
            solidPlugin({ dev: false, hot: false }),
            crx.crx({
                manifest: manifest,
                browser: browser,
            }),
            {
                name: 'replace-version',
                enforce: 'pre',
                transform(code, id) {
                    if (id.includes('solid-devtools')) {
                        code = code.replace(/import\.meta\.env\.EXPECTED_CLIENT/g, sdt_version)
                    }
                    return code
                },
            },
        ],
        define: {
            'import.meta.env.BROWSER': JSON.stringify(browser),
        },
        build: {
            minify: false,
            emptyOutDir: !is_dev,
            outDir: 'dist',
            rollupOptions: {
                input: { panel: 'index.html' },
            },
            target: 'esnext',
        },
    }
})
