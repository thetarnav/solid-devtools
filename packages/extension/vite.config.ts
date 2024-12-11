import * as crx    from '@crxjs/vite-plugin'
import * as fs     from 'node:fs'
import * as module from 'node:module'
import * as path   from 'node:path'
import * as assert from 'node:assert'
import * as vite   from 'vite'
import solid       from 'vite-plugin-solid'
import ext_pkg     from './package.json'
import {icons}     from './shared/icons.js'

const require = module.createRequire(import.meta.url)
const cwd = process.cwd()

const browser = process.env['BROWSER'] ?? 'chrome'
assert.ok(browser === 'chrome' || browser === 'firefox')

const is_chrome = browser === 'chrome'
const is_dev    = process.env['NODE_ENV'] === 'development'

const manifest_version = (() => {
    // Convert from Semver (example: 0.1.0-beta6)
    const [major, minor, patch, label = '0'] = ext_pkg.version
        // can only contain digits, dots, or dash
        .replace(/[^\d.-]+/g, '')
        // split into version parts
        .split(/[.-]/)

    return `${major}.${minor}.${patch}.${label}`
})()

type Manifest_Additional_Fields = {
    browser_specific_settings?: Record<string, Record<string, string>>
}

const manifest: crx.ManifestV3Export & Manifest_Additional_Fields = {
    manifest_version: 3,
    name: `${is_dev ? '[DEV] ' : ''}Solid Devtools`,
    description: 'Chrome Developer Tools extension for debugging SolidJS applications.',
    homepage_url: 'https://github.com/thetarnav/solid-devtools',
    version: manifest_version,
    version_name: is_chrome ? ext_pkg.version : undefined,
    browser_specific_settings: is_chrome
        ? undefined
        : {gecko: {id: '{abfd162e-9948-403a-a75c-6e61184e1d47}'}},
    author: {email: 'gthetarnav@gmail.com'},
    minimum_chrome_version: '94',
    devtools_page: 'devtools/devtools.html',
    /*
     TODO: instead of running a content script on document start for every url
     could potentially be replaced with `permissions: ['activeTab']`,
     removing the content_script field
     and running the content script programatically in bg script

     chrome.action.onClicked.addListener((tab) => {
         if (tab.id) chrome.scripting.executeScript({
             target: { tabId: tab.id },
             files: ['content/content.ts'],
         });
     });

    */
    content_scripts: [{
        matches: ['*://*/*'],
        js: ['content/content.ts'],
        run_at: 'document_start',
    }],
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
        default_icon:  icons.disabled,
        default_title: 'Solid Devtools',
        default_popup: 'popup/popup.html',
    },
    icons: icons.normal,
}

const sdt_pkg: {version: string} = JSON.parse(fs.readFileSync(require.resolve('solid-devtools/package.json'), 'utf-8'))

const sdt_version = JSON.stringify(sdt_pkg.version.match(/\d+.\d+.\d+/)![0])

const vite_config: vite.UserConfig = {
    server: {port: 3333},
    resolve: {
        alias: {
            'solid-js/web': path.resolve(cwd, 'node_modules/solid-js/web/dist/web.js'),
            'solid-js/store': path.resolve(cwd, 'node_modules/solid-js/store/dist/store.js'),
            'solid-js': path.resolve(cwd, 'node_modules/solid-js/dist/solid.js'),
        },
    },
    plugins: [
        solid({dev: false, hot: false}),
        crx.crx({
            manifest: manifest,
            browser:  browser,
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
        outDir: 'dist/' + browser,
        rollupOptions: {
            input: {panel: 'index.html'},
        },
        target: 'esnext',
    },
    optimizeDeps: {
        exclude: ['@solid-devtools/debugger'],
    },
}

export default vite_config
