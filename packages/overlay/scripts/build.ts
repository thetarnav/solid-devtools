import fs from 'fs'
import { readFile } from 'fs/promises'
import path from 'path'
import esbuild from 'esbuild'
import { solidPlugin } from 'esbuild-plugin-solid'
import CleanCSS from 'clean-css'
import { Worker } from 'worker_threads'
import { peerDependencies, dependencies } from '../package.json'
import { emitDts, getTscOptions } from './dts'
import { __dirname } from './utils'

const isDev = process.argv.includes('--watch')

const externals = Object.keys(
  (() => {
    const deps = { ...peerDependencies, ...dependencies }
    // @solid-devtools/frontend will be handled specially by the build plugin
    delete deps['@solid-devtools/frontend']
    return deps
  })(),
)

const entryFile = path.resolve(process.cwd(), `src/index.tsx`)

// clear dist before build
if (!isDev) {
  fs.rmSync(path.resolve(process.cwd(), `dist`), { recursive: true, force: true })
}

esbuild.build({
  entryPoints: [entryFile],
  outfile: 'dist/index.js',
  target: 'esnext',
  format: 'esm',
  bundle: true,
  loader: { '.css': 'text' },
  plugins: [
    {
      name: 'custom',
      setup(build) {
        // keep the js files from frontend package as external, but inline the .css
        build.onResolve({ filter: /^@solid-devtools\/frontend/ }, data => {
          return data.path.endsWith('.css') ? undefined : { external: true }
        })

        // minify css during build
        if (!isDev) {
          build.onLoad({ filter: /\.css$/ }, async args => {
            let time = Date.now()
            let text = await readFile(args.path, 'utf-8')
            text = new CleanCSS().minify(text).styles
            console.log('CSS minify', Math.ceil(Date.now() - time))
            return { loader: 'text', contents: text }
          })
        }

        // generate type declarations
        if (isDev) {
          const worker = new Worker(path.resolve(__dirname, `./dts_worker.ts`))

          build.onStart(() => {
            worker.postMessage('change')
          })
        } else {
          build.onEnd(() => {
            emitDts(entryFile, getTscOptions())
          })
        }

        let generalTime: number
        build.onStart(() => {
          generalTime = Date.now()
        })
        build.onEnd(() => {
          console.log(`Build complete in ${Math.round(Date.now() - generalTime)}ms`)
        })
      },
    },
    solidPlugin(),
  ],
  watch: isDev,
  color: true,
  external: externals,
})
