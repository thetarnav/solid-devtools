import defineConfig from '../../configs/tsup.config'
import { vanillaExtractPlugin } from '@vanilla-extract/esbuild-plugin'
import postcss from 'postcss'
import autoprefixer from 'autoprefixer'

async function processCss(css: string) {
  return await postcss([autoprefixer]).process(css, {
    from: undefined /* suppress source map warning */,
  }).css
}

export default defineConfig({
  extension: 'tsx',
  additionalPlugins: [vanillaExtractPlugin({ processCss })],
})
