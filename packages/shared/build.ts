import * as path      from 'node:path'
import * as url       from 'node:url'
import * as fs        from 'node:fs'
import * as esb       from 'esbuild'

import * as build     from '../../build.ts'


const filename = url.fileURLToPath(import.meta.url)
const dirname  = path.dirname(filename)

const src_dirname  = path.join(dirname, `src`)
const dist_dirname = path.join(dirname, `dist`)

// Use all files in /src as entry points
const entries = fs.readdirSync(src_dirname).map(name => path.join(src_dirname, name))

const pkg_filename = path.join(dirname, 'package.json')


async function main() {

    const external = build.get_external_deps_from_pkg(pkg_filename)
    const is_dev   = build.get_is_dev_from_args()
    const common   = build.get_common_esbuild_options(is_dev, dist_dirname)

    const esb_options: esb.BuildOptions[] = [{
        ...common,
        entryPoints: entries,
        external:    external,
    }]

    const ts_entries = entries

    await build.build(esb_options, ts_entries, is_dev)
}


main()
