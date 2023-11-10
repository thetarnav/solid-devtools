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
Clear dist folder
*/
const dist = `${cwd}/dist`
if (fs.existsSync(dist)) fs.rmSync(dist, { recursive: true })

/*
Build and zip
*/
const package_dist = `${cwd}/package`
if (!fs.existsSync(package_dist)) fs.mkdirSync(package_dist)

for (const browser of browsers) {
    process.env['BROWSER'] = browser
    await vite.build()

    child_process.exec(`cd ./dist && zip -r ../package/${browser}.zip .`)
}
