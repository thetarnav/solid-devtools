import * as path       from 'node:path'
import * as url        from 'node:url'
import * as fsp        from 'node:fs/promises'
import * as esb        from 'esbuild'
import * as esb_solid  from 'esbuild-plugin-solid'
import * as unocss     from '@unocss/core'

import      uno_config from '../../uno.config.ts'
import * as build      from '../../build.ts'


const filename = url.fileURLToPath(import.meta.url)
const dirname  = path.dirname(filename)

const src_dirname  = path.join(dirname, `src`)
const dist_dirname = path.join(dirname, `dist`)

const entry_index_filename = path.join(src_dirname, `index.tsx`)

const css_out_filename = path.join(dist_dirname, `styles.css`)

const pkg_filename = path.join(dirname, 'package.json')

function unocss_plugin(output_file: string): esb.Plugin {
    return {
        name: 'unocss',
        setup(build) {

            let filenames_set = new Set<string>()

            build.onStart(() => {
                filenames_set.clear()
            })

            build.onLoad({filter: /\.tsx$/}, args => {
                filenames_set.add(args.path)
                return null
            })

            // Generate CSS from all processed files
            build.onEnd(async () => {

                let uno = await unocss.createGenerator(uno_config)

                let filenames = Array.from(filenames_set)
                let files = await Promise.all(filenames.map(
                    filename => fsp.readFile(filename, 'utf-8')
                ))

                let res = await uno.generate(files.join('\n'))
                
                await fsp.writeFile(output_file, res.css)

                return null
            })
        }
    }
}

async function main() {

    const external = build.get_external_deps_from_pkg(pkg_filename)
    const is_dev   = build.get_is_dev_from_args()
    const common   = build.get_common_esbuild_options(is_dev, dist_dirname)

    const esb_options: esb.BuildOptions[] = [{
        ...common,
        entryPoints: {
            index: entry_index_filename,
        },
        plugins:     [
            unocss_plugin(css_out_filename),
            esb_solid.solidPlugin(),
        ],
        external:    external,

    }]

    const ts_entries = [
        entry_index_filename,
    ]

    await build.build(esb_options, ts_entries, is_dev)
}


main()
