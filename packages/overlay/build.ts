import * as path      from 'node:path'
import * as url       from 'node:url'
import * as fsp       from 'node:fs/promises'
import * as esb       from 'esbuild'
import * as esb_solid from 'esbuild-plugin-solid'

import * as build     from '../../build.ts'


const filename = url.fileURLToPath(import.meta.url)
const dirname  = path.dirname(filename)

const src_dirname  = path.join(dirname, `src`)
const dist_dirname = path.join(dirname, `dist`)

const entry_index_filename      = path.join(src_dirname, `index.tsx`)
const entry_index_noop_filename = path.join(src_dirname, `index_noop.ts`)

function clean_css_plugin(is_dev: boolean): esb.Plugin {
    return {
        name: 'custom',
        setup(build) {
            if (is_dev) return
            
            // minify css during build
            build.onLoad({filter: /\.css$/}, async args => {
                const file = await fsp.readFile(args.path)
                const css  = await esb.transform(file, {loader: "css", minify: true})
                return {loader: "text", contents: css.code}
            })
        },
    }
}


async function main() {

    const is_dev   = build.get_is_dev_from_args()
    const common   = build.get_common_esbuild_options(is_dev, dist_dirname)

    const external = [
        // need true solid-js references
        '@solid-devtools/debugger/setup',
        // already bundled
        '@solid-devtools/debugger/bundled',
        // pure
        '@solid-devtools/shared/utils',
        '@nothing-but/utils',
    ]

    const esb_options: esb.BuildOptions[] = [{
        ...common,
        entryPoints: [
            entry_index_filename,
            entry_index_noop_filename,
        ],
        external:    external,
        loader:      {'.css': 'text'},
        plugins:     [
            clean_css_plugin(is_dev),
            esb_solid.solidPlugin(),
        ],
    }]

    const ts_entries = [
        entry_index_filename,
    ]

    await build.build(esb_options, ts_entries, is_dev)
}


main()
