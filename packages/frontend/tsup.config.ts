import { vanillaExtractPlugin } from '@vanilla-extract/esbuild-plugin'
import autoprefixer from 'autoprefixer'
import postcss from 'postcss'
import defineConfig from '../../configs/tsup.config'

async function processCss(css: string) {
    return postcss([autoprefixer]).process(css, {
        from: undefined /* suppress source map warning */,
    }).css
}

export default defineConfig({
    extension: 'tsx',
    additionalPlugins: [vanillaExtractPlugin({ processCss }) as any],
})
