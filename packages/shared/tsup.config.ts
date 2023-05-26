import { defineConfig } from 'tsup'
import pkq from './package.json'

const entryPaths = Object.keys(pkq.exports).map(path =>
  path === '.' ? 'src/index.ts' : `src/${path.substring(2)}.ts`,
)

export default defineConfig(config => ({
  clean: config.watch ? false : true,
  target: 'esnext',
  platform: 'browser',
  dts: { entry: entryPaths },
  format: ['cjs', 'esm'],
  entryPoints: entryPaths,
}))
