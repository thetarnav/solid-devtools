import * as crx    from '@crxjs/vite-plugin'
import * as fs     from 'node:fs'
import * as module from 'node:module'
import * as assert from 'node:assert'
import * as vite   from 'vite'
import      solid  from 'vite-plugin-solid'
import      pkg    from './package.json' with {type: 'json'}

import {
    ICONS_GRAY,
    ICONS_BLUE,
}  from './src/shared.ts'

const require = module.createRequire(import.meta.url)


const BROWSER = process.env['BROWSER'] ?? 'chrome'
assert.ok(BROWSER === 'chrome' || BROWSER === 'firefox')

const IS_CHROME = BROWSER === 'chrome'
const IS_DEV    = process.env['NODE_ENV'] === 'development'

const manifest_version = (() => {
    // Convert from Semver (example: 0.1.0-beta6)
    const [major, minor, patch, label = '0'] = pkg.version
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
    name: `${IS_DEV ? '[DEV] ' : ''}Solid Devtools`,
    description: 'Chrome Developer Tools extension for debugging SolidJS applications.',
    homepage_url: 'https://github.com/thetarnav/solid-devtools',
    version: manifest_version,
    version_name: IS_CHROME ? pkg.version : undefined,
    browser_specific_settings: IS_CHROME
        ? undefined
        : {gecko: {id: '{abfd162e-9948-403a-a75c-6e61184e1d47}'}},
    author: IS_CHROME ? {email: 'gthetarnav@gmail.com'} : 'Damian Tarnawski' as any,
    minimum_chrome_version: '94',
    devtools_page: 'src/devtools.html',
    content_scripts: [{
        matches: ['*://*/*'],
        js: ['src/content.ts'],
        run_at: 'document_start',
    }],
    background: IS_CHROME
        ? {
            service_worker: 'src/background.ts',
            type: 'module',
        }
        : {
            scripts: ['src/background.ts'],
            type: 'module',
        },
    permissions: [],
    action: {
        default_icon:  ICONS_GRAY,
        default_title: 'Solid Devtools',
        default_popup: 'src/popup.html',
    },
    icons: ICONS_BLUE,
}

const sdt_pkg = JSON.parse(
    fs.readFileSync(require.resolve('solid-devtools/package.json'), 'utf-8')
) as {version: string}

const sdt_version = JSON.stringify(sdt_pkg.version.match(/\d+.\d+.\d+/)![0])

const vite_config: vite.UserConfig = {
    server: {port: 3333},
    resolve: {
        conditions: ['browser']
    },
    plugins: [
        solid({dev: false, hot: false}),
        crx.crx({
            manifest: manifest,
            browser:  BROWSER,
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
        'import.meta.env.BROWSER': JSON.stringify(BROWSER),
    },
    build: {
        minify: false,
        emptyOutDir: !IS_DEV,
        outDir: 'dist/' + BROWSER,
        rollupOptions: {
            // adds panel as additional input because it's not a part of the manifest
            // and is loaded dynamically in devtools.ts
            input: {panel: 'src/panel.html'},
        },
        target: 'esnext',
    },
    esbuild: {
        dropLabels: [IS_DEV ? 'PROD' : 'DEV'],
    },
    optimizeDeps: {
        exclude: ['@solid-devtools/debugger'],
    },
}

export default vite_config
