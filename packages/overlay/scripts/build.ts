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

const externals = (() => {
  const frontendPkg: { dependencies?: Record<string, string> } = JSON.parse(
    fs.readFileSync(
      path.resolve(process.cwd(), `./node_modules/@solid-devtools/frontend/package.json`),
      'utf-8',
    ),
  )

  const allDeps: Record<string, string> = {
    ...peerDependencies,
    ...dependencies,
    ...frontendPkg.dependencies,
  }
  delete allDeps['@solid-devtools/frontend']
  return Object.keys(allDeps)
})()

const entryFile = path.resolve(process.cwd(), `src/index.tsx`)

function minifyCss(): esbuild.Plugin {
  return {
    name: 'minify-css',
    setup(build) {
      if (isDev) return

      const cleanCss = new CleanCSS()

      build.onLoad({ filter: /\.css$/ }, async args => {
        let time = Date.now()
        let text = await readFile(args.path, 'utf-8')
        text = cleanCss.minify(text).styles
        console.log('CSS minify complete', Math.ceil(Date.now() - time))
        return { loader: 'text', contents: text }
      })
    },
  }
}

function dts(): esbuild.Plugin {
  return {
    name: 'dts',
    setup({ onEnd, onStart }) {
      if (isDev) {
        const worker = new Worker(path.resolve(__dirname, `./dts_worker.ts`))

        onStart(() => {
          worker.postMessage('change')
        })
      } else {
        onEnd(() => {
          const options = getTscOptions()
          emitDts(entryFile, options)
        })
      }
    },
  }
}

// build
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
  plugins: [minifyCss(), solidPlugin(), dts()],
  watch: isDev,
  external: externals,
})
