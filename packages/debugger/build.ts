import * as path      from 'node:path'
import * as url       from 'node:url'
import * as esb       from 'esbuild'
import * as esb_solid from 'esbuild-plugin-solid'

import * as build     from '../../build.ts'


const filename = url.fileURLToPath(import.meta.url)
const dirname  = path.dirname(filename)

const src_dirname  = path.join(dirname, `src`)
const dist_dirname = path.join(dirname, `dist`)

const entry_index_filename = path.join(src_dirname, `index.ts`)
const entry_setup_filename = path.join(src_dirname, `setup.ts`)
const entry_types_filename = path.join(src_dirname, `types.ts`)

const pkg_filename = path.join(dirname, 'package.json')


async function main() {

    const external = build.get_external_deps_from_pkg(pkg_filename)
    const is_dev   = build.get_is_dev_from_args()
    const common   = build.get_common_esbuild_options(is_dev, dist_dirname)

    const esb_options: esb.BuildOptions[] = [{
        /* Normal */
        ...common,
        entryPoints: {
            index: entry_index_filename,
            types: entry_types_filename,
        },
        plugins:     [esb_solid.solidPlugin()],
        external:    external,
    }, {
        /* Bundled */
        ...common,
        entryPoints: {
            bundled: entry_index_filename,
        },
        plugins:     [esb_solid.solidPlugin()],
    }, {
        /* Setup */
        ...common,
        entryPoints: {
            setup: entry_setup_filename,
        },
        external:    external,
    }]

    await build.build(esb_options,
                      is_dev,
                      dirname,
                      dist_dirname)
}


main()
