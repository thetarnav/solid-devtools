import chokidar from 'chokidar'
import CleanCSS from 'clean-css'
import esbuild from 'esbuild'
import { solidPlugin } from 'esbuild-plugin-solid'
import fs from 'fs'
import { readFile } from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'
import { Worker } from 'worker_threads'
import { dependencies, peerDependencies } from '../package.json'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const cwd = process.cwd()
const isDev = process.argv.includes('--watch')

const externals = Object.keys(
  (() => {
    const deps: Record<string, string> = { ...peerDependencies, ...dependencies }
    // @solid-devtools/frontend will be handled specially by the build plugin
    delete deps['@solid-devtools/frontend']
    return deps
  })(),
)

const entryFile = path.resolve(cwd, `src/index.tsx`)

function customPlugin(output: string): esbuild.Plugin {
  return {
    name: 'custom',
    setup(build) {
      // keep the js files from frontend package as external, but inline the .css
      build.onResolve({ filter: /^@solid-devtools\/frontend/ }, data => {
        return data.path.endsWith('.css') ? undefined : { external: true }
      })

      // minify css during build
      if (!isDev) {
        build.onLoad({ filter: /\.css$/ }, async args => {
          const finename = path.basename(args.path)
          let time = Date.now()
          let text = await readFile(args.path, 'utf-8')
          text = new CleanCSS().minify(text).styles
          console.log(
            `${output}.js CSS minify for ${finename} in ${Math.ceil(Date.now() - time)}ms`,
          )
          return { loader: 'text', contents: text }
        })
      }

      let generalTime: number
      build.onStart(() => {
        generalTime = Date.now()
      })
      build.onEnd(() => {
        console.log(`${output}.js build complete in ${Math.round(Date.now() - generalTime)}ms`)
      })
    },
  }
}

// clear dist before build
if (!isDev) {
  fs.rmSync(path.resolve(cwd, `dist`), { recursive: true, force: true })
}

// generate type declarations
{
  const worker = new Worker(path.resolve(__dirname, `./dts_worker.ts`), {
    argv: isDev ? ['--watch'] : [],
  })

  if (isDev) {
    chokidar.watch(path.resolve(cwd, `src`)).on('change', () => {
      worker.postMessage('change')
    })
    worker.postMessage('change')
  }
}

// build entry modules

const commonOptions: esbuild.BuildOptions = {
  target: 'esnext',
  format: 'esm',
  bundle: true,
  loader: { '.css': 'text' },
  minify: !isDev,
  color: true,
  external: externals,
  treeShaking: true,
}

// dev.js
esbuild
  .context({
    ...commonOptions,
    entryPoints: [entryFile],
    outfile: `dist/dev.js`,
    plugins: [customPlugin('dev'), solidPlugin()],
  })
  .then(async ctx => {
    isDev ? ctx.watch() : ctx.rebuild().then(() => ctx.dispose())
  })

// prod.js
esbuild
  .context({
    ...commonOptions,
    entryPoints: [path.relative(cwd, 'src/prod.ts')],
    outfile: `dist/prod.js`,
    plugins: [customPlugin('prod')],
  })
  .then(async ctx => {
    isDev ? ctx.watch() : ctx.rebuild().then(() => ctx.dispose())
  })
