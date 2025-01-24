import * as path     from 'node:path'
import * as url      from 'node:url'
import * as crx      from '@crxjs/vite-plugin'
import * as vite     from 'vite'
import      solid    from 'vite-plugin-solid'
import      pkg      from './package.json' with {type: 'json'}
import      main_pkg from 'solid-devtools/package.json' with {type: 'json'}

import {
    ICONS_BLUE,
    ICONS_GRAY,
} from './src/shared.ts'


const filename = url.fileURLToPath(import.meta.url)
const dirname  = path.dirname(filename)

const dist_dirname = path.join(dirname, `dist`)

const args = process.argv.slice(2)

type Browser = 'chrome' | 'firefox'

/*
Parse args
*/
let is_dev = false
let browsers: Browser[] = []

for (let arg of args) {
    switch (arg) {
    case '--watch':
        is_dev = true
        break
    case '--chrome':
    case 'chrome':
    case '--browser=chrome':
        if (!browsers.includes('chrome')) {
            browsers.push('chrome')
        }
        break
    case '--firefox':
    case 'firefox':
    case '--browser=firefox':
        if (!browsers.includes('firefox')) {
            browsers.push('firefox')
        }
        break
    default:
        throw Error(`Unknown arg: "${arg}"`)
    }
}

if (is_dev) {
    if (browsers.length === 0) {
        browsers.push('chrome')
    } else if (browsers.length > 1) {
        throw Error('Watch mode can only be used with one browser')
    }
} else {
    if (browsers.length === 0) {
        browsers.push('chrome', 'firefox')
    }
}

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

for (let browser of browsers) {

    let is_chrome = browser === 'chrome'

    const manifest: crx.ManifestV3Export & Manifest_Additional_Fields = {
        manifest_version: 3,
        name: `${is_dev ? '[DEV] ' : ''}Solid Devtools`,
        description: 'Chrome Developer Tools extension for debugging SolidJS applications.',
        homepage_url: 'https://github.com/thetarnav/solid-devtools',
        version: manifest_version,
        version_name: is_chrome ? pkg.version : undefined,
        browser_specific_settings: is_chrome
            ? undefined
            : {gecko: {id: '{abfd162e-9948-403a-a75c-6e61184e1d47}'}},
        author: is_chrome ? {email: 'gthetarnav@gmail.com'} : 'Damian Tarnawski' as any,
        minimum_chrome_version: '94',
        devtools_page: 'src/devtools.html',
        content_scripts: [{
            matches: ['*://*/*'],
            js: ['src/content.ts'],
            run_at: 'document_start',
        }],
        background: is_chrome
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

    const main_version = JSON.stringify(main_pkg.version.match(/\d+.\d+.\d+/)![0])

    const vite_config: vite.InlineConfig = {
        root: dirname,
        configFile: false,
        server: {
            port: 3333,
        },
        resolve: {
            conditions: ['browser'],
        },
        plugins: [
            {
                name: 'replace-version',
                enforce: 'pre',
                transform(code, id) {
                    if (id.includes('solid-devtools')) {
                        code = code.replace(/import\.meta\.env\.EXPECTED_CLIENT/g, main_version)
                    }
                    return code
                },
            },
            solid({dev: false, hot: false}),
            crx.crx({
                manifest: manifest,
                browser:  browser,
            }),
        ],
        define: {
            'import.meta.env.BROWSER': JSON.stringify(browser),
        },
        build: {
            modulePreload: false,
            minify:        false,
            target:        'esnext',
            emptyOutDir:   !is_dev,
            outDir:        path.join(dist_dirname, browser),
            rollupOptions: {
                input: {panel: 'src/panel.html'},
            },
        },
        esbuild: {
            dropLabels: [is_dev ? 'PROD' : 'DEV'],
        },
        optimizeDeps: {
            exclude: ['@solid-devtools/debugger'],
        },
    }

    if (is_dev) {
        let server = await vite.createServer(vite_config)

        await server.listen()

        server.printUrls()
    } else {
        await vite.build(vite_config)
    }
}
