import child_process from 'node:child_process'
import fs from 'node:fs'
import * as vite from 'vite'

const cwd = process.cwd()
const args = process.argv.slice(2)

type Browser = 'chrome' | 'firefox'

/*
Parse args
*/
const browsers: Browser[] = []
for (const arg of args) {
    if (!arg.startsWith('--browser=')) continue

    const browser = arg.slice('--browser='.length)
    if (browser !== 'chrome' && browser !== 'firefox') {
        throw new Error('browser arg must be "chrome" or "firefox", was ' + browser)
    }
    browsers.push(browser)
}
if (browsers.length === 0) {
    throw new Error('No browsers specified')
}

/*
Build and zip
*/
const dist = `${cwd}/dist`

for (const browser of browsers) {
    const dist_dir = `${dist}/${browser}`
    const dist_zip = `${dist}/${browser}.zip`

    process.env['BROWSER'] = browser
    await vite.build()

    if (fs.existsSync(dist_zip)) fs.rmSync(dist_zip)
    child_process.exec(`cd ${dist_dir} && zip -r ${dist_zip} .`)
}
