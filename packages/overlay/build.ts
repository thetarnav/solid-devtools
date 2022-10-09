import { readFileSync } from 'fs'
import { readFile } from 'fs/promises'
import path from 'path'
import esbuild from 'esbuild'
import { solidPlugin } from 'esbuild-plugin-solid'
import ts from 'typescript'
import { peerDependencies, dependencies } from './package.json'
import CleanCSS from 'clean-css'

const dirname = process.cwd()
const isDev = process.argv.includes('--watch')

const r = (str: TemplateStringsArray) => path.resolve(dirname, str.join(''))

const externals = (() => {
  const frontendPkg: { dependencies?: Record<string, string> } = JSON.parse(
    readFileSync(r`./node_modules/@solid-devtools/frontend/package.json`, 'utf-8'),
  )

  const allDeps: Record<string, string> = {
    ...peerDependencies,
    ...dependencies,
    ...frontendPkg.dependencies,
  }
  delete allDeps['@solid-devtools/frontend']
  return Object.keys(allDeps)
})()

const entryFile = r`src/index.tsx`

function getTscOptions(): ts.CompilerOptions {
  const configFile = ts.findConfigFile(dirname, ts.sys.fileExists, 'tsconfig.json')
  if (!configFile) throw Error('tsconfig.json not found')
  const { config } = ts.readConfigFile(configFile, ts.sys.readFile)
  const { options } = ts.parseJsonConfigFileContent(config, ts.sys, dirname)

  return {
    ...options,
    declarationDir: 'dist',
    emitDeclarationOnly: true,
    noEmit: false,
    declaration: true,
    rootDir: 'src',
    // packages from paths are being inlined to the output
    paths: {},
  }
}

function minifyCss(): esbuild.Plugin {
  return {
    name: 'minify-css',
    setup(build) {
      if (isDev) return

      const cleanCss = new CleanCSS()

      build.onLoad({ filter: /\.css$/ }, async args => {
        const text = await readFile(args.path, 'utf-8')
        return { loader: 'default', contents: cleanCss.minify(text).styles }
      })
    },
  }
}

function dts(): esbuild.Plugin {
  return {
    name: 'dts',
    setup({ onEnd }) {
      const options = getTscOptions()

      onEnd(() => {
        ts.createProgram([entryFile], options).emit()
      })
    },
  }
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
