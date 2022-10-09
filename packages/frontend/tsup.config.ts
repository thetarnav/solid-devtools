import defineConfig from '../../configs/tsup.config'
import { vanillaExtractPlugin } from '@vanilla-extract/esbuild-plugin'
import { dependencies, peerDependencies } from './package.json'

const externals = [...Object.keys(dependencies), ...Object.keys(peerDependencies)]

export default defineConfig({
  extension: 'tsx',
  additionalPlugins: [vanillaExtractPlugin()],
})
